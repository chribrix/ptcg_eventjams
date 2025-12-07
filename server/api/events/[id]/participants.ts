import prisma from "~/lib/prisma";

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

    // Fetch active participants (registered and reserved, excluding cancelled)
    const activeParticipants = await prisma.eventRegistration.findMany({
      where: isExternalEvent
        ? {
            externalEventId: eventId,
            status: {
              not: "cancelled",
            },
          }
        : {
            customEventId: eventId,
            status: {
              not: "cancelled",
            },
          },
      select: {
        id: true,
        status: true,
        registeredAt: true,
        decklist: true,
        bringingDecklistOnsite: true,
        player: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        registeredAt: "asc",
      },
    });

    // Fetch cancelled participants separately
    const cancelledParticipants = await prisma.eventRegistration.findMany({
      where: isExternalEvent
        ? {
            externalEventId: eventId,
            status: "cancelled",
          }
        : {
            customEventId: eventId,
            status: "cancelled",
          },
      select: {
        id: true,
        status: true,
        registeredAt: true,
        decklist: true,
        bringingDecklistOnsite: true,
        player: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        registeredAt: "asc",
      },
    });

    return {
      event: {
        id: eventId,
        name: eventName,
        isExternalEvent,
      },
      participants: activeParticipants.map((p) => ({
        id: p.id,
        status: p.status,
        registeredAt: p.registeredAt,
        playerName: p.player.name,
        hasDecklistSubmitted: Boolean(p.decklist),
        isBringingDecklistOnsite: Boolean(p.bringingDecklistOnsite),
      })),
      cancelledParticipants: cancelledParticipants.map((p) => ({
        id: p.id,
        status: p.status,
        registeredAt: p.registeredAt,
        playerName: p.player.name,
        hasDecklistSubmitted: Boolean(p.decklist),
        isBringingDecklistOnsite: Boolean(p.bringingDecklistOnsite),
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
