import { PrismaClient } from "@prisma/client";
import { createSupabaseServerClient } from "~/server/util/createSupabaseServerClient";
import {
  ensurePlayerForAuthUser,
  getProvisionPlayerInputFromAuthUser,
  normalizePreferredLoginMethod,
} from "~/server/util/playerProvisioning";
import { resolveOptionalAuthUser } from "~/server/services/auth/authService";

// Ensures the logged-in auth user has a canonical local Player row.
//
// This endpoint is used by passwordless completion flows so the client no longer
// creates Player rows directly as a repair step.

type EnsurePlayerDependencies = {
  getRuntimeConfig?: typeof useRuntimeConfig;
  createPrismaClient?: () => PrismaClient;
  createSupabaseAdminClient?: (supabaseUrl: string, serviceKey: string) => any;
  getServerSupabaseUser?: (event: any) => Promise<any>;
  provisionPlayer?: typeof ensurePlayerForAuthUser;
};

export const createEnsurePlayerHandler = (
  dependencies: EnsurePlayerDependencies = {},
) => {
  const getRuntimeConfig = dependencies.getRuntimeConfig || useRuntimeConfig;
  const createPrismaClient =
    dependencies.createPrismaClient || (() => new PrismaClient());
  const createSupabaseAdminClient =
    dependencies.createSupabaseAdminClient ||
    ((supabaseUrl: string, serviceKey: string) =>
      createSupabaseServerClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      }));
  const getServerUser =
    dependencies.getServerSupabaseUser || resolveOptionalAuthUser;
  const provisionPlayer =
    dependencies.provisionPlayer || ensurePlayerForAuthUser;
  const prisma = createPrismaClient();

  return defineEventHandler(async (event) => {
    const config = getRuntimeConfig();
    const supabaseUrl = config.public.supabaseUrl;
    const serviceKey = config.supabaseServiceKey;

    if (!supabaseUrl || !serviceKey) {
      throw createError({
        statusCode: 500,
        statusMessage: "Supabase admin configuration missing",
      });
    }

    const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceKey);

    const user = await getServerUser(event);

    if (!user) {
      throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }

    const body = await readBody<{
      preferredLoginMethod?: "password" | "otp";
    }>(event).catch(() => ({}));
    const provisioningInput = getProvisionPlayerInputFromAuthUser(user, {
      preferredLoginMethod: normalizePreferredLoginMethod(
        body.preferredLoginMethod || "otp",
      ),
    });

    if (!provisioningInput) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "No registration metadata available for player provisioning",
      });
    }

    const player = await provisionPlayer(prisma, provisioningInput);

    return {
      success: true,
      player: {
        id: player.id,
        playerId: player.playerId,
        email: player.email,
      },
    };
  });
};

export default createEnsurePlayerHandler();
