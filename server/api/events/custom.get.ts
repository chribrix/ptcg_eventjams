import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    // Get all custom events that are public (not requiring admin access to view)
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
        createdAt: true,
        updatedAt: true,
        // Also get registration count
        registrations: {
          select: {
            id: true,
          },
        },
      },
    });

    // Transform the data to include registration count
    const eventsWithCount = customEvents.map((event) => ({
      ...event,
      registrationCount: event.registrations.length,
      registrations: undefined, // Remove the registrations array from response
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
