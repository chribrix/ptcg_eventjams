import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";
import {
  ensurePlayerForAuthUser,
  getProvisionPlayerInputFromAuthUser,
} from "~/server/util/playerProvisioning";
import { clearAdminPasswordResetState } from "~/server/util/passwordSetupState";

// Finalizes the confirm-email password setup path.
//
// After the user proves email ownership again, this endpoint activates the
// password, clears pending metadata, and provisions the canonical Player row.

type AdminUser = {
  id: string;
  email?: string;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
};

const deriveEncryptionKey = (secret: string) =>
  crypto.createHash("sha256").update(secret).digest();

const decryptValue = (
  encrypted: { ciphertext: string; iv: string; tag: string },
  secret: string,
) => {
  const key = deriveEncryptionKey(secret);
  const iv = Buffer.from(encrypted.iv, "base64");
  const tag = Buffer.from(encrypted.tag, "base64");
  const ciphertext = Buffer.from(encrypted.ciphertext, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};

const getAuthUserById = async (
  supabaseAdmin: any,
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
) => {
  const adminApi = supabaseAdmin.auth.admin as {
    getUserById?: (id: string) => Promise<{
      data: { user: AdminUser | null };
      error: { message?: string } | null;
    }>;
  };

  if (typeof adminApi.getUserById === "function") {
    const { data, error } = await adminApi.getUserById(userId);
    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to load auth user",
      });
    }
    return data.user;
  }

  const adminRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!adminRes.ok) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load auth user",
    });
  }

  const adminData = await adminRes.json();
  return (adminData?.user || adminData) as AdminUser;
};

type FinalizePasswordSetupDependencies = {
  getRuntimeConfig?: typeof useRuntimeConfig;
  createPrismaClient?: () => PrismaClient;
  createSupabaseAdminClient?: (supabaseUrl: string, serviceKey: string) => any;
  getServerSupabaseUser?: typeof serverSupabaseUser;
  provisionPlayer?: typeof ensurePlayerForAuthUser;
};

export const createFinalizePasswordSetupHandler = (
  dependencies: FinalizePasswordSetupDependencies = {},
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
  const getServerUser =
    dependencies.getServerSupabaseUser || serverSupabaseUser;
  const provisionPlayer =
    dependencies.provisionPlayer || ensurePlayerForAuthUser;
  const prisma = createPrismaClient();

  return defineEventHandler(async (event) => {
    const config = getRuntimeConfig();

    const supabaseUrl = config.public.supabaseUrl;
    const serviceKey = config.supabaseServiceKey;
    const decryptionSecret = config.passwordPepper || config.supabaseServiceKey;

    if (!supabaseUrl || !serviceKey || !decryptionSecret) {
      throw createError({
        statusCode: 500,
        statusMessage: "Server configuration error",
      });
    }

    const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceKey);

    let user = await getServerUser(event);

    if (!user) {
      const authHeader = getHeader(event, "authorization");
      const accessToken = authHeader?.replace(/^Bearer\s+/i, "");

      if (accessToken) {
        const {
          data: { user: tokenUser },
          error: tokenUserError,
        } = await supabaseAdmin.auth.getUser(accessToken);

        if (!tokenUserError && tokenUser) {
          user = tokenUser;
        }
      }
    }

    if (!user) {
      throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }

    const authUser = await getAuthUserById(
      supabaseAdmin,
      supabaseUrl,
      serviceKey,
      user.id,
    );

    const pending = authUser?.app_metadata?.pending_password_setup as
      | {
          ciphertext?: string;
          iv?: string;
          tag?: string;
          expiresAt?: string;
        }
      | undefined;

    if (
      !pending?.ciphertext ||
      !pending?.iv ||
      !pending?.tag ||
      !pending?.expiresAt
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "No pending password setup found",
      });
    }

    if (new Date(pending.expiresAt).getTime() < Date.now()) {
      throw createError({
        statusCode: 400,
        statusMessage: "Password setup confirmation expired",
      });
    }

    let pepperedPassword = "";
    try {
      pepperedPassword = decryptValue(
        {
          ciphertext: pending.ciphertext,
          iv: pending.iv,
          tag: pending.tag,
        },
        decryptionSecret,
      );
    } catch {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid password setup confirmation",
      });
    }

    // Two separate admin REST calls are required here.
    //
    // When password + app_metadata are combined in a single updateUserById call,
    // GoTrue applies the password update but silently drops the app_metadata changes.
    //
    // Additionally, GoTrue's internal read-modify-write for the password update can
    // race with a preceding metadata-only update: GoTrue reads a stale snapshot of
    // the user record (before the metadata write was committed) and re-persists the
    // old app_metadata alongside the new password, resetting has_password to false.
    //
    // Fix: password first (raw REST PUT), then app_metadata (raw REST PUT).
    // The metadata write is the last operation, so it always lands with the correct
    // has_password: true state regardless of GoTrue's internal caching behaviour.

    // Step 1 – set password via raw admin REST API
    const pwRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ password: pepperedPassword }),
    });

    if (!pwRes.ok) {
      const pwErr = await pwRes.json().catch(() => ({}));
      throw createError({
        statusCode: 500,
        statusMessage: pwErr?.message || "Failed to activate password",
      });
    }

    // Step 2 – update app_metadata via raw admin REST API (must be last)
    const metaRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${user.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          app_metadata: {
            ...clearAdminPasswordResetState(authUser?.app_metadata),
            has_password: true,
            pending_password_setup: null,
          },
        }),
      },
    );

    if (!metaRes.ok) {
      const metaErr = await metaRes.json().catch(() => ({}));
      throw createError({
        statusCode: 500,
        statusMessage: metaErr?.message || "Failed to update password metadata",
      });
    }

    const provisioningInput = getProvisionPlayerInputFromAuthUser(
      authUser || user,
      {
        preferredLoginMethod: "password",
        fallbackEmail: user.email || authUser?.email || null,
      },
    );

    if (provisioningInput) {
      await provisionPlayer(prisma, provisioningInput);
    }

    await prisma.$executeRaw`
    UPDATE public.players
    SET preferred_login_method = 'password'
    WHERE supabase_id = ${user.id}
       OR LOWER(email) = LOWER(${user.email || ""})
  `;

    return { success: true };
  });
};

export default createFinalizePasswordSetupHandler();
