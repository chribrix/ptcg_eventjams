import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";
import { z } from "zod";
import {
  logError,
  logValidationError,
  logDatabaseError,
  logAuthError,
} from "~/server/util/errorLogger";

const prisma = new PrismaClient();

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
    const supabaseUser = await serverSupabaseUser(h3Event);

    if (!supabaseUser) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
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
        player: {
          email: supabaseUser.email?.toLowerCase(),
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

    // Check if modifications are allowed (24h before event)
    const eventDate = new Date(eventDetails.eventDate);
    const now = new Date();
    const cancellationDeadline = new Date(
      eventDate.getTime() - 24 * 60 * 60 * 1000
    );

    if (now > cancellationDeadline) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Modification deadline has passed (24 hours before event)",
      });
    }

    if (eventDate < now) {
      throw createError({
        statusCode: 400,
        statusMessage: "Cannot add tickets for past event",
      });
    }

    // Check event capacity
    const isExternalEvent = !!booking.externalEventId;
    const currentTicketCount = await prisma.registrationTicket.count({
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

    if (currentTicketCount >= eventDetails.maxParticipants) {
      throw createError({
        statusCode: 400,
        statusMessage: "Event is at full capacity",
      });
    }

    // Create new ticket
    const initialStatus = eventDetails.requiresDecklist
      ? "reserved"
      : "registered";

    const newTicket = await prisma.registrationTicket.create({
      data: {
        registrationId: bookingId,
        participantName: ticketData.participantName,
        participantPlayerId: ticketData.participantPlayerId || null,
        status: initialStatus,
        isAnonymous: ticketData.isAnonymous || false,
        bringingDecklistOnsite: false,
      },
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
