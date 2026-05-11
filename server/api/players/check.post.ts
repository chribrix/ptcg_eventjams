import { PrismaClient } from "@prisma/client";
import { createSupabaseServerClient } from "~/server/util/createSupabaseServerClient";
import { z } from "zod";
import {
  logValidationError,
  logDatabaseError,
} from "~/server/util/errorLogger";
import { getSupabaseAdminUserByEmail } from "~/server/util/supabaseAdminUserLookup";

const checkPlayerSchema = z
  .object({
    email: z.string().email(),
  })
  .refine((data) => Boolean(data.email), {
    message: "Email is required",
  });

type CheckPlayerDependencies = {
  createPrismaClient?: () => PrismaClient;
  getRuntimeConfig?: typeof useRuntimeConfig;
  createSupabaseAdminClient?: (supabaseUrl: string, serviceKey: string) => any;
};

export const createCheckPlayerHandler = (
  dependencies: CheckPlayerDependencies = {},
) => {
  const prisma = dependencies.createPrismaClient?.() || new PrismaClient();
  const getRuntimeConfig = dependencies.getRuntimeConfig || useRuntimeConfig;
  const createSupabaseAdminClient =
    dependencies.createSupabaseAdminClient ||
    ((supabaseUrl: string, serviceKey: string) =>
      createSupabaseServerClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      }));

  return defineEventHandler(async (event) => {
    try {
      const body = await readBody(event);
      const validation = checkPlayerSchema.safeParse(body);

      if (!validation.success) {
        await logValidationError(event, validation.error, "player_check");
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid request data",
        });
      }

      const { email } = validation.data;

      let player = null;
      let legacyPlayerCandidate = null;
      const normalizedEmail = email?.toLowerCase();

      const getSupabaseUserByEmail = async (targetEmail: string) => {
        const config = getRuntimeConfig();
        const supabaseUrl = config.public.supabaseUrl;
        const serviceKey = config.supabaseServiceKey;

        if (!supabaseUrl || !serviceKey) return null;

        const supabaseAdmin = createSupabaseAdminClient(
          supabaseUrl,
          serviceKey,
        );

        try {
          return await getSupabaseAdminUserByEmail<{
            id: string;
            email?: string;
            user_metadata?: unknown;
          }>(supabaseAdmin, targetEmail);
        } catch {
          return null;
        }
      };

      let authUser: { id: string; user_metadata?: unknown } | null = null;
      let supabaseUserExists = false;

      if (normalizedEmail) {
        try {
          authUser = await getSupabaseUserByEmail(normalizedEmail);
          supabaseUserExists = !!authUser;

          if (supabaseUserExists && !process.dev) {
            // no-op in production logs
          }
        } catch {}
      }

      // Resolve the canonical player only by auth-linked supabaseId.
      const authId = authUser?.id;
      if (authId) {
        player = await prisma.player.findUnique({
          where: {
            supabaseId: authId,
          },
        });
      }

      // Email-only player matches are legacy ambiguity and must not be auto-linked.
      if (!player && normalizedEmail && !supabaseUserExists) {
        legacyPlayerCandidate = await prisma.player.findFirst({
          where: {
            email: normalizedEmail,
          },
        });
      }

      let preferredLoginMethod: "password" | "otp" = "password";
      if (player) {
        const result = await prisma.$queryRaw<
          Array<{ preferred_login_method: string | null }>
        >`SELECT preferred_login_method FROM public.players WHERE id = ${player.id} LIMIT 1`;
        preferredLoginMethod =
          result[0]?.preferred_login_method === "magiclink" ||
          result[0]?.preferred_login_method === "otp"
            ? "otp"
            : "password";
      }

      return {
        exists: !!player || supabaseUserExists,
        authExists: supabaseUserExists,
        player: player
          ? {
              id: player.id,
              playerId: player.playerId,
              name: player.name,
              email: player.email,
              preferredLoginMethod,
            }
          : null,
        // Indicate if user exists in auth but not in players table
        authOnly: !player && supabaseUserExists,
        legacyPlayerOnly:
          !player && !supabaseUserExists && !!legacyPlayerCandidate,
      };
    } catch (error) {
      await logDatabaseError(event, error, "player_check");
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to check player existence",
      });
    } finally {
      await prisma.$disconnect();
    }
  });
};

export default createCheckPlayerHandler();
