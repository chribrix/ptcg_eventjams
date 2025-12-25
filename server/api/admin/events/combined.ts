import { PrismaClient } from "@prisma/client";
import { parseEventTags } from "~/types/eventTags";

const prisma = new PrismaClient();

export default defineEventHandler(async () => {
  try {
    // Fetch custom events
    const customEvents = await prisma.customEvent.findMany({
      include: {
        registrations: {
          include: {
            player: true,
          },
        },
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        eventDate: "desc",
      },
    });

    // Fetch external events with local registration enabled
    const externalEventsWithRegistration =
      await prisma.externalEventOverride.findMany({
        where: {
          handleRegistrationLocally: true,
        },
        include: {
          registrations: {
            include: {
              player: true,
            },
          },
          creator: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          eventDate: "desc",
        },
      });

    // Transform external events to match custom event structure
    const transformedExternalEvents = externalEventsWithRegistration.map(
      (event) => {
        const overrides = event.overrides as any;
        // Parse tags from overrides or use tagType/tags from the event
        const tags = event.tags
          ? parseEventTags(event.tags, event.tagType || "pokemon")
          : overrides?.tags
          ? parseEventTags(overrides.tags, "pokemon")
          : { game: "Pokemon" };
        const eventType = tags.type || "custom";

        return {
          id: event.id,
          name: overrides.title || overrides.venue || event.eventName,
          venue: overrides.venue || event.eventName,
          maxParticipants: event.maxParticipants || 0,
          participationFee: event.participationFee || 0,
          description: event.description,
          eventDate: event.eventDate,
          registrationDeadline: event.registrationDeadline,
          status:
            new Date(event.eventDate) > new Date() ? "upcoming" : "completed",
          requiresDecklist: event.requiresDecklist,
          createdBy: event.createdBy,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
          registrations: event.registrations,
          creator: event.creator,
          isExternalEvent: true, // Flag to identify external events
          tagType: event.tagType || "pokemon",
          tags: event.tags || tags,
          eventType: eventType, // Add event type for backward compatibility
          originalEventName: event.eventName,
          originalEventDate: event.eventDate,
        };
      }
    );

    // Combine both types of events
    const allEvents = [
      ...customEvents.map((e) => ({
        ...e,
        isExternalEvent: false,
        eventType: e.tags
          ? parseEventTags(e.tags, e.tagType).type || "custom"
          : "custom",
      })),
      ...transformedExternalEvents,
    ].sort(
      (a, b) =>
        new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
    );

    return {
      success: true,
      events: allEvents,
    };
  } catch (error) {
    console.error("Error fetching combined events:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch events",
    });
  }
});

// Use centralized event type utility
// (function removed - now imported from utils/eventTypes.ts)
