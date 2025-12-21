import prisma from "~/lib/prisma";
import { serverSupabaseUser } from "#supabase/server";

// Get participants for an event
export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, "id");

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  }

  try {
    // Check for impersonation first
    const impersonatedUserId = event.context.impersonatedUserId;

    // Check if the current user is an admin
    let isAdmin = false;

    if (impersonatedUserId) {
      // If impersonating, check if the IMPERSONATED user is an admin
      const impersonatedAdminUser = await prisma.adminUser.findUnique({
        where: { id: impersonatedUserId },
      });
      isAdmin = !!impersonatedAdminUser;
    } else {
      // Otherwise check the actual authenticated user
      try {
        const user = await serverSupabaseUser(event);
        if (user) {
          const adminUser = await prisma.adminUser.findUnique({
            where: { id: user.id },
          });
          isAdmin = !!adminUser;
        }
      } catch (err) {
        // If user is not authenticated, just continue as non-admin
        isAdmin = false;
      }
    }

    // Check if it's a custom event or external event override
    const customEvent = await prisma.customEvent.findUnique({
      where: { id: eventId },
      select: { id: true, name: true },
    });

    const externalEventOverride = await prisma.externalEventOverride.findUnique(
      {
        where: { id: eventId },
        select: { id: true, overrides: true },
      }
    );

    if (!customEvent && !externalEventOverride) {
      throw createError({
        statusCode: 404,
        statusMessage: "Event not found",
      });
    }

    const isExternalEvent = Boolean(externalEventOverride);

    // Get event name
    let eventName = "";
    if (customEvent) {
      eventName = customEvent.name;
    } else if (externalEventOverride) {
      const overrides = externalEventOverride.overrides as any;
      eventName = overrides?.title || "External Event";
    }

    // Fetch active tickets (registered and attended, excluding cancelled)
    const activeTickets = await prisma.registrationTicket.findMany({
      where: {
        registration: isExternalEvent
          ? { externalEventId: eventId }
          : { customEventId: eventId },
        status: {
          not: "cancelled",
        },
      },
      select: {
        id: true,
        participantName: true,
        status: true,
        isAnonymous: true,
        decklist: true,
        bringingDecklistOnsite: true,
        createdAt: true,
        registration: {
          select: {
            registeredAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Fetch cancelled tickets separately
    const cancelledTickets = await prisma.registrationTicket.findMany({
      where: {
        registration: isExternalEvent
          ? { externalEventId: eventId }
          : { customEventId: eventId },
        status: "cancelled",
      },
      select: {
        id: true,
        participantName: true,
        status: true,
        isAnonymous: true,
        decklist: true,
        bringingDecklistOnsite: true,
        createdAt: true,
        registration: {
          select: {
            registeredAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Separate anonymous and non-anonymous participants
    const namedParticipants = activeTickets.filter((p) => !p.isAnonymous);
    const anonymousParticipants = activeTickets.filter((p) => p.isAnonymous);

    // Build participants list
    const participantsList = namedParticipants.map((p) => ({
      id: p.id,
      status: p.status,
      registeredAt: p.registration.registeredAt,
      playerName: p.participantName,
      hasDecklistSubmitted: Boolean(p.decklist),
      isBringingDecklistOnsite: Boolean(p.bringingDecklistOnsite),
      isAnonymous: false,
    }));

    // If admin, show anonymous participants individually with full names
    if (isAdmin && anonymousParticipants.length > 0) {
      participantsList.push(
        ...anonymousParticipants.map((p) => ({
          id: p.id,
          status: p.status,
          registeredAt: p.registration.registeredAt,
          playerName: p.participantName + " (Anonymous)",
          hasDecklistSubmitted: Boolean(p.decklist),
          isBringingDecklistOnsite: Boolean(p.bringingDecklistOnsite),
          isAnonymous: true,
        }))
      );
    }
    // If not admin, show anonymous participants as a single aggregate entry
    else if (anonymousParticipants.length > 0) {
      participantsList.push({
        id: "anonymous-group",
        status: "registered" as const,
        registeredAt: new Date().toISOString(),
        playerName: `+${anonymousParticipants.length} Anonymous`,
        hasDecklistSubmitted: false,
        isBringingDecklistOnsite: false,
        isAnonymous: true,
      });
    }

    return {
      event: {
        id: eventId,
        name: eventName,
        isExternalEvent,
      },
      participants: participantsList,
      cancelledParticipants: cancelledTickets.map((p) => ({
        id: p.id,
        status: p.status,
        registeredAt: p.registration.registeredAt,
        playerName: p.isAnonymous ? "Anonymous Participant" : p.participantName,
        hasDecklistSubmitted: Boolean(p.decklist),
        isBringingDecklistOnsite: Boolean(p.bringingDecklistOnsite),
        isAnonymous: p.isAnonymous,
      })),
    };
  } catch (error: unknown) {
    console.error("Error fetching event participants:", error);

    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch event participants",
    });
  }
});
