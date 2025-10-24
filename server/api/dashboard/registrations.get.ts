import { PrismaClient } from "~/generated/prisma";
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
        error: null,
      };
    }

    // Get all upcoming/current event registrations for this player (including cancelled ones so they can re-register)
    const registrations = await prisma.eventRegistration.findMany({
      where: {
        playerId: player.id,
        customEvent: {
          eventDate: {
            gte: new Date(), // Only future or current events
          },
        },
      },
      include: {
        customEvent: {
          select: {
            id: true,
            name: true,
            venue: true,
            maxParticipants: true,
            participationFee: true,
            description: true,
            eventDate: true,
            registrationDeadline: true,
            status: true,
            requiresDecklist: true,
          },
        },
      },
      orderBy: {
        customEvent: {
          eventDate: "asc",
        },
      },
    });

    return {
      data: registrations,
      error: null,
    };
  } catch (error) {
    console.error("Dashboard registrations error:", error);
    throw createError({
      statusCode: 500,
      statusMessage:
        "Internal server error: " +
        (error instanceof Error ? error.message : String(error)),
    });
  }
});
