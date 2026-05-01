import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";
import { z } from "zod";
import {
  logDatabaseError,
  logValidationError,
} from "~/server/util/errorLogger";
import { ensurePlayerForAuthUser } from "~/server/util/playerProvisioning";

const prisma = new PrismaClient();

const registerPlayerSchema = z.object({
  playerId: z
    .string()
    .min(1, "Player ID is required")
    .regex(/^\d+$/, "Player ID must contain only numbers"),
  name: z.string().min(1, "Name is required"),
  birthDate: z.string().datetime().optional(),
  preferredLoginMethod: z.enum(["password", "otp"]).optional(),
});

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);

    if (!user?.id || !user.email) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    const body = await readBody(event);
    const validation = registerPlayerSchema.safeParse(body);

    if (!validation.success) {
      await logValidationError(event, validation.error, "player_register");
      throw createError({
        statusCode: 400,
        statusMessage:
          validation.error.errors[0]?.message || "Invalid request data",
      });
    }

    const { playerId, name, birthDate, preferredLoginMethod } = validation.data;

    const player = await ensurePlayerForAuthUser(prisma, {
      supabaseId: user.id,
      email: user.email,
      name,
      playerId,
      preferredLoginMethod,
      birthDate: birthDate ? new Date(birthDate) : undefined,
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
