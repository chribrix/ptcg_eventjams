/**
 * Set Password Endpoint
 *
 * Allows an authenticated user (e.g. already signed in via password or email OTP) to set
 * or update their password. The same pepper+bcrypt chain used in login is applied.
 *
 * Requires: Authorization header (Bearer <access_token>) or session cookie.
 */
import crypto from "crypto";
import { createSupabaseServerClient } from "~/server/util/createSupabaseServerClient";
import { PrismaClient } from "@prisma/client";
import { clearAdminPasswordResetState } from "~/server/util/passwordSetupState";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { password } = await readBody(event);

  if (!password || password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: "Password must be at least 8 characters",
    });
  }

  // Get the user's access token from the Authorization header
  const authHeader = getHeader(event, "authorization");
  const accessToken = authHeader?.replace(/^Bearer\s+/i, "");

  if (!accessToken) {
    throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  }

  const supabaseUrl = config.public.supabaseUrl as string;
  const serviceKey = config.supabaseServiceKey;

  if (!supabaseUrl || !serviceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Server configuration error",
    });
  }

  // Verify the access token and get the user
  const supabaseAdmin = createSupabaseServerClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !user) {
    throw createError({ statusCode: 401, statusMessage: "Invalid session" });
  }

  // Apply server-side pepper via HMAC-SHA256
  const pepper = config.passwordPepper;
  const peppered = pepper
    ? crypto.createHmac("sha256", pepper).update(password).digest("hex")
    : password;

  // Update the user's password via the admin REST API in two steps.
  // This avoids GoTrue dropping metadata changes when password + app_metadata
  // are sent together in one update.
  const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(
    user.id,
  );
  const appMetadata = {
    ...clearAdminPasswordResetState(authUserData.user?.app_metadata),
    has_password: true,
    pending_password_setup: null,
  };

  const passwordResponse = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${user.id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ password: peppered }),
    },
  );

  if (!passwordResponse.ok) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to set password",
    });
  }

  const metadataResponse = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${user.id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        app_metadata: appMetadata,
      }),
    },
  );

  if (!metadataResponse.ok) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to set password",
    });
  }

  await prisma.$executeRaw`
    UPDATE public.players
    SET preferred_login_method = 'password'
    WHERE supabase_id = ${user.id}
       OR LOWER(email) = LOWER(${user.email || ""})
  `;

  return { success: true };
});
