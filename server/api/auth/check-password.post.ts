import { createClient } from "@supabase/supabase-js";

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

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const adminApi = supabaseAdmin.auth.admin as {
    getUserByEmail?: (email: string) => Promise<{
      data: {
        user: {
          app_metadata?: {
            has_password?: boolean;
            pending_password_setup?: unknown;
          };
        } | null;
      };
      error: { message?: string } | null;
    }>;
  };

  let passwordState: "has" | "missing" | "unknown" = "unknown";

  if (typeof adminApi.getUserByEmail === "function") {
    const { data, error } = await adminApi.getUserByEmail(normalizedEmail);

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to check password status",
      });
    }

    const metadata = data.user?.app_metadata;
    if (metadata?.has_password === true) {
      passwordState = "has";
    } else if (metadata?.pending_password_setup) {
      passwordState = "missing";
    } else if (metadata?.has_password === false) {
      passwordState = "missing";
    }
  } else {
    const res = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(normalizedEmail)}`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    );

    if (!res.ok) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to check password status",
      });
    }

    const data = await res.json();
    const users = (data?.users ?? []) as Array<{
      email?: string;
      app_metadata?: {
        has_password?: boolean;
        pending_password_setup?: unknown;
      };
    }>;
    const matched = users.find(
      (user) => user.email?.toLowerCase() === normalizedEmail,
    );

    if (matched?.app_metadata?.has_password === true) {
      passwordState = "has";
    } else if (matched?.app_metadata?.pending_password_setup) {
      passwordState = "missing";
    } else if (matched?.app_metadata?.has_password === false) {
      passwordState = "missing";
    }
  }

  return {
    hasPassword: passwordState === "has",
    passwordState,
  };
});
