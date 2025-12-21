import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";
import { z } from "zod";

const prisma = new PrismaClient();

const updateTicketSchema = z.object({
  participantName: z.string().min(1).max(100).optional(),
  participantPlayerId: z.string().max(50).optional().nullable(),
  isAnonymous: z.boolean().optional(),
  decklist: z.string().optional().nullable(),
  bringingDecklistOnsite: z.boolean().optional(),
});

export default defineEventHandler(async (h3Event) => {
  const bookingId = getRouterParam(h3Event, "id");
  const ticketId = getRouterParam(h3Event, "ticketId");

  if (!bookingId || !ticketId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Booking ID and Ticket ID are required",
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
    const validation = updateTicketSchema.safeParse(body);

    if (!validation.success) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid ticket data",
        data: {
          message: validation.error.errors.map((e) => e.message).join(", "),
        },
      });
    }

    const updates = validation.data;

    // Verify booking ownership and ticket belongs to booking
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
            id: ticketId,
          },
        },
        customEvent: {
          select: {
            eventDate: true,
          },
        },
        externalEvent: {
          select: {
            eventDate: true,
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

    if (booking.tickets.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: "Ticket not found in this booking",
      });
    }

    const ticket = booking.tickets[0];

    if (ticket.status === "cancelled") {
      throw createError({
        statusCode: 400,
        statusMessage: "Cannot update cancelled ticket",
      });
    }

    // Check if modifications are allowed (24h before event)
    const eventDetails = booking.customEvent || booking.externalEvent;
    if (eventDetails) {
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
          statusMessage: "Cannot modify ticket for past event",
        });
      }
    }

    // Update ticket
    const updatedTicket = await prisma.registrationTicket.update({
      where: {
        id: ticketId,
      },
      data: updates,
    });

    return {
      success: true,
      message: "Ticket updated successfully",
      ticket: {
        id: updatedTicket.id,
        participantName: updatedTicket.participantName,
        participantPlayerId: updatedTicket.participantPlayerId,
        status: updatedTicket.status,
        isAnonymous: updatedTicket.isAnonymous,
        decklist: updatedTicket.decklist,
        bringingDecklistOnsite: updatedTicket.bringingDecklistOnsite,
      },
    };
  } catch (error: unknown) {
    console.error("Ticket update error:", error);

    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update ticket",
    });
  }
});
