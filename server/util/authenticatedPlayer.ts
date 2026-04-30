import type { Player } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";
import { createError } from "h3";
import type { H3Event } from "h3";
import { logError } from "~/server/util/errorLogger";

type PlayerLookupClient = {
  player: {
    findUnique: (args: any) => Promise<AuthenticatedPlayer | null>;
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
  getSupabaseUser: (event: H3Event) => Promise<SupabaseUserLike | null> =
    serverSupabaseUser,
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
  return async (
    event: H3Event,
    options: { allowMissing?: boolean } = {},
  ): Promise<AuthenticatedPlayer | null> => {
    const identity = await getAuthenticatedIdentity(event);
    const player = await findPlayerForAuthenticatedIdentity(prisma, identity);

    if (!player) {
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
