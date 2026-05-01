import { z } from "zod";
import prisma from "~/lib/prisma";
import { projectPublicEventDetailsFromOverride } from "~/server/services/events/eventProjectionService";

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
    // First try to fetch as custom event
    const customEvent = await prisma.customEvent.findUnique({
      where: {
        id: eventId,
      },
    });

    if (customEvent) {
      // Count active tickets for this custom event (excluding cancelled tickets)
      const registrationCount = await prisma.registrationTicket.count({
        where: {
          registration: {
            customEventId: eventId,
          },
          status: {
            not: "cancelled",
          },
        },
      });

      return {
        event: customEvent,
        registrationCount,
      };
    }

    // If not found as custom event, try as external event override
    const externalEventOverride = await prisma.externalEventOverride.findUnique(
      {
        where: {
          id: eventId,
        },
      },
    );

    if (
      !externalEventOverride ||
      !externalEventOverride.handleRegistrationLocally
    ) {
      throw createError({
        statusCode: 404,
        statusMessage: "Event not found",
      });
    }

    // Transform external event override to match custom event structure
    // Count active tickets for this external event (excluding cancelled tickets)
    const registrationCount = await prisma.registrationTicket.count({
      where: {
        registration: {
          externalEventId: eventId,
        },
        status: {
          not: "cancelled",
        },
      },
    });

    return projectPublicEventDetailsFromOverride(
      externalEventOverride,
      registrationCount,
    );
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
