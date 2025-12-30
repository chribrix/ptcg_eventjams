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
    supabaseId: z.string().optional(), // Supabase auth user ID
    userId: z.string().optional(), // Deprecated: backward compatibility
    email: z.string().email().optional(),
  })
  .refine((data) => data.supabaseId || data.userId || data.email, {
    message: "Either supabaseId, userId, or email must be provided",
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

    const { supabaseId, userId, email } = validation.data;

    let player = null;

    // Check by supabaseId first (most direct link)
    const authId = supabaseId || userId;
    if (authId) {
      player = await prisma.player.findUnique({
        where: {
          supabaseId: authId,
        },
      });
    }

    // If not found and we have an email, try email lookup
    if (!player && email) {
      player = await prisma.player.findFirst({
        where: {
          email: email.toLowerCase(),
        },
      });
    }

    // If still no player found but we have an email, check if user exists in Supabase auth
    // This prevents registration with emails that already have Supabase accounts
    let supabaseUserExists = false;
    if (!player && email) {
      try {
        const supabaseAdmin = useSupabaseServiceRole();
        // More efficient: use getUserByEmail instead of listing all users
        const { data: authUser, error: authError } =
          await supabaseAdmin.auth.admin.getUserByEmail(email);

        if (!authError && authUser?.user) {
          supabaseUserExists = true;
          console.log(
            `⚠️ User exists in Supabase auth but not in players table: ${email}`,
            {
              userId: authUser.user.id,
              hasMetadata: !!authUser.user.user_metadata,
            }
          );
        }
      } catch (authCheckError) {
        console.error("Error checking Supabase auth user:", authCheckError);
        // Don't fail the request if auth check fails
      }
    }

    return {
      exists: !!player || supabaseUserExists,
      player: player
        ? {
            id: player.id,
            playerId: player.playerId,
            name: player.name,
            email: player.email,
          }
        : null,
      // Indicate if user exists in auth but not in players table
      authOnly: !player && supabaseUserExists,
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
