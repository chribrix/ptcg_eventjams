import { PrismaClient } from "@prisma/client";
import { createSupabaseServerClient } from "~/server/util/createSupabaseServerClient";
import { z } from "zod";
import {
  logValidationError,
  logDatabaseError,
} from "~/server/util/errorLogger";

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
  fetchImpl?: typeof fetch;
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
  const fetchImpl = dependencies.fetchImpl || fetch;

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

        const adminApi = supabaseAdmin.auth.admin as {
          getUserByEmail?: (email: string) => Promise<{
            data: {
              user: {
                id: string;
                email?: string;
                user_metadata?: unknown;
              } | null;
            };
            error: { message?: string } | null;
          }>;
        };

        if (typeof adminApi.getUserByEmail === "function") {
          const { data, error } = await adminApi.getUserByEmail(targetEmail);
          if (error || !data.user) return null;
          return data.user;
        }

        // Fallback: use filter param (works for smaller user bases)
        const fallbackRes = await fetchImpl(
          `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(targetEmail)}`,
          {
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
            },
          },
        );

        if (!fallbackRes.ok) return null;

        const fallbackData = await fallbackRes.json();
        const users = fallbackData?.users ?? [];
        return (
          users.find(
            (user: any) => user.email?.toLowerCase() === targetEmail,
          ) || null
        );
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
