import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { email, password, name, playerId } = await readBody<{
    email?: string;
    password?: string;
    name?: string;
    playerId?: string;
  }>(event);

  if (!email || !password || !name || !playerId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Email, password, name and playerId are required",
    });
  }

  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: "Password must be at least 8 characters",
    });
  }

  const supabaseUrl = config.public.supabaseUrl;
  const serviceKey = config.supabaseServiceKey;

  if (!supabaseUrl || !serviceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Supabase admin configuration missing",
    });
  }

  const pepper = config.passwordPepper;
  const pepperedPassword = pepper
    ? crypto.createHmac("sha256", pepper).update(password).digest("hex")
    : password;

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password: pepperedPassword,
    email_confirm: true,
    user_metadata: {
      name,
      playerId,
    },
    app_metadata: {
      has_password: true,
      pending_password_setup: null,
    },
  });

  if (error) {
    const message = error.message || "Registration failed";
    const isConflict =
      /already|exists|registered|duplicate/i.test(message) ||
      (error as any)?.status === 422;

    throw createError({
      statusCode: isConflict ? 409 : 400,
      statusMessage: message,
    });
  }

  if (!data.user?.id) {
    throw createError({
      statusCode: 500,
      statusMessage: "User creation failed",
    });
  }

  return {
    success: true,
    requiresEmailConfirmation: false,
  };
});
