import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  logError,
  logValidationError,
  logDatabaseError,
  logAuthError,
} from "~/server/util/errorLogger";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";

const prisma = new PrismaClient();
const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

const updateProfileSchema = z.object({
  playerId: z
    .string()
    .min(1, "Player ID is required")
    .regex(/^\d+$/, "Player ID must contain only numbers"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  birthDate: z.string().datetime().optional(),
});

export default defineEventHandler(async (event) => {
  try {
    const currentPlayer = await resolveAuthenticatedPlayer(event);

    if (!currentPlayer) {
      throw createError({
        statusCode: 404,
        statusMessage: "Player profile not found",
      });
    }

    const body = await readBody(event);
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      console.error("Validation error:", validation.error);
      await logValidationError(
        event,
        validation.error,
        "player_profile_update"
      );
      throw createError({
        statusCode: 400,
        statusMessage:
          validation.error.errors[0]?.message || "Invalid request data",
      });
    }

    const { playerId, name, email, birthDate } = validation.data;

    // Check if the new playerId is different and already exists
    if (playerId !== currentPlayer.playerId) {
      const existingPlayerById = await prisma.player.findUnique({
        where: { playerId },
      });

      if (existingPlayerById) {
        await logError(
          event,
          "player_profile_update_duplicate_player_id",
          "Player ID already exists",
          {
            attemptedPlayerId: playerId,
          }
        );
        throw createError({
          statusCode: 409,
          statusMessage: "Player ID already exists",
        });
      }
    }

    // Check if the new email is different and already exists
    if (email.toLowerCase() !== currentPlayer.email?.toLowerCase()) {
      const existingPlayerByEmail = await prisma.player.findFirst({
        where: {
          email: email.toLowerCase(),
          NOT: { id: currentPlayer.id },
        },
      });

      if (existingPlayerByEmail) {
        await logError(
          event,
          "player_profile_update_duplicate_email",
          "Email already registered to another account",
          {
            attemptedEmail: email,
          }
        );
        throw createError({
          statusCode: 409,
          statusMessage: "Email already registered to another account",
        });
      }
    }

    // Update the player record
    const updatedPlayer = await prisma.player.update({
      where: { id: currentPlayer.id },
      data: {
        playerId,
        name,
        email: email.toLowerCase(),
        birthDate: birthDate ? new Date(birthDate) : undefined,
      },
    });

    // Log successful profile update
    await prisma.errorLog.create({
      data: {
        errorType: "info_profile_updated",
        errorMessage: `User updated their profile`,
        userEmail: updatedPlayer.email || currentPlayer.email || null,
        userId: currentPlayer.supabaseId || null,
        url: "/api/players/profile",
        metadata: {
          playerId: updatedPlayer.playerId,
          playerName: updatedPlayer.name,
          emailChanged: currentPlayer.email !== email.toLowerCase(),
          playerIdChanged: currentPlayer.playerId !== playerId,
        },
      },
    });

    return {
      success: true,
      player: {
        id: updatedPlayer.id,
        playerId: updatedPlayer.playerId,
        name: updatedPlayer.name,
        email: updatedPlayer.email,
        birthDate: updatedPlayer.birthDate,
        phone: updatedPlayer.phone,
        emergencyContact: updatedPlayer.emergencyContact,
        emergencyPhone: updatedPlayer.emergencyPhone,
      },
    };
  } catch (error) {
    console.error("Error updating player profile:", error);

    // Re-throw if it's already a createError
    if (error && typeof error === "object" && "statusCode" in error) {
      const statusCode = (error as any).statusCode;
      if (statusCode === 401 || statusCode === 404 || statusCode === 403) {
        await logAuthError(
          event,
          error as unknown as Error,
          "player_profile_update_unauthorized"
        );
      } else if (statusCode >= 500) {
        await logDatabaseError(
          event,
          error as unknown as Error,
          "player_profile_update",
        );
      }
      throw error;
    }

    await logDatabaseError(event, error as Error, "player_profile_update");
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update profile",
    });
  } finally {
    await prisma.$disconnect();
  }
});
