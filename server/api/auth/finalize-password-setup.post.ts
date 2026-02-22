import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";

const prisma = new PrismaClient();

type AdminUser = {
  id: string;
  email?: string;
  app_metadata?: Record<string, any>;
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

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const supabaseUrl = config.public.supabaseUrl;
  const serviceKey = config.supabaseServiceKey;
  const decryptionSecret = config.passwordPepper || config.supabaseServiceKey;

  if (!supabaseUrl || !serviceKey || !decryptionSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "Server configuration error",
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let user = await serverSupabaseUser(event);

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

  const appMetadata = { ...(authUser?.app_metadata || {}) };
  appMetadata.pending_password_setup = null;
  appMetadata.has_password = true;

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    {
      password: pepperedPassword,
      app_metadata: appMetadata,
    },
  );

  if (updateError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to activate password",
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
