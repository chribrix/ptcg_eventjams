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
    // Get the current user from server-side Supabase
    const user = await serverSupabaseUser(event);

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized - please log in",
      });
    }

    // Find player by email
    const player = await prisma.player.findFirst({
      where: { email: user.email?.toLowerCase() },
    });

    if (!player) {
      throw createError({
        statusCode: 404,
        statusMessage: "Player profile not found",
      });
    }

    return {
      player: {
        id: player.id,
        playerId: player.playerId,
        name: player.name,
        email: player.email,
        birthDate: player.birthDate,
      },
    };
  } catch (error) {
    console.error("Error fetching player profile:", error);

    // Re-throw if it's already a createError
    if (error && typeof error === "object" && "statusCode" in error) {
      const statusCode = (error as any).statusCode;
      if (statusCode === 401 || statusCode === 404) {
        await logAuthError(
          event,
          error as Error,
          "player_profile_get_unauthorized"
        );
      } else if (statusCode >= 500) {
        await logDatabaseError(event, error as Error, "player_profile_get");
      }
      throw error;
    }

    await logDatabaseError(event, error as Error, "player_profile_get");
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch profile",
    });
  } finally {
    await prisma.$disconnect();
  }
});
