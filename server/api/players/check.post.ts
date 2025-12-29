import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  logError,
  logValidationError,
  logDatabaseError,
} from "~/server/util/errorLogger";

const prisma = new PrismaClient();

const checkPlayerSchema = z
  .object({
    userId: z.string().optional(),
    email: z.string().email().optional(),
  })
  .refine((data) => data.userId || data.email, {
    message: "Either userId or email must be provided",
  });

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const validation = checkPlayerSchema.safeParse(body);

    if (!validation.success) {
      await logValidationError(event, validation.error, "player_check");
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request data",
      });
    }

    const { userId, email } = validation.data;

    let player = null;

    // Note: The Player model doesn't store Supabase userId, only Pokemon TCG playerId
    // So when checking by userId, we need to get the email from Supabase and check by email

    // If we have an email, use it directly for lookup
    if (email) {
      player = await prisma.player.findFirst({
        where: {
          email: email.toLowerCase(),
        },
      });
    }

    // Note: userId parameter is kept for API compatibility but is not used
    // because Player model doesn't track Supabase auth userId

    return {
      exists: !!player,
      player: player
        ? {
            id: player.id,
            playerId: player.playerId,
            name: player.name,
            email: player.email,
          }
        : null,
    };
  } catch (error) {
    console.error("Error checking player:", error);
    await logDatabaseError(event, error, "player_check");
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to check player existence",
    });
  } finally {
    await prisma.$disconnect();
  }
});
