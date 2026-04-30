import { PrismaClient } from "@prisma/client";
import {
  logError,
  logDatabaseError,
  logAuthError,
} from "~/server/util/errorLogger";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";

const prisma = new PrismaClient();
const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "GET") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    const player = await resolveAuthenticatedPlayer(event, {
      allowMissing: true,
    });

    if (!player) {
      // Return empty array if player doesn't exist yet
      return {
        data: [],
      };
    }

    // Get user's past event registrations where the event date has passed
    const pastEvents = await prisma.eventRegistration.findMany({
      where: {
        playerId: player.id,
        customEvent: {
          eventDate: {
            lt: new Date(), // Events in the past
          },
        },
      },
      include: {
        customEvent: {
          include: {
            _count: {
              select: {
                registrations: true,
              },
            },
          },
        },
      },
      orderBy: {
        customEvent: {
          eventDate: "desc",
        },
      },
    });

    // Transform the data for the frontend
    const eventHistory = pastEvents.map((registration) => ({
      id: registration.customEvent.id,
      name: registration.customEvent.name,
      venue: registration.customEvent.venue,
      eventDate: registration.customEvent.eventDate.toISOString(),
      participationFee: registration.customEvent.participationFee?.toString(),
      description: registration.customEvent.description,
      status: registration.customEvent.status,
      requiresDecklist: registration.customEvent.requiresDecklist,
      totalParticipants: registration.customEvent._count.registrations,
      userRegistration: {
        id: registration.id,
        status: registration.status,
        registeredAt: registration.registeredAt.toISOString(),
      },
    }));

    return {
      data: eventHistory,
    };
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const statusCode = (error as any).statusCode;
      if (statusCode === 401) {
        await logAuthError(event, error as Error, "event_history_unauthorized");
      }
      throw error;
    }

    await logDatabaseError(event, error as Error, "event_history");
    throw createError({
      statusCode: 500,
      statusMessage:
        "Failed to fetch event history: " +
        (error instanceof Error ? error.message : String(error)),
    });
  }
});
