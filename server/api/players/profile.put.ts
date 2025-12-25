import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { serverSupabaseUser } from "#supabase/server";

const prisma = new PrismaClient();

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
    // Get the current user from server-side Supabase
    const user = await serverSupabaseUser(event);

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized - please log in",
      });
    }

    // Get the current player record by email
    const currentPlayer = await prisma.player.findFirst({
      where: { email: user.email?.toLowerCase() },
    });

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
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update profile",
    });
  } finally {
    await prisma.$disconnect();
  }
});
