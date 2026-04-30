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
    const player = await resolveAuthenticatedPlayer(event);

    return {
      playerId: player.playerId,
      name: player.name,
      email: player.email || "",
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
