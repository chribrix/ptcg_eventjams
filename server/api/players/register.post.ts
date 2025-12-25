import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  logError,
  logValidationError,
  logDatabaseError,
} from "~/server/util/errorLogger";

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
      await logValidationError(event, validation.error, "player_register");
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
      await logError(
        event,
        new Error("Player ID already exists"),
        "registration_duplicate_player_id",
        { playerId, email }
      );
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
      await logError(
        event,
        new Error("Email already registered"),
        "registration_duplicate_email",
        { playerId, email }
      );
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

    // Log the error if it hasn't been logged yet
    if (
      !(
        error &&
        typeof error === "object" &&
        "statusCode" in error &&
        (error as any).statusCode < 500
      )
    ) {
      await logDatabaseError(event, error, "player_registration");
    }

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
