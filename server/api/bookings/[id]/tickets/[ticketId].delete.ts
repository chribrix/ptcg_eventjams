import { PrismaClient } from "@prisma/client";
import {
  logError,
  logDatabaseError,
  logAuthError,
} from "~/server/util/errorLogger";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";
import { promoteWaitlistForEvent } from "~/server/services/events/waitlistService";

const prisma = new PrismaClient();
const CANCELLATION_DEADLINE_HOURS = 2;
const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

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
    const authenticatedPlayer = await resolveAuthenticatedPlayer(h3Event, {
      allowMissing: true,
    });

    if (!authenticatedPlayer) {
      throw createError({
        statusCode: 404,
        statusMessage: "Booking not found or access denied",
      });
    }

    // Verify booking ownership and ticket belongs to booking
    const booking = await prisma.eventRegistration.findFirst({
      where: {
        id: bookingId,
        playerId: authenticatedPlayer.id,
      },
      include: {
        tickets: true,
        customEvent: {
          select: {
            eventDate: true,
            name: true,
          },
        },
        externalEvent: {
          select: {
            eventDate: true,
            eventName: true,
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

    const ticket = booking.tickets.find((t) => t.id === ticketId);

    if (!ticket) {
      throw createError({
        statusCode: 404,
        statusMessage: "Ticket not found in this booking",
      });
    }

    if (ticket.status === "cancelled") {
      throw createError({
        statusCode: 400,
        statusMessage: "Ticket is already cancelled",
      });
    }

    // Check if there are other active tickets
    const activeTickets = booking.tickets.filter(
      (t) => t.status !== "cancelled"
    );

    if (activeTickets.length === 1) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Cannot cancel the last ticket. Please cancel the entire booking instead.",
      });
    }

    // Get event details
    const eventDetails = booking.customEvent || booking.externalEvent;
    if (!eventDetails) {
      throw createError({
        statusCode: 400,
        statusMessage: "Event not found for this booking",
      });
    }

    // Check cancellation deadline
    const eventDate = new Date(eventDetails.eventDate);
    const now = new Date();

    if (eventDate < now) {
      throw createError({
        statusCode: 400,
        statusMessage: "Cannot cancel ticket for past event",
      });
    }

    const cancellationDeadline = new Date(
      eventDate.getTime() - CANCELLATION_DEADLINE_HOURS * 60 * 60 * 1000
    );

    if (now > cancellationDeadline) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Cancellation deadline has passed (2 hours before event)",
      });
    }

    // Cancel the ticket
    await prisma.registrationTicket.update({
      where: {
        id: ticketId,
      },
      data: {
        status: "cancelled",
      },
    });

    await promoteWaitlistForEvent(
      {
        customEventId: booking.customEventId,
        externalEventId: booking.externalEventId,
      },
      1,
    );

    return {
      success: true,
      message: "Ticket cancelled successfully",
      ticket: {
        id: ticket.id,
        participantName: ticket.participantName,
        cancelledAt: new Date().toISOString(),
      },
      remainingTickets: activeTickets.length - 1,
    };
  } catch (error: unknown) {
    console.error("Ticket cancellation error:", error);

    if (error && typeof error === "object" && "statusCode" in error) {
      const statusCode = (error as any).statusCode;
      if (statusCode === 401) {
        await logAuthError(
          h3Event,
          error as Error,
          "ticket_delete_unauthorized"
        );
      } else if (statusCode >= 500) {
        await logDatabaseError(h3Event, error as Error, "ticket_delete", {
          bookingId,
          ticketId,
        });
      }
      throw error;
    }

    await logDatabaseError(h3Event, error as Error, "ticket_delete", {
      bookingId,
      ticketId,
    });
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to cancel ticket",
    });
  }
});
