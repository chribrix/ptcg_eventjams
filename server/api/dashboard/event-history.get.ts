import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "GET") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    let supabaseUser = null;

    // Try Supabase authentication FIRST (real auth takes priority)
    try {
      supabaseUser = await serverSupabaseUser(event);
    } catch (supabaseError) {
      console.log("Supabase auth failed:", supabaseError);
      // Continue without Supabase auth
    }

    // Only fallback to dev authentication if no Supabase user AND in development
    if (!supabaseUser && process.env.NODE_ENV !== "production") {
      const devUserId = getCookie(event, "dev-user-id");
      const devUserEmail = getCookie(event, "dev-user-email");

      if (devUserId && devUserEmail) {
        supabaseUser = {
          id: devUserId,
          email: devUserEmail,
        } as any;
      }
    }

    if (!supabaseUser) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    // Find the player by their Supabase user ID first, then by email as fallback
    let player = await prisma.player.findUnique({
      where: {
        playerId: supabaseUser.id,
      },
    });

    if (!player && supabaseUser.email) {
      // Try to find by email as fallback
      player = await prisma.player.findFirst({
        where: {
          email: supabaseUser.email.toLowerCase(),
        },
      });
    }

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
    console.error("Error fetching user event history:", error);
    throw createError({
      statusCode: 500,
      statusMessage:
        "Failed to fetch event history: " +
        (error instanceof Error ? error.message : String(error)),
    });
  }
});
