import prisma from "~/lib/prisma";
import { getBookingPermissions } from "~/utils/bookingPermissions";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";

const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, "id");

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  }

  const player = await resolveAuthenticatedPlayer(event, { allowMissing: true });
  if (!player) {
    return { hasRegistration: false };
  }

  const registration = await prisma.eventRegistration.findFirst({
    where: {
      playerId: player.id,
      OR: [{ customEventId: eventId }, { externalEventId: eventId }],
    },
    include: {
      tickets: {
        where: {
          status: {
            not: "cancelled",
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      customEvent: {
        select: {
          id: true,
          eventDate: true,
          maxParticipants: true,
        },
      },
      externalEvent: {
        select: {
          id: true,
          eventDate: true,
          maxParticipants: true,
        },
      },
    },
  });

  if (!registration || registration.tickets.length === 0) {
    return { hasRegistration: false };
  }

  const eventDetails = registration.customEvent || registration.externalEvent;
  if (!eventDetails) {
    return { hasRegistration: false };
  }

  const isExternalEvent = !!registration.externalEventId;
  const currentTicketCount = await prisma.registrationTicket.count({
    where: isExternalEvent
      ? {
          registration: {
            externalEventId: eventId,
          },
          status: {
            not: "cancelled",
          },
        }
      : {
          registration: {
            customEventId: eventId,
          },
          status: {
            not: "cancelled",
          },
        },
  });

  const waitlistDelegate = (prisma as any).waitlistEntry;
  const now = new Date();
  const activeClaimCount = waitlistDelegate
    ? await waitlistDelegate.count({
        where: isExternalEvent
          ? {
              externalEventId: eventId,
              status: "pending_claim",
              OR: [{ claimExpiresAt: null }, { claimExpiresAt: { gt: now } }],
            }
          : {
              customEventId: eventId,
              status: "pending_claim",
              OR: [{ claimExpiresAt: null }, { claimExpiresAt: { gt: now } }],
            },
      })
    : 0;

  const maxParticipants = eventDetails.maxParticipants || 0;
  const remainingSpots = maxParticipants
    ? Math.max(0, maxParticipants - currentTicketCount - activeClaimCount)
    : Number.MAX_SAFE_INTEGER;
  const permissions = getBookingPermissions(eventDetails.eventDate);

  return {
    hasRegistration: true,
    registration: {
      bookingId: registration.id,
      activeTicketCount: registration.tickets.length,
      ticketNames: registration.tickets.map((ticket) => ticket.participantName),
      canAddTickets: permissions.canAddTickets && remainingSpots > 0,
      remainingSpots,
      maxParticipants,
    },
  };
});
