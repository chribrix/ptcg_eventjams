import prisma from "~/lib/prisma";
import { countRegistrationTickets } from "~/server/services/events/eventProjectionService";

export default defineEventHandler(async (event) => {
  try {
    const customEvents = await prisma.customEvent.findMany({
      orderBy: {
        eventDate: "asc",
      },
      select: {
        id: true,
        name: true,
        eventDate: true,
        venue: true,
        maxParticipants: true,
        participationFee: true,
        tagType: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        registrations: {
          select: {
            tickets: {
              where: {
                status: {
                  not: "cancelled",
                },
              },
              select: { id: true },
            },
          },
        },
      },
    });

    // Transform the data to include registration count
    const eventsWithCount = customEvents.map((event) => ({
      ...event,
      registrationCount: countRegistrationTickets(event.registrations),
      registrations: undefined,
    }));

    return {
      success: true,
      events: eventsWithCount,
    };
  } catch (error) {
    console.error("Error fetching public custom events:", error);
    return {
      success: false,
      events: [],
      error: "Failed to fetch custom events",
    };
  }
});
