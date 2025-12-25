import { z } from "zod";
import prisma from "~/lib/prisma";
import {
  logError,
  logValidationError,
  logDatabaseError,
} from "~/server/util/errorLogger";

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

export default defineEventHandler(async (event) => {
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
      "registration_missing_event_id"
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
        "event_registration"
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

    const { bookerPlayerId, bookerName, bookerEmail, tickets, allAnonymous } =
      validationResult.data;

    // Check if this is a custom event or an external event override
    let customEvent = await prisma.customEvent.findUnique({
      where: { id: eventId },
    });

    let externalEventOverride = null;
    let isExternalEvent = false;

    if (!customEvent) {
      // Try to find external event override with local registration
      externalEventOverride = await prisma.externalEventOverride.findUnique({
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

    // Check current ticket count (excluding cancelled tickets)
    const currentTickets = await prisma.registrationTicket.count({
      where: {
        registration: isExternalEvent
          ? { externalEventId: eventId }
          : { customEventId: eventId },
        status: {
          not: "cancelled",
        },
      },
    });

    // Check if adding these tickets would exceed capacity
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

    // Find or create the booker (person making the registration)
    let booker = await prisma.player.findUnique({
      where: { playerId: bookerPlayerId },
    });

    if (!booker) {
      // Try to find by email as backup
      booker = await prisma.player.findFirst({
        where: { email: bookerEmail.toLowerCase() },
      });
    }

    if (!booker) {
      // Create new player for the booker
      booker = await prisma.player.create({
        data: {
          playerId: bookerPlayerId,
          name: bookerName,
          birthDate: new Date("2000-01-01"), // Temporary birthdate
          email: bookerEmail.toLowerCase(),
        },
      });
    } else {
      // Update booker info
      booker = await prisma.player.update({
        where: { id: booker.id },
        data: {
          name: bookerName,
          email: bookerEmail.toLowerCase(),
        },
      });
    }

    // Check if booker already has a registration for this event
    const existingRegistration = isExternalEvent
      ? await prisma.eventRegistration.findUnique({
          where: {
            externalEventId_playerId: {
              externalEventId: eventId,
              playerId: booker.id,
            },
          },
          include: {
            tickets: {
              where: {
                status: {
                  not: "cancelled",
                },
              },
            },
          },
        })
      : await prisma.eventRegistration.findUnique({
          where: {
            customEventId_playerId: {
              customEventId: eventId,
              playerId: booker.id,
            },
          },
          include: {
            tickets: {
              where: {
                status: {
                  not: "cancelled",
                },
              },
            },
          },
        });

    let registration;
    const initialStatus = requiresDecklist ? "reserved" : "registered";

    if (existingRegistration) {
      // Booker already has a registration - add new tickets to it
      registration = existingRegistration;
    } else {
      // Create new registration
      registration = await prisma.eventRegistration.create({
        data: isExternalEvent
          ? {
              externalEventId: eventId,
              playerId: booker.id,
            }
          : {
              customEventId: eventId,
              playerId: booker.id,
            },
      });
    }

    // Create tickets for all participants
    const createdTickets = await Promise.all(
      tickets.map((ticket) =>
        prisma.registrationTicket.create({
          data: {
            registrationId: registration.id,
            participantName: ticket.name,
            participantPlayerId: ticket.playerId || null,
            status: initialStatus,
            isAnonymous: allAnonymous || ticket.isAnonymous || false,
            bringingDecklistOnsite: false,
          },
        })
      )
    );

    return {
      success: true,
      message: "Registration successful",
      registration: {
        id: registration.id,
        bookerName: bookerName,
        bookerPlayerId: bookerPlayerId,
        bookerEmail: bookerEmail.toLowerCase(),
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
});
