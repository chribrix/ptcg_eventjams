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
    // Get user from Supabase authentication
    const supabaseUser = await serverSupabaseUser(event);

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

    // Get all active event registrations for this player (excluding cancelled ones)
    const registrations = await prisma.eventRegistration.findMany({
      where: {
        playerId: player.id,
        status: {
          not: "cancelled",
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
      statusMessage: "Internal server error",
    });
  }
});
