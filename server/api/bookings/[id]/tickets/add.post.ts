import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  logError,
  logValidationError,
  logDatabaseError,
  logAuthError,
} from "~/server/util/errorLogger";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";

const prisma = new PrismaClient();
const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

const newTicketSchema = z.object({
  participantName: z.string().min(1).max(100),
  participantPlayerId: z
    .string()
    .max(50)
    .regex(/^\d+$/, "Player ID must contain only numbers")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val)),
  isAnonymous: z.boolean().optional().default(false),
});

export default defineEventHandler(async (h3Event) => {
  const bookingId = getRouterParam(h3Event, "id");

  if (!bookingId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Booking ID is required",
    });
  }

  try {
    const authenticatedPlayer = await resolveAuthenticatedPlayer(h3Event, {
      allowMissing: true,
    });

    if (!authenticatedPlayer) {
      throw createError({
        statusCode: 404,
        statusMessage: "Booking not found or access denied",
      });
    }

    // Parse request body
    const body = await readBody(h3Event);
    const validation = newTicketSchema.safeParse(body);

    if (!validation.success) {
      await logValidationError(h3Event, validation.error, "ticket_add");
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid ticket data",
        data: {
          message: validation.error.errors.map((e) => e.message).join(", "),
        },
      });
    }

    const ticketData = validation.data;

    // Verify booking ownership
    const booking = await prisma.eventRegistration.findFirst({
      where: {
        id: bookingId,
        playerId: authenticatedPlayer.id,
      },
      include: {
        tickets: {
          where: {
            status: {
              not: "cancelled",
            },
          },
        },
        customEvent: {
          select: {
            id: true,
            eventDate: true,
            maxParticipants: true,
            requiresDecklist: true,
          },
        },
        externalEvent: {
          select: {
            id: true,
            eventDate: true,
            maxParticipants: true,
            requiresDecklist: true,
          },
        },
      },
    });

    if (!booking) {
      throw createError({
        statusCode: 404,
        statusMessage: "Booking not found or access denied",
      });
    }

    const eventDetails = booking.customEvent || booking.externalEvent;
    if (!eventDetails) {
      throw createError({
        statusCode: 400,
        statusMessage: "Event not found for this booking",
      });
    }

    // Check if modifications are allowed (2h before event)
    const eventDate = new Date(eventDetails.eventDate);
    const now = new Date();
    const cancellationDeadline = new Date(
      eventDate.getTime() - 2 * 60 * 60 * 1000,
    );

    if (now > cancellationDeadline) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Modification deadline has passed (2 hours before event)",
      });
    }

    if (eventDate < now) {
      throw createError({
        statusCode: 400,
        statusMessage: "Cannot add tickets for past event",
      });
    }

    // Capacity check + ticket creation must be atomic to prevent oversubscription.
    const isExternalEvent = !!booking.externalEventId;
    const runTransaction =
      typeof (prisma as any).$transaction === "function"
        ? (callback: (tx: any) => Promise<any>) =>
            (prisma as any).$transaction(callback)
        : (callback: (tx: any) => Promise<any>) => callback(prisma);

    const newTicket = await runTransaction(async (tx) => {
      if (typeof tx.$queryRaw === "function") {
        if (isExternalEvent) {
          await tx.$queryRaw`SELECT id FROM public.external_event_overrides WHERE id = ${eventDetails.id} FOR UPDATE`;
        } else {
          await tx.$queryRaw`SELECT id FROM public.custom_events WHERE id = ${eventDetails.id} FOR UPDATE`;
        }
      }

      const currentTicketCount = await tx.registrationTicket.count({
        where: isExternalEvent
          ? {
              registration: {
                externalEventId: eventDetails.id,
              },
              status: {
                not: "cancelled",
              },
            }
          : {
              registration: {
                customEventId: eventDetails.id,
              },
              status: {
                not: "cancelled",
              },
            },
      });

      const maxParticipants = eventDetails.maxParticipants;
      const waitlistDelegate = tx.waitlistEntry;
      const now = new Date();
      const activeClaimCount = waitlistDelegate
        ? await waitlistDelegate.count({
            where: isExternalEvent
              ? {
                  externalEventId: eventDetails.id,
                  status: "pending_claim",
                  OR: [{ claimExpiresAt: null }, { claimExpiresAt: { gt: now } }],
                }
              : {
                  customEventId: eventDetails.id,
                  status: "pending_claim",
                  OR: [{ claimExpiresAt: null }, { claimExpiresAt: { gt: now } }],
                },
          })
        : 0;

      const effectiveOccupiedSpots = currentTicketCount + activeClaimCount;
      if (maxParticipants && effectiveOccupiedSpots >= maxParticipants) {
        const availableSpots = Math.max(
          0,
          maxParticipants - effectiveOccupiedSpots,
        );
        throw createError({
          statusCode: 400,
          statusMessage: "Not enough spots available",
          data: {
            message:
              activeClaimCount > 0
                ? `Only ${availableSpots} spot(s) remaining after reserved waitlist claims (${activeClaimCount}).`
                : "Event is at full capacity",
          },
        });
      }

      const initialStatus = eventDetails.requiresDecklist
        ? "reserved"
        : "registered";

      return tx.registrationTicket.create({
        data: {
          registrationId: bookingId,
          participantName: ticketData.participantName,
          participantPlayerId: ticketData.participantPlayerId || null,
          status: initialStatus,
          isAnonymous: ticketData.isAnonymous || false,
          bringingDecklistOnsite: false,
        },
      });
    });

    return {
      success: true,
      message: "Ticket added successfully",
      ticket: {
        id: newTicket.id,
        participantName: newTicket.participantName,
        participantPlayerId: newTicket.participantPlayerId,
        status: newTicket.status,
        isAnonymous: newTicket.isAnonymous,
      },
    };
  } catch (error: unknown) {
    console.error("Add ticket error:", error);

    if (error && typeof error === "object" && "statusCode" in error) {
      const statusCode = (error as any).statusCode;
      if (statusCode === 401) {
        await logAuthError(h3Event, error as Error, "ticket_add_unauthorized");
      } else if (statusCode >= 500) {
        await logDatabaseError(h3Event, error as Error, "ticket_add", {
          bookingId,
        });
      }
      throw error;
    }

    await logDatabaseError(h3Event, error as Error, "ticket_add", {
      bookingId,
    });
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to add ticket",
    });
  }
});
