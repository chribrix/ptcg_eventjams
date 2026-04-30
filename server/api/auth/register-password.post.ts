import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { ensurePlayerForAuthUser } from "~/server/util/playerProvisioning";

type RegisterPasswordDependencies = {
  getRuntimeConfig?: typeof useRuntimeConfig;
  createPrismaClient?: () => PrismaClient;
  createSupabaseAdminClient?: (supabaseUrl: string, serviceKey: string) => any;
  provisionPlayer?: typeof ensurePlayerForAuthUser;
};

export const createRegisterPasswordHandler = (
  dependencies: RegisterPasswordDependencies = {},
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

    const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceKey);

    const normalizedEmail = email.trim().toLowerCase();

    let createdUserId: string | null = null;

    try {
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

      createdUserId = data.user.id;

      await provisionPlayer(prisma, {
        supabaseId: data.user.id,
        email: normalizedEmail,
        name,
        playerId,
        preferredLoginMethod: "password",
      });

      return {
        success: true,
        requiresEmailConfirmation: false,
      };
    } catch (error) {
      if (createdUserId) {
        await supabaseAdmin.auth.admin
          .deleteUser(createdUserId)
          .catch(() => null);
      }

      throw error;
    } finally {
      await prisma.$disconnect();
    }
  });
};

export default createRegisterPasswordHandler();
