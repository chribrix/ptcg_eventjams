import { z } from "zod";
import prisma from "~/lib/prisma";

// Get event details with registration count
export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, "id");

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  }

  try {
    // Fetch the custom event
    const customEvent = await prisma.customEvent.findUnique({
      where: {
        id: eventId,
      },
    });

    if (!customEvent) {
      throw createError({
        statusCode: 404,
        statusMessage: "Event not found",
      });
    }

    // Count registrations for this event (excluding cancelled registrations)
    const registrationCount = await prisma.eventRegistration.count({
      where: {
        customEventId: eventId,
        status: {
          not: "cancelled"
        }
      },
    });

    return {
      event: customEvent,
      registrationCount,
    };
  } catch (error: unknown) {
    console.error("Error fetching event details:", error);

    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch event details",
    });
  }
});
