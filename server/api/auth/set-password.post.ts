/**
 * Set Password Endpoint
 *
 * Allows an authenticated user (e.g. already signed in via password or email OTP) to set
 * or update their password. The same pepper+bcrypt chain used in login is applied.
 *
 * Requires: Authorization header (Bearer <access_token>) or session cookie.
 */
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

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
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
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

  // Update the user's password via admin API (bypasses the "old password required" check)
  const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(
    user.id,
  );
  const appMetadata = { ...(authUserData.user?.app_metadata || {}) };
  appMetadata.has_password = true;
  appMetadata.pending_password_setup = null;

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    {
      password: peppered,
      app_metadata: appMetadata,
    },
  );

  if (updateError) {
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
