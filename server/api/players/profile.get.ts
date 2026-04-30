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
  try {
    const authenticatedPlayer = await resolveAuthenticatedPlayer(event);

    if (!authenticatedPlayer) {
      throw createError({
        statusCode: 404,
        statusMessage: "Player profile not found",
      });
    }

    const player = await prisma.player.findUnique({
      where: { id: authenticatedPlayer.id },
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
        preferredLoginMethod:
          (player as any).preferredLoginMethod || "password",
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
          error as unknown as Error,
          "player_profile_get_unauthorized",
        );
      } else if (statusCode >= 500) {
        await logDatabaseError(
          event,
          error as unknown as Error,
          "player_profile_get",
        );
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
