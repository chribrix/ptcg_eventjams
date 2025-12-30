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
  supabaseId: z.string().min(1, "Supabase user ID is required").optional(), // Optional for backward compatibility
  userId: z.string().optional(), // Deprecated: kept for backward compatibility
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

    const { playerId, name, email, supabaseId, userId, birthDate } =
      validation.data;

    // Use supabaseId if provided, otherwise fall back to userId (backward compat)
    const userAuthId = supabaseId || userId;

    // Use database transaction for atomicity
    const player = await prisma.$transaction(async (tx) => {
      // Check for existing player by playerId or email
      const existingPlayer = await tx.player.findFirst({
        where: {
          OR: [
            { playerId },
            { email: email.toLowerCase() },
            ...(userAuthId ? [{ supabaseId: userAuthId }] : []),
          ],
        },
      });

      if (existingPlayer) {
        // Determine which field conflicts
        if (existingPlayer.playerId === playerId) {
          await logError(
            event,
            new Error("Player ID already exists"),
            "registration_duplicate_player_id",
            { playerId, email, existingPlayerId: existingPlayer.id }
          );
          throw createError({
            statusCode: 409,
            statusMessage: "Player ID already exists",
          });
        }

        if (existingPlayer.email?.toLowerCase() === email.toLowerCase()) {
          await logError(
            event,
            new Error("Email already registered"),
            "registration_duplicate_email",
            { playerId, email, existingPlayerId: existingPlayer.id }
          );
          throw createError({
            statusCode: 409,
            statusMessage: "Email already registered",
          });
        }

        if (userAuthId && existingPlayer.supabaseId === userAuthId) {
          await logError(
            event,
            new Error("User already has a player account"),
            "registration_duplicate_supabase_id",
            { playerId, email, supabaseId: userAuthId }
          );
          throw createError({
            statusCode: 409,
            statusMessage: "User already has a player account",
          });
        }
      }

      // Create the player record
      return await tx.player.create({
        data: {
          supabaseId: userAuthId || undefined,
          playerId,
          name,
          email: email.toLowerCase(),
          birthDate: birthDate
            ? new Date(birthDate)
            : new Date("2000-01-01T00:00:00.000Z"),
        },
      });
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
