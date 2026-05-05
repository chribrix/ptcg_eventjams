import type { Player } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";
import { createError } from "h3";
import type { H3Event } from "h3";
import { logError } from "~/server/util/errorLogger";
import { clearSupabaseAuthCookies } from "~/server/util/supabaseAuthCookies";

type PlayerLookupClient = {
  player: {
    findUnique: (args: any) => Promise<AuthenticatedPlayer | null>;
    findFirst?: (args: any) => Promise<AuthenticatedPlayer | null>;
    update?: (args: any) => Promise<AuthenticatedPlayer | null>;
    create?: (args: any) => Promise<AuthenticatedPlayer | null>;
  };
};

type SupabaseUserLike = {
  id: string;
  email?: string | null;
};

export type AuthenticatedPlayer = Pick<
  Player,
  "id" | "playerId" | "supabaseId" | "name" | "email"
>;

export type AuthenticatedIdentity =
  | {
      source: "impersonation";
      playerId: string;
    }
  | {
      source: "supabase";
      supabaseUserId: string;
      email: string | null;
    };

export const playerIdentitySelect = {
  id: true,
  playerId: true,
  supabaseId: true,
  name: true,
  email: true,
} as const;

export const resolveAuthenticatedIdentityFactory = (
  getSupabaseUser: (
    event: H3Event,
  ) => Promise<SupabaseUserLike | null> = serverSupabaseUser,
) => {
  return async (event: H3Event): Promise<AuthenticatedIdentity> => {
    const impersonatedPlayerId = event.context.impersonatedUserId;

    if (impersonatedPlayerId) {
      return {
        source: "impersonation",
        playerId: impersonatedPlayerId,
      };
    }

    let supabaseUser: SupabaseUserLike | null = null;

    try {
      supabaseUser = await getSupabaseUser(event);
    } catch {
      clearSupabaseAuthCookies(event);
      supabaseUser = null;
    }

    if (!supabaseUser?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    return {
      source: "supabase",
      supabaseUserId: supabaseUser.id,
      email: supabaseUser.email ?? null,
    };
  };
};

export const findPlayerForAuthenticatedIdentity = async (
  prisma: PlayerLookupClient,
  identity: AuthenticatedIdentity,
): Promise<AuthenticatedPlayer | null> => {
  if (identity.source === "impersonation") {
    return prisma.player.findUnique({
      where: { playerId: identity.playerId },
      select: playerIdentitySelect,
    });
  }

  return prisma.player.findUnique({
    where: { supabaseId: identity.supabaseUserId },
    select: playerIdentitySelect,
  });
};

export const logMissingAuthenticatedPlayerLink = async (
  event: H3Event,
  identity: AuthenticatedIdentity,
): Promise<void> => {
  await logError(
    event,
    new Error("Authenticated identity has no linked player"),
    "auth_identity_missing_player_link",
    {
      identitySource: identity.source,
      impersonatedPlayerId:
        identity.source === "impersonation" ? identity.playerId : undefined,
      supabaseUserId:
        identity.source === "supabase" ? identity.supabaseUserId : undefined,
      authEmail: identity.source === "supabase" ? identity.email : undefined,
    },
  );
};

export const resolveAuthenticatedPlayerFactory = (
  prisma: PlayerLookupClient,
  getAuthenticatedIdentity = resolveAuthenticatedIdentityFactory(),
  onMissingPlayer: (
    event: H3Event,
    identity: AuthenticatedIdentity,
  ) => Promise<void> = logMissingAuthenticatedPlayerLink,
) => {
  const provisionMissingSupabasePlayer = async (
    identity: Extract<AuthenticatedIdentity, { source: "supabase" }>,
  ): Promise<AuthenticatedPlayer | null> => {
    const email = identity.email?.trim().toLowerCase() || null;
    const playerClient = (prisma as any).player;

    if (!playerClient) {
      return null;
    }

    // 1) Reuse existing player by email and bind/overwrite supabase link.
    if (email && typeof playerClient.findFirst === "function") {
      const existingByEmail = await playerClient.findFirst({
        where: { email },
        select: playerIdentitySelect,
      });

      if (existingByEmail && typeof playerClient.update === "function") {
        return playerClient.update({
          where: { id: existingByEmail.id },
          data: {
            supabaseId: identity.supabaseUserId,
            email,
          },
          select: playerIdentitySelect,
        });
      }
    }

    // 2) If none exists, create a minimal canonical player.
    if (typeof playerClient.create === "function") {
      const fallbackName = email
        ? email.split("@")[0]?.trim() || "Player"
        : "Player";

      return playerClient.create({
        data: {
          supabaseId: identity.supabaseUserId,
          email,
          name: fallbackName,
          // Keep playerId optional; it can be provided later by profile/registration flows.
          playerId: null,
          birthDate: new Date("2000-01-01T00:00:00.000Z"),
        },
        select: playerIdentitySelect,
      });
    }

    return null;
  };

  return async (
    event: H3Event,
    options: { allowMissing?: boolean } = {},
  ): Promise<AuthenticatedPlayer | null> => {
    const identity = await getAuthenticatedIdentity(event);
    let player = await findPlayerForAuthenticatedIdentity(prisma, identity);

    if (!player && identity.source === "supabase") {
      player = await provisionMissingSupabasePlayer(identity);
    }

    if (
      !player &&
      (!options.allowMissing || identity.source === "impersonation")
    ) {
      await onMissingPlayer(event, identity);
    }

    if (!player && !options.allowMissing) {
      throw createError({
        statusCode: 404,
        statusMessage:
          identity.source === "impersonation"
            ? "Impersonated player not found"
            : "Player not found",
      });
    }

    return player;
  };
};
