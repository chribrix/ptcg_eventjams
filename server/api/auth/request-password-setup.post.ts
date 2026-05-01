import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import {
  ensurePlayerForAuthUser,
  getProvisionPlayerInputFromAuthUser,
} from "~/server/util/playerProvisioning";
import {
  clearAdminPasswordResetState,
  isAdminPasswordResetEnabled,
} from "~/server/util/passwordSetupState";

// Handles the first password setup flow for existing auth users.
//
// Path A activates the password immediately and now also provisions the canonical
// Player synchronously. Path B prepares an email-code confirmation step and
// defers final activation to finalize-password-setup.

type AdminUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
};

const deriveEncryptionKey = (secret: string) =>
  crypto.createHash("sha256").update(secret).digest();

const encryptValue = (value: string, secret: string) => {
  const key = deriveEncryptionKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
};

const getAuthUserByEmail = async (
  supabaseAdmin: any,
  supabaseUrl: string,
  serviceKey: string,
  email: string,
) => {
  const adminApi = supabaseAdmin.auth.admin as {
    getUserByEmail?: (email: string) => Promise<{
      data: { user: AdminUser | null };
      error: { message?: string } | null;
    }>;
  };

  if (typeof adminApi.getUserByEmail === "function") {
    const { data, error } = await adminApi.getUserByEmail(email);
    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to load auth user",
      });
    }
    return data.user;
  }

  const adminRes = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );

  if (!adminRes.ok) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load auth user",
    });
  }

  const adminData = await adminRes.json();
  const users = (adminData?.users ?? []) as AdminUser[];
  return users.find((user) => user.email?.toLowerCase() === email) || null;
};

type RequestPasswordSetupDependencies = {
  getRuntimeConfig?: typeof useRuntimeConfig;
  createPrismaClient?: () => PrismaClient;
  createSupabaseAdminClient?: (supabaseUrl: string, serviceKey: string) => any;
  provisionPlayer?: typeof ensurePlayerForAuthUser;
};

export const createRequestPasswordSetupHandler = (
  dependencies: RequestPasswordSetupDependencies = {},
) => {
  const getRuntimeConfig = dependencies.getRuntimeConfig || useRuntimeConfig;
  const createPrismaClient =
    dependencies.createPrismaClient || (() => new PrismaClient());
  const createSupabaseAdminClient =
    dependencies.createSupabaseAdminClient ||
    ((supabaseUrl: string, serviceKey: string) =>
      createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      }));
  const provisionPlayer =
    dependencies.provisionPlayer || ensurePlayerForAuthUser;
  const prisma = createPrismaClient();

  return defineEventHandler(async (event) => {
    const config = getRuntimeConfig();
    const { email, password, returnPath } = await readBody<{
      email?: string;
      password?: string;
      returnPath?: string;
    }>(event);

    if (!email || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: "Email and password are required",
      });
    }

    if (password.length < 8) {
      throw createError({
        statusCode: 400,
        statusMessage: "Password must be at least 8 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabaseUrl = config.public.supabaseUrl;
    const supabaseAnonKey = config.public.supabaseAnonKey;
    const serviceKey = config.supabaseServiceKey;
    const appBaseUrl = config.public.appBaseUrl?.replace(/\/$/, "");

    if (!supabaseUrl || !serviceKey || !supabaseAnonKey) {
      throw createError({
        statusCode: 500,
        statusMessage: "Supabase not configured",
      });
    }

    const pepper = config.passwordPepper;
    // Used to encrypt the pending password for the confirm_code path
    const encryptionSecret = config.passwordPepper || config.supabaseServiceKey;

    if (!pepper) {
      console.warn(
        "⚠️ PASSWORD_PEPPER is not configured — passwords are not peppered!",
      );
    }

    if (!encryptionSecret) {
      throw createError({
        statusCode: 500,
        statusMessage: "Server encryption secret is not configured",
      });
    }

    const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceKey);

    const authUser = await getAuthUserByEmail(
      supabaseAdmin,
      supabaseUrl,
      serviceKey,
      normalizedEmail,
    );

    if (!authUser) {
      throw createError({
        statusCode: 404,
        statusMessage: "Account not found",
      });
    }

    if (authUser.app_metadata?.has_password === true) {
      throw createError({
        statusCode: 409,
        statusMessage: "password_already_set",
      });
    }

    const pepperedPassword = pepper
      ? crypto.createHmac("sha256", pepper).update(password).digest("hex")
      : password;

    // Two-path logic:
    //
    // Path A – Niemals angemeldet (kein email_confirmed_at):
    //   Passwort wird sofort gesetzt, email wird als bestätigt markiert,
    //   Nutzer wird direkt eingeloggt. Keine Bestätigungsmail.
    //
    // Path B – Bereits mindestens einmal angemeldet (email_confirmed_at vorhanden):
    //   Das Passwort wird verschlüsselt als pending_password_setup gespeichert.
    //   Ein E-Mail-Code wird gesendet.
    //   Nach Eingabe des Codes → finalize-password-setup entschlüsselt und setzt das Passwort.
    //   Sicherheitsgrund: Der Nutzer muss beweisen, dass er noch Zugang zur Email hat.

    const hasLoggedInBefore = Boolean(authUser.email_confirmed_at);
    const adminPasswordResetEnabled = isAdminPasswordResetEnabled(
      authUser.app_metadata,
    );

    if (!hasLoggedInBefore || adminPasswordResetEnabled) {
      // Path A: direktes Passwort-Setzen und sofortiger Login.
      //
      // Zwei getrennte Raw-REST-Calls (gleicher Grund wie in finalize-password-setup):
      // GoTrue ignorierts app_metadata-Änderungen wenn password + app_metadata kombiniert werden.

      // Step 1 – Passwort setzen
      // (Metadata comes last to avoid GoTrue's read-modify-write race resetting has_password)
      const pwResA = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${authUser.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ password: pepperedPassword }),
        },
      );

      if (!pwResA.ok) {
        const pwErr = await pwResA.json().catch(() => ({}));
        throw createError({
          statusCode: 500,
          statusMessage: pwErr?.message || "Failed to activate password",
        });
      }

      // Step 2 – app_metadata + email bestätigen (muss zuletzt kommen)
      const metaResA = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${authUser.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            email_confirm: true,
            app_metadata: {
              ...clearAdminPasswordResetState(authUser.app_metadata),
              has_password: true,
              pending_password_setup: null,
            },
          }),
        },
      );

      if (!metaResA.ok) {
        const metaErr = await metaResA.json().catch(() => ({}));
        throw createError({
          statusCode: 500,
          statusMessage:
            metaErr?.message || "Failed to update password metadata",
        });
      }

      const loginResponse = await fetch(
        `${supabaseUrl}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({
            email: normalizedEmail,
            password: pepperedPassword,
          }),
        },
      );

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        const msg: string =
          loginData?.error_description ||
          loginData?.msg ||
          loginData?.message ||
          "Login failed";
        throw createError({ statusCode: 401, statusMessage: msg });
      }

      const provisioningInput = getProvisionPlayerInputFromAuthUser(authUser, {
        preferredLoginMethod: "password",
        fallbackEmail: normalizedEmail,
      });

      if (provisioningInput) {
        await provisionPlayer(prisma, provisioningInput);
      }

      await prisma.$executeRaw`
      UPDATE public.players
      SET preferred_login_method = 'password'
      WHERE supabase_id = ${authUser.id}
         OR LOWER(email) = LOWER(${normalizedEmail})
    `;

      return {
        success: true,
        mode: "direct",
        access_token: loginData.access_token,
        refresh_token: loginData.refresh_token,
        expires_in: loginData.expires_in,
        token_type: loginData.token_type,
      };
    }

    // Path B: Nutzer hat sich bereits angemeldet → Bestätigung per E-Mail-Code erforderlich.
    // Passwort wird verschlüsselt als pending_password_setup gespeichert und erst nach
    // Eingabe des E-Mail-Codes durch finalize-password-setup aktiviert.
    const encrypted = encryptValue(pepperedPassword, encryptionSecret);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: metadataError } =
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        app_metadata: {
          ...clearAdminPasswordResetState(authUser.app_metadata),
          has_password: false,
          pending_password_setup: {
            ...encrypted,
            expiresAt,
          },
        },
      });

    if (metadataError) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to prepare password setup",
      });
    }

    return {
      success: true,
      mode: "confirm_code",
      email: normalizedEmail,
    };
  });
};

export default createRequestPasswordSetupHandler();
