import { PrismaClient } from "@prisma/client";
import { z } from "zod";

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
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request data",
      });
    }

    const { userId, email } = validation.data;

    let player = null;

    // Check if player exists by Supabase user ID first (if provided)
    if (userId) {
      player = await prisma.player.findUnique({
        where: {
          playerId: userId,
        },
      });
    }

    // Fallback to email lookup if user ID not found or not provided
    if (!player && email) {
      player = await prisma.player.findFirst({
        where: {
          email: email.toLowerCase(),
        },
      });
    }

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
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to check player existence",
    });
  } finally {
    await prisma.$disconnect();
  }
});
