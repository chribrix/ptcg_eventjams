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
  secret: string
): boolean => {
  if (!signature) {
    console.error("No signature provided in webhook request");
    return false;
  }

  try {
    // For Database Webhooks, just compare the static secret
    return signature === secret;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
};

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const webhookSecret = config.supabaseWebhookSecret;

  // Get raw body for signature verification
  const rawBody = await readRawBody(event);
  const signature = getHeader(event, "x-webhook-signature");

  console.log("📥 Webhook request received:", {
    hasBody: !!rawBody,
    hasSignature: !!signature,
    signatureLength: signature?.length,
    headers: getHeaders(event),
  });

  // Verify webhook signature if secret is configured
  if (webhookSecret) {
    if (!verifyWebhookSignature(signature, webhookSecret)) {
      console.error("Invalid webhook signature", {
        hasSignature: !!signature,
        webhookSecretConfigured: !!webhookSecret,
      });
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid webhook signature",
      });
    }
    console.log("✅ Webhook signature verified");
  } else {
    console.warn(
      "⚠️ SUPABASE_WEBHOOK_SECRET not configured - webhook signature not verified!"
    );
  }

  // Parse the payload
  const payload = JSON.parse(rawBody || "{}");

  console.log("🔔 Received Supabase webhook:", {
    type: payload.type,
    table: payload.table,
    schema: payload.schema,
    userId: payload.record?.id,
    email: payload.record?.email,
  });

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
        console.error("Invalid user data in webhook payload");
        await logValidationError(
          event,
          new Error("Invalid user data"),
          "webhook_invalid_user"
        );
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid user data in webhook",
        });
      }

      // Database webhooks send raw_user_meta_data, not user_metadata
      const { id: supabaseId, email, raw_user_meta_data, user_metadata } = user;
      const metadata = raw_user_meta_data || user_metadata || {};

      console.log("👤 New user created:", {
        supabaseId,
        email,
        hasMetadata: !!metadata,
        metadataKeys: metadata ? Object.keys(metadata) : [],
        metadata, // Log full metadata for debugging
      });

      // Only create Player if we have registration metadata (name + playerId)
      // This distinguishes registration from login
      if (metadata?.playerId && metadata?.name) {
        console.log("📝 Registration detected, creating Player record:", {
          supabaseId,
          email,
          name: metadata.name,
          playerId: metadata.playerId,
        });

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

          console.log("✅ Player record created/updated successfully:", {
            playerId: player.playerId,
            supabaseId: player.supabaseId,
            email: player.email,
          });

          return {
            success: true,
            message: "Player record created",
            playerId: player.id,
          };
        } catch (dbError: any) {
          console.error("❌ Database error creating player:", dbError);

          // Check for duplicate playerId error
          if (
            dbError.code === "P2002" &&
            dbError.meta?.target?.includes("playerId")
          ) {
            console.error("Player ID already exists:", metadata.playerId);
            await logError(
              event,
              new Error("Duplicate playerId"),
              "webhook_duplicate_player_id",
              {
                supabaseId,
                email,
                playerId: metadata.playerId,
              }
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
        console.log(
          "🔑 Login detected (no metadata), skipping Player creation"
        );
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
    console.log(
      `ℹ️ Unhandled webhook event: ${payload.type} on ${payload.schema}.${payload.table}`
    );
    return { success: true, message: "Event received but not processed" };
  } catch (error) {
    console.error("Webhook handler error:", error);

    // Don't re-throw errors that have already been logged and thrown
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    await logError(
      event,
      error instanceof Error ? error : new Error(String(error)),
      "webhook_handler_error",
      { payload }
    );

    throw createError({
      statusCode: 500,
      statusMessage: "Internal webhook handler error",
    });
  } finally {
    await prisma.$disconnect();
  }
});
