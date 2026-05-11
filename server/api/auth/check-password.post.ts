import { createSupabaseServerClient } from "~/server/util/createSupabaseServerClient";
import { getSupabaseAdminUserByEmail } from "~/server/util/supabaseAdminUserLookup";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { email } = await readBody<{ email?: string }>(event);

  if (!email) {
    throw createError({ statusCode: 400, statusMessage: "Email is required" });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const supabaseUrl = config.public.supabaseUrl;
  const serviceKey = config.supabaseServiceKey;

  if (!supabaseUrl || !serviceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Supabase admin not configured",
    });
  }

  const supabaseAdmin = createSupabaseServerClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let passwordState: "has" | "missing" | "unknown" = "unknown";

  try {
    const matched = await getSupabaseAdminUserByEmail<{
      email?: string;
      app_metadata?: {
        has_password?: boolean;
        pending_password_setup?: unknown;
      };
    }>(supabaseAdmin, normalizedEmail);

    if (matched?.app_metadata?.has_password === true) {
      passwordState = "has";
    } else if (matched?.app_metadata?.pending_password_setup) {
      passwordState = "missing";
    } else if (matched?.app_metadata?.has_password === false) {
      passwordState = "missing";
    }
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to check password status",
    });
  }

  return {
    hasPassword: passwordState === "has",
    passwordState,
  };
});
