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
    // Fetch the event to verify it exists
    const customEvent = await prisma.customEvent.findUnique({
      where: { id: eventId },
      select: { id: true, name: true },
    });

    if (!customEvent) {
      throw createError({
        statusCode: 404,
        statusMessage: "Event not found",
      });
    }

    // Fetch participants (registered and reserved, excluding cancelled)
    const participants = await prisma.eventRegistration.findMany({
      where: {
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

    return {
      event: {
        id: customEvent.id,
        name: customEvent.name,
      },
      participants: participants.map((p) => ({
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
