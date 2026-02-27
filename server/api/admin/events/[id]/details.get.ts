import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const eventId = event.context.params?.id;

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  }

  try {
    // Fetch the custom event with registrations
    const customEvent = await prisma.customEvent.findUnique({
      where: {
        id: eventId,
      },
      include: {
        registrations: {
          include: {
            player: {
              select: {
                id: true,
                playerId: true,
                name: true,
                email: true,
                birthDate: true,
              },
            },
            tickets: true, // Decklist lives on RegistrationTicket, not EventRegistration
          },
          orderBy: {
            registeredAt: "asc",
          },
        },
      },
    });

    if (!customEvent) {
      throw createError({
        statusCode: 404,
        statusMessage: "Event not found",
      });
    }

    // Extract registrations.
    // Decklist lives on RegistrationTicket, not on EventRegistration — read from the first ticket.
    const registrations = customEvent.registrations.map((reg) => {
      const primaryTicket = reg.tickets?.[0];
      return {
        id: reg.id,
        playerId: reg.playerId,
        registeredAt: reg.registeredAt.toISOString(),
        decklist: primaryTicket?.decklist ?? null,
        bringingDecklistOnsite: primaryTicket?.bringingDecklistOnsite ?? false,
        tickets: reg.tickets.map((t) => ({
          id: t.id,
          participantName: t.participantName,
          participantPlayerId: t.participantPlayerId ?? null,
          status: t.status,
          decklist: t.decklist ?? null,
          bringingDecklistOnsite: t.bringingDecklistOnsite ?? false,
        })),
        player: {
          id: reg.player.id,
          playerId: reg.player.playerId,
          name: reg.player.name,
          email: reg.player.email,
          birthDate: reg.player.birthDate.toISOString(),
        },
      };
    });

    // Return event without the registrations nested array
    const { registrations: _, ...eventData } = customEvent;

    return {
      success: true,
      event: {
        ...eventData,
        eventDate: eventData.eventDate.toISOString(),
        registrationDeadline:
          eventData.registrationDeadline?.toISOString() || null,
        createdAt: eventData.createdAt.toISOString(),
        updatedAt: eventData.updatedAt.toISOString(),
      },
      registrations,
    };
  } catch (error) {
    console.error("Error fetching event details:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch event details",
    });
  }
});
