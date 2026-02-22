import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";
import {
  logError,
  logDatabaseError,
  logAuthError,
} from "~/server/util/errorLogger";

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
    } catch {}

    if (!supabaseUser) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    // Find the player by email
    // Note: Player model doesn't store Supabase userId, only Pokemon TCG playerId
    let player = null;

    if (supabaseUser.email) {
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
    if (error && typeof error === "object" && "statusCode" in error) {
      const statusCode = (error as any).statusCode;
      if (statusCode === 401) {
        await logAuthError(event, error as Error, "player_me_unauthorized");
      }
      throw error;
    }

    await logDatabaseError(event, error as Error, "player_me");
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch player profile",
    });
  } finally {
    await prisma.$disconnect();
  }
});
