import { z } from "zod";
import prisma from "~/lib/prisma";
import {
  logError,
  logValidationError,
  logDatabaseError,
} from "~/server/util/errorLogger";
import {
  resolveAuthenticatedPlayerFactory,
  type AuthenticatedPlayer,
} from "~/server/util/authenticatedPlayer";

const ticketSchema = z.object({
  name: z.string().min(1, "Participant name is required").max(100),
  playerId: z
    .string()
    .regex(/^\d+$/, "Player ID must contain only numbers")
    .optional(),
  isAnonymous: z.boolean().optional().default(false),
});

const registrationSchema = z.object({
  bookerPlayerId: z
    .string()
    .min(1, "Your Player ID is required")
    .max(50)
    .regex(/^\d+$/, "Player ID must contain only numbers"),
  bookerName: z.string().min(1, "Your name is required").max(100),
  bookerEmail: z.string().email("Valid email is required").max(100),
  tickets: z.array(ticketSchema).min(1, "At least one participant required"),
  allAnonymous: z.boolean().optional().default(false), // Apply to all tickets
});

const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

type RegistrationPrismaClient = Pick<
  typeof prisma,
  | "customEvent"
  | "externalEventOverride"
  | "registrationTicket"
  | "eventRegistration"
  | "errorLog"
  | "$transaction"
  | "$queryRaw"
>;

type RegistrationHandlerDependencies = {
  prismaClient?: RegistrationPrismaClient;
  resolvePlayer?: (event: any) => Promise<AuthenticatedPlayer>;
};

export const createRegistrationHandler =
  ({
    prismaClient = prisma,
    resolvePlayer = resolveAuthenticatedPlayer,
  }: RegistrationHandlerDependencies = {}) =>
  async (event: any) => {
    if (getMethod(event) !== "POST") {
      throw createError({
        statusCode: 405,
        statusMessage: "Method not allowed",
      });
    }

    const eventId = getRouterParam(event, "id");

    if (!eventId) {
      await logError(
        event,
        new Error("Event ID is required"),
        "registration_missing_event_id",
      );
      throw createError({
        statusCode: 400,
        statusMessage: "Event ID is required",
      });
    }

    try {
      const body = await readBody(event);

      // Validate request body
      const validationResult = registrationSchema.safeParse(body);
      if (!validationResult.success) {
        await logValidationError(
          event,
          validationResult.error,
          "event_registration",
        );
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid registration data",
          data: {
            message: validationResult.error.errors
              .map((e) => e.message)
              .join(", "),
          },
        });
      }

      const {
        bookerEmail: submittedBookerEmail,
        tickets,
        allAnonymous,
      } = validationResult.data;

      const authenticatedBooker = await resolvePlayer(event);
      const bookerPlayerId = authenticatedBooker.playerId;
      const bookerName = authenticatedBooker.name;
      const bookerEmail =
        authenticatedBooker.email?.toLowerCase() ||
        submittedBookerEmail.toLowerCase();

      // Check if this is a custom event or an external event override
      let customEvent = await prismaClient.customEvent.findUnique({
        where: { id: eventId },
      });

      let externalEventOverride = null;
      let isExternalEvent = false;

      if (!customEvent) {
        // Try to find external event override with local registration
        externalEventOverride =
          await prismaClient.externalEventOverride.findUnique({
            where: { id: eventId },
          });

        if (
          !externalEventOverride ||
          !externalEventOverride.handleRegistrationLocally
        ) {
          throw createError({
            statusCode: 404,
            statusMessage: "Event not found",
          });
        }

        isExternalEvent = true;
      }

      // Get event details (either custom or external)
      const eventDate = isExternalEvent
        ? new Date(externalEventOverride!.eventDate)
        : new Date(customEvent!.eventDate);
      const maxParticipants = isExternalEvent
        ? externalEventOverride!.maxParticipants || 0
        : customEvent!.maxParticipants;
      const requiresDecklist = isExternalEvent
        ? externalEventOverride!.requiresDecklist
        : customEvent!.requiresDecklist;
      const eventName = isExternalEvent
        ? externalEventOverride!.eventName
        : customEvent!.name;

      // Check if event is in the future
      const now = new Date();
      if (eventDate < now) {
        throw createError({
          statusCode: 400,
          statusMessage: "Cannot register for past events",
          data: { message: "This event has already taken place" },
        });
      }

      // Note: Decklist validation is now handled on the dashboard after registration

      const runAtomic =
        typeof prismaClient.$transaction === "function"
          ? prismaClient.$transaction.bind(prismaClient)
          : async (fn: (tx: RegistrationPrismaClient) => Promise<any>) =>
              fn(prismaClient);

      const { registration, createdTickets } = await runAtomic(
        async (tx: RegistrationPrismaClient) => {
          if (typeof tx.$queryRaw === "function") {
            if (isExternalEvent) {
              await tx.$queryRaw`SELECT id FROM public.external_event_overrides WHERE id = ${eventId} FOR UPDATE`;
            } else {
              await tx.$queryRaw`SELECT id FROM public.custom_events WHERE id = ${eventId} FOR UPDATE`;
            }
          }

          const currentTickets = await tx.registrationTicket.count({
            where: {
              registration: isExternalEvent
                ? { externalEventId: eventId }
                : { customEventId: eventId },
              status: {
                not: "cancelled",
              },
            },
          });

          const requestedTickets = tickets.length;
          if (
            maxParticipants &&
            currentTickets + requestedTickets > maxParticipants
          ) {
            const availableSpots = maxParticipants - currentTickets;
            throw createError({
              statusCode: 400,
              statusMessage: "Not enough spots available",
              data: {
                message: `Only ${availableSpots} spot(s) remaining. You requested ${requestedTickets} ticket(s).`,
              },
            });
          }

          const existingRegistration = isExternalEvent
            ? await tx.eventRegistration.findUnique({
                where: {
                  externalEventId_playerId: {
                    externalEventId: eventId,
                    playerId: authenticatedBooker.id,
                  },
                },
              })
            : await tx.eventRegistration.findUnique({
                where: {
                  customEventId_playerId: {
                    customEventId: eventId,
                    playerId: authenticatedBooker.id,
                  },
                },
              });

          const registration = existingRegistration
            ? existingRegistration
            : await tx.eventRegistration.create({
                data: isExternalEvent
                  ? {
                      externalEventId: eventId,
                      playerId: authenticatedBooker.id,
                    }
                  : {
                      customEventId: eventId,
                      playerId: authenticatedBooker.id,
                    },
              });

          const initialStatus = requiresDecklist ? "reserved" : "registered";
          const createdTickets = await Promise.all(
            tickets.map((ticket) =>
              tx.registrationTicket.create({
                data: {
                  registrationId: registration.id,
                  participantName: ticket.name,
                  participantPlayerId: ticket.playerId || null,
                  status: initialStatus,
                  isAnonymous: allAnonymous || ticket.isAnonymous || false,
                  bringingDecklistOnsite: false,
                },
              }),
            ),
          );

          return { registration, createdTickets };
        },
      );

      // Log successful registration
      await prismaClient.errorLog.create({
        data: {
          errorType: "info_event_registration_success",
          errorMessage: `User registered for event: ${eventName}`,
          userEmail: bookerEmail,
          userId: authenticatedBooker.supabaseId || null,
          url: `/events/${eventId}/register`,
          metadata: {
            eventId,
            eventName,
            bookerPlayerId,
            ticketCount: createdTickets.length,
            registrationId: registration.id,
          },
        },
      });

      return {
        success: true,
        message: "Registration successful",
        registration: {
          id: registration.id,
          bookerName,
          bookerPlayerId,
          bookerEmail,
          eventName: eventName,
          ticketCount: createdTickets.length,
          tickets: createdTickets.map((t) => ({
            id: t.id,
            participantName: t.participantName,
            status: t.status,
          })),
        },
      };
    } catch (error: unknown) {
      console.error("Registration error:", error);

      // Log to database unless it's already a user-facing error (<500)
      if (
        !(
          error &&
          typeof error === "object" &&
          "statusCode" in error &&
          (error as any).statusCode < 500
        )
      ) {
        await logDatabaseError(event, error, "event_registration", { eventId });
      }

      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      throw createError({
        statusCode: 500,
        statusMessage: "Registration failed",
      });
    }
  };

export default defineEventHandler(createRegistrationHandler());
