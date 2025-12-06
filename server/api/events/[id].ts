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
    // First try to fetch as custom event
    const customEvent = await prisma.customEvent.findUnique({
      where: {
        id: eventId,
      },
    });

    if (customEvent) {
      // Count registrations for this custom event (excluding cancelled registrations)
      const registrationCount = await prisma.eventRegistration.count({
        where: {
          customEventId: eventId,
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
      }
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
    const registrationCount = await prisma.eventRegistration.count({
      where: {
        externalEventId: eventId,
        status: {
          not: "cancelled",
        },
      },
    });

    // Extract event type from overrides JSONB field
    const overrides = externalEventOverride.overrides as any;
    const getEventType = (): string => {
      if (!overrides) return "custom";
      if (overrides.icon === "cup" || overrides.type === "cup") return "cup";
      if (
        overrides.icon === "challenge" ||
        overrides.icon === "chall" ||
        overrides.type === "challenge"
      )
        return "challenge";
      if (overrides.icon === "local" || overrides.type === "local")
        return "local";
      return "custom";
    };

    // Create a custom event-like object from the external event override
    const transformedEvent = {
      id: externalEventOverride.id,
      name:
        overrides?.title || overrides?.venue || externalEventOverride.eventName,
      venue:
        overrides?.venue ||
        externalEventOverride.eventLocation ||
        externalEventOverride.eventName,
      eventDate: externalEventOverride.eventDate,
      maxParticipants: externalEventOverride.maxParticipants || 0,
      participationFee: externalEventOverride.participationFee,
      description: externalEventOverride.description,
      registrationDeadline: externalEventOverride.registrationDeadline,
      requiresDecklist: externalEventOverride.requiresDecklist,
      status: "published", // External events are always "published"
      createdBy: externalEventOverride.createdBy,
      createdAt: externalEventOverride.createdAt,
      updatedAt: externalEventOverride.updatedAt,
      isExternalEvent: true,
      eventType: getEventType(),
    };

    return {
      event: transformedEvent,
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
