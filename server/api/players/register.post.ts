import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const registerPlayerSchema = z.object({
  playerId: z
    .string()
    .min(1, "Player ID is required")
    .regex(/^\d+$/, "Player ID must contain only numbers"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  userId: z.string().min(1, "User ID is required"),
  birthDate: z.string().datetime().optional(),
});

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const validation = registerPlayerSchema.safeParse(body);

    if (!validation.success) {
      console.error("Validation error:", validation.error);
      throw createError({
        statusCode: 400,
        statusMessage:
          validation.error.errors[0]?.message || "Invalid request data",
      });
    }

    const { playerId, name, email, userId, birthDate } = validation.data;

    // Check if player with this playerId already exists
    const existingPlayerById = await prisma.player.findUnique({
      where: { playerId },
    });

    if (existingPlayerById) {
      throw createError({
        statusCode: 409,
        statusMessage: "Player ID already exists",
      });
    }

    // Check if player with this email already exists
    const existingPlayerByEmail = await prisma.player.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (existingPlayerByEmail) {
      throw createError({
        statusCode: 409,
        statusMessage: "Email already registered",
      });
    }

    // Create the player record
    const player = await prisma.player.create({
      data: {
        playerId,
        name,
        email: email.toLowerCase(),
        birthDate: birthDate
          ? new Date(birthDate)
          : new Date("2000-01-01T00:00:00.000Z"),
      },
    });

    return {
      success: true,
      player: {
        id: player.id,
        playerId: player.playerId,
        name: player.name,
        email: player.email,
      },
    };
  } catch (error) {
    console.error("Error registering player:", error);

    // Re-throw if it's already a createError
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create player account",
    });
  } finally {
    await prisma.$disconnect();
  }
});
