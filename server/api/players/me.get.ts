import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    let supabaseUser = null;

    // Check for impersonation first
    const impersonatedUserId = event.context.impersonatedUserId;

    if (impersonatedUserId) {
      // Use impersonated user
      const impersonatedPlayer = await prisma.player.findUnique({
        where: {
          playerId: impersonatedUserId,
        },
      });

      if (impersonatedPlayer) {
        return {
          playerId: impersonatedPlayer.playerId,
          name: impersonatedPlayer.name,
          email: impersonatedPlayer.email || "",
        };
      }
    }

    // Try Supabase authentication
    try {
      supabaseUser = await serverSupabaseUser(event);
    } catch (supabaseError) {
      console.log("Supabase auth failed:", supabaseError);
    }

    if (!supabaseUser) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    // Find the player by their Supabase user ID first
    let player = await prisma.player.findUnique({
      where: {
        playerId: supabaseUser.id,
      },
    });

    // Fallback to email lookup
    if (!player && supabaseUser.email) {
      player = await prisma.player.findFirst({
        where: {
          email: supabaseUser.email.toLowerCase(),
        },
      });
    }

    if (!player) {
      return {
        playerId: supabaseUser.id,
        email: supabaseUser.email,
        name: null,
      };
    }

    return {
      playerId: player.playerId,
      name: player.name,
      email: player.email,
    };
  } catch (error) {
    console.error("Error fetching player profile:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch player profile",
    });
  } finally {
    await prisma.$disconnect();
  }
});
