import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";

const prisma = new PrismaClient();

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

    // Find the booking (registration) and verify ownership
    const booking = await prisma.eventRegistration.findFirst({
      where: {
        id: bookingId,
        player: {
          email: supabaseUser.email?.toLowerCase(),
        },
      },
      include: {
        player: {
          select: {
            id: true,
            playerId: true,
            name: true,
            email: true,
          },
        },
        tickets: {
          orderBy: {
            id: "asc",
          },
        },
        customEvent: {
          select: {
            id: true,
            name: true,
            venue: true,
            tagType: true,
            tags: true,
            eventDate: true,
            registrationDeadline: true,
            maxParticipants: true,
            participationFee: true,
            requiresDecklist: true,
            status: true,
          },
        },
        externalEvent: {
          select: {
            id: true,
            eventName: true,
            eventLocation: true,
            eventDate: true,
            registrationDeadline: true,
            maxParticipants: true,
            participationFee: true,
            requiresDecklist: true,
            overrides: true,
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

    // Get event details
    const eventDetails = booking.customEvent || booking.externalEvent;
    if (!eventDetails) {
      throw createError({
        statusCode: 400,
        statusMessage: "Event not found for this booking",
      });
    }

    // Count active tickets
    const activeTickets = booking.tickets.filter(
      (t) => t.status !== "cancelled"
    );
    const cancelledTickets = booking.tickets.filter(
      (t) => t.status === "cancelled"
    );

    // Determine if event allows modifications
    const eventDate = new Date(eventDetails.eventDate);
    const now = new Date();
    const cancellationDeadline = new Date(
      eventDate.getTime() - 24 * 60 * 60 * 1000
    );
    const canModify = now < cancellationDeadline && eventDate > now;

    // Determine event name and venue
    const eventName =
      booking.customEvent?.name ||
      booking.externalEvent?.eventName ||
      "Unknown Event";
    const eventVenue =
      booking.customEvent?.venue ||
      booking.externalEvent?.eventLocation ||
      "Unknown Venue";

    return {
      success: true,
      booking: {
        id: booking.id,
        registeredAt: booking.registeredAt,
        booker: {
          id: booking.player.id,
          playerId: booking.player.playerId,
          name: booking.player.name,
          email: booking.player.email,
        },
        event: {
          id: eventDetails.id,
          name: eventName,
          venue: eventVenue,
          tagType: booking.customEvent?.tagType || null,
          tags: booking.customEvent?.tags || null,
          eventDate: eventDetails.eventDate,
          registrationDeadline: eventDetails.registrationDeadline,
          maxParticipants: eventDetails.maxParticipants,
          participationFee: eventDetails.participationFee,
          requiresDecklist: eventDetails.requiresDecklist,
          isExternal: !!booking.externalEventId,
        },
        tickets: booking.tickets.map((ticket) => ({
          id: ticket.id,
          participantName: ticket.participantName,
          participantPlayerId: ticket.participantPlayerId,
          status: ticket.status,
          isAnonymous: ticket.isAnonymous,
          decklist: ticket.decklist,
          bringingDecklistOnsite: ticket.bringingDecklistOnsite,
          placement: ticket.placement,
          points: ticket.points,
        })),
        statistics: {
          totalTickets: booking.tickets.length,
          activeTickets: activeTickets.length,
          cancelledTickets: cancelledTickets.length,
        },
        permissions: {
          canModify,
          canAddTickets: canModify,
          canCancelTickets: canModify,
        },
      },
    };
  } catch (error: unknown) {
    console.error("Booking details error:", error);

    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch booking details",
    });
  }
});
