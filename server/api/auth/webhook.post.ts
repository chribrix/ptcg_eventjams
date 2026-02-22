import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import {
  logError,
  logDatabaseError,
  logValidationError,
} from "~/server/util/errorLogger";

const prisma = new PrismaClient();

/**
 * Supabase Database Webhook Handler (auth.users table)
 *
 * This endpoint receives webhooks from Supabase Database when a new user is created.
 * When a new user is inserted into auth.users (after clicking magic link), we automatically
 * create a Player record if the user has registration metadata (name + playerId).
 *
 * Setup in Supabase Dashboard:
 * 1. Go to Database > Webhooks > Create a new webhook
 * 2. Configure:
 *    - Table: auth.users
 *    - Events: INSERT (check the box)
 *    - Type: HTTP Request
 *    - Method: POST
 *    - URL: https://your-domain.com/api/auth/webhook
 *    - HTTP Headers: x-webhook-signature: [your-secret]
 * 3. Add webhook secret to env: SUPABASE_WEBHOOK_SECRET
 */

// Verify webhook signature from Supabase
// Database webhooks send a static secret, not an HMAC signature
const verifyWebhookSignature = (
  signature: string | undefined,
  secret: string,
): boolean => {
  if (!signature) {
    return false;
  }

  try {
    // For Database Webhooks, just compare the static secret
    return signature === secret;
  } catch {
    return false;
  }
};

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const webhookSecret = config.supabaseWebhookSecret;

  // Get raw body for signature verification
  const rawBody = await readRawBody(event);
  const signature = getHeader(event, "x-webhook-signature");

  // Verify webhook signature if secret is configured
  if (webhookSecret) {
    if (!verifyWebhookSignature(signature, webhookSecret)) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid webhook signature",
      });
    }
  }

  // Parse the payload
  const payload = JSON.parse(rawBody || "{}");

  try {
    // Handle INSERT event on auth.users table
    // Database webhooks send: { type: "INSERT", table: "users", schema: "auth", record: {...} }
    if (
      payload.type === "INSERT" &&
      payload.table === "users" &&
      payload.schema === "auth"
    ) {
      const user = payload.record;

      if (!user || !user.id || !user.email) {
        await logValidationError(
          event,
          new Error("Invalid user data"),
          "webhook_invalid_user",
        );
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid user data in webhook",
        });
      }

      // Database webhooks send raw_user_meta_data, not user_metadata
      const { id: supabaseId, email, raw_user_meta_data, user_metadata } = user;
      const metadata = raw_user_meta_data || user_metadata || {};

      // Only create Player if we have registration metadata (name + playerId)
      // This distinguishes registration from login
      if (metadata?.playerId && metadata?.name) {
        try {
          // Check if player already exists
          const existingPlayer = await prisma.player.findUnique({
            where: { supabaseId },
          });

          let player;
          if (existingPlayer) {
            // Player exists, update it
            player = await prisma.player.update({
              where: { supabaseId },
              data: {
                email: email.toLowerCase(),
                name: metadata.name,
              },
            });
          } else {
            // Create new player
            player = await prisma.player.create({
              data: {
                supabaseId,
                playerId: metadata.playerId,
                name: metadata.name,
                email: email.toLowerCase(),
                birthDate: new Date("2000-01-01T00:00:00.000Z"),
              },
            });
          }

          return {
            success: true,
            message: "Player record created",
            playerId: player.id,
          };
        } catch (dbError: any) {
          // Check for duplicate playerId error
          if (
            dbError.code === "P2002" &&
            dbError.meta?.target?.includes("playerId")
          ) {
            await logError(
              event,
              new Error("Duplicate playerId"),
              "webhook_duplicate_player_id",
              {
                supabaseId,
                email,
                playerId: metadata.playerId,
              },
            );

            // Return success but log the issue - user already has an account
            // The frontend will handle this gracefully
            return {
              success: true,
              message: "Player already exists",
              duplicate: true,
            };
          }

          // Log other database errors
          await logDatabaseError(event, dbError, "webhook_player_creation");

          throw createError({
            statusCode: 500,
            statusMessage: "Failed to create player record",
          });
        }
      } else {
        // This is a login, not a registration - Player should already exist
        return {
          success: true,
          message: "Login - no player creation needed",
          action: "login",
        };
      }
    }

    // Handle other webhook events if needed in the future
    // Database webhooks can send INSERT, UPDATE, DELETE
    return { success: true, message: "Event received but not processed" };
  } catch (error) {
    // Don't re-throw errors that have already been logged and thrown
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    await logError(
      event,
      error instanceof Error ? error : new Error(String(error)),
      "webhook_handler_error",
      { payload },
    );

    throw createError({
      statusCode: 500,
      statusMessage: "Internal webhook handler error",
    });
  } finally {
    await prisma.$disconnect();
  }
});
