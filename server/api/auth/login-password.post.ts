/**
 * Password Login Endpoint
 *
 * Security model:
 *   1. A server-side PEPPER (env: PASSWORD_PEPPER) is applied via HMAC-SHA256
 *      using Node's built-in `crypto` module (OpenSSL-backed, FIPS-approved).
 *   2. The peppered value is sent to Supabase's GoTrue, which applies bcrypt
 *      with a per-user random salt before storage.
 *   Full chain: password → HMAC-SHA256(pepper, password) → bcrypt(salt, result)
 *
 * The pepper is never sent to the client and protects against DB-only breaches.
 * HTTPS handles transport-layer confidentiality.
 */
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { getSupabaseAdminUserByEmail } from "~/server/util/supabaseAdminUserLookup";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { email, password } = await readBody(event);

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: "Email and password are required",
    });
  }

  // Apply server-side pepper via HMAC-SHA256 (Node built-in crypto / OpenSSL)
  const pepper = config.passwordPepper;
  if (!pepper) {
    console.warn(
      "⚠️ PASSWORD_PEPPER is not configured — passwords are not peppered!",
    );
  }
  const peppered = pepper
    ? crypto.createHmac("sha256", pepper).update(password).digest("hex")
    : password;

  const supabaseUrl = config.public.supabaseUrl;
  const supabaseAnonKey = config.public.supabaseAnonKey;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Supabase not configured",
    });
  }

  // Call Supabase REST auth API directly so we can inject the peppered password
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ email, password: peppered }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    const msg: string =
      data?.error_description ||
      data?.msg ||
      data?.message ||
      "Invalid credentials";
    // "No password set" surfaces as "Invalid login credentials" from Supabase —
    // we detect this by also checking if the user has a password via the admin API.
    if (msg.toLowerCase().includes("invalid login credentials")) {
      // Check whether the user exists but has no password (magic-link-only account)
      const serviceKey = config.supabaseServiceKey;
      if (serviceKey) {
        try {
          const { createSupabaseServerClient } = await import(
            "~/server/util/createSupabaseServerClient"
          );
          const supabaseAdmin = createSupabaseServerClient(
            supabaseUrl,
            serviceKey,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false,
              },
            },
          );
          const matchedUser = await getSupabaseAdminUserByEmail<any>(
            supabaseAdmin,
            email,
          );
          const hasPassword = matchedUser?.app_metadata?.has_password === true;

          if (matchedUser && !hasPassword) {
            // User exists but has no password set
            throw createError({
              statusCode: 422,
              statusMessage: "no_password_set",
            });
          }
        } catch {}
      }
    }
    throw createError({ statusCode: 401, statusMessage: msg });
  }

  try {
    const serviceKey = config.supabaseServiceKey;
    if (serviceKey) {
      const { createSupabaseServerClient } = await import(
        "~/server/util/createSupabaseServerClient"
      );
      const supabaseAdmin = createSupabaseServerClient(supabaseUrl, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      const matchedUser = await getSupabaseAdminUserByEmail<any>(
        supabaseAdmin,
        email,
      );

      if (matchedUser?.id) {
        const appMetadata = { ...(matchedUser.app_metadata || {}) };
        appMetadata.has_password = true;
        delete appMetadata.pending_password_setup;

        await fetch(`${supabaseUrl}/auth/v1/admin/users/${matchedUser.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ app_metadata: appMetadata }),
        });
      }
    }
  } catch {
    // best-effort only
  }

  await prisma.$executeRaw`
    UPDATE public.players
    SET preferred_login_method = 'password'
    WHERE LOWER(email) = LOWER(${email})
  `;

  // Return tokens to the client — client will call supabase.auth.setSession()
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    token_type: data.token_type,
  };
});
