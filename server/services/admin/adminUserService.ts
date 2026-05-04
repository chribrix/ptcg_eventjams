import crypto from "crypto";
import { createSupabaseServerClient } from "~/server/util/createSupabaseServerClient";
import prisma from "~/lib/prisma";
import { z } from "zod";
import { hasAdminRole } from "~/server/util/adminAccess";
import { logAdminAction } from "~/server/services/admin/adminAuditService";
import { applyAdminRoleMetadata } from "~/server/services/admin/adminRoleMetadata";
import {
  clearAdminPasswordResetState,
  markAdminPasswordResetEnabled,
} from "~/server/util/passwordSetupState";

type SupabaseAdminUser = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
  identities?: Array<{ provider?: string | null }> | null;
  banned_until?: string | null;
};

const listAdminUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(["admin", "user", "unlinked"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function getSupabaseConfig() {
  const config = useRuntimeConfig();

  if (!config.public.supabaseUrl || !config.supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Supabase admin configuration missing",
    });
  }

  return {
    supabaseUrl: config.public.supabaseUrl,
    supabaseAnonKey: config.public.supabaseAnonKey,
    supabaseServiceKey: config.supabaseServiceKey,
  };
}

function createSupabaseAdminClient() {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig();

  return createSupabaseServerClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createSupabasePublicAuthClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  if (!supabaseAnonKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Supabase public auth configuration missing",
    });
  }

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getUserProvider(user: SupabaseAdminUser): string | null {
  const providerFromIdentity = user.identities?.[0]?.provider;
  const providerFromMetadata =
    typeof user.app_metadata?.provider === "string"
      ? user.app_metadata.provider
      : null;

  return providerFromIdentity || providerFromMetadata || null;
}

function getUserHasPassword(user: SupabaseAdminUser): boolean {
  return user.app_metadata?.has_password === true;
}

function serializeAdminUser(
  user: SupabaseAdminUser,
  linkedPlayer: {
    id: string;
    playerId: string;
    name: string;
    email: string | null;
  } | null,
) {
  return {
    id: user.id,
    email: user.email || null,
    createdAt: user.created_at || null,
    lastSignInAt: user.last_sign_in_at || null,
    isAdmin: hasAdminRole(user),
    hasPassword: getUserHasPassword(user),
    provider: getUserProvider(user),
    linkedPlayer,
  };
}

async function getSupabaseAdminUser(userId: string) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (error || !data?.user) {
    throw createError({
      statusCode: 404,
      statusMessage: "Auth user not found",
    });
  }

  return data.user as SupabaseAdminUser;
}

async function getLinkedPlayer(userId: string) {
  return prisma.player.findUnique({
    where: { supabaseId: userId },
    select: {
      id: true,
      playerId: true,
      name: true,
      email: true,
      preferredLoginMethod: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function listAdminUsers(rawQuery: unknown) {
  const query = listAdminUsersQuerySchema.parse(rawQuery);
  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    throw createError({
      statusCode: 502,
      statusMessage: "Failed to load auth users",
    });
  }

  const authUsers = ((data?.users || []) as SupabaseAdminUser[]).sort(
    (left, right) => {
      return (right.created_at || "").localeCompare(left.created_at || "");
    },
  );

  const players = await prisma.player.findMany({
    select: {
      id: true,
      supabaseId: true,
      playerId: true,
      name: true,
      email: true,
    },
  });

  const playersBySupabaseId = new Map(
    players
      .filter((player) => Boolean(player.supabaseId))
      .map((player) => [
        player.supabaseId as string,
        {
          id: player.id,
          playerId: player.playerId,
          name: player.name,
          email: player.email || null,
        },
      ]),
  );

  const normalizedSearch = query.search?.trim().toLowerCase();

  const filteredItems = authUsers
    .map((user) =>
      serializeAdminUser(user, playersBySupabaseId.get(user.id) || null),
    )
    .filter((user) => {
      if (query.role === "admin" && !user.isAdmin) {
        return false;
      }

      if (query.role === "user" && user.isAdmin) {
        return false;
      }

      if (query.role === "unlinked" && user.linkedPlayer) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        user.email,
        user.provider,
        user.linkedPlayer?.name,
        user.linkedPlayer?.email,
        user.linkedPlayer?.playerId,
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    });

  const start = (query.page - 1) * query.limit;
  const items = filteredItems.slice(start, start + query.limit);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: filteredItems.length,
      pages: Math.max(1, Math.ceil(filteredItems.length / query.limit)),
    },
  };
}

export async function getAdminUserDetail(userId: string) {
  const [user, linkedPlayer] = await Promise.all([
    getSupabaseAdminUser(userId),
    getLinkedPlayer(userId),
  ]);

  return {
    user: {
      ...serializeAdminUser(
        user,
        linkedPlayer
          ? {
              id: linkedPlayer.id,
              playerId: linkedPlayer.playerId,
              name: linkedPlayer.name,
              email: linkedPlayer.email || null,
            }
          : null,
      ),
      metadata: {
        appMetadata: user.app_metadata || {},
        userMetadata: user.user_metadata || {},
        bannedUntil: user.banned_until || null,
      },
      linkedPlayerDetails: linkedPlayer,
    },
  };
}

export async function updateAdminUserRole(input: {
  actorUserId: string;
  targetUserId: string;
  isAdmin: boolean;
}) {
  if (input.actorUserId === input.targetUserId && !input.isAdmin) {
    throw createError({
      statusCode: 400,
      statusMessage: "You cannot remove your own admin access",
    });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const targetUser = await getSupabaseAdminUser(input.targetUserId);
  const nextMetadata = applyAdminRoleMetadata(
    targetUser.app_metadata || {},
    input.isAdmin,
  );

  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    input.targetUserId,
    {
      app_metadata: nextMetadata,
    },
  );

  if (error) {
    throw createError({
      statusCode: 502,
      statusMessage: "Failed to update admin role",
    });
  }

  await logAdminAction({
    actorUserId: input.actorUserId,
    targetUserId: input.targetUserId,
    actionType: input.isAdmin ? "admin_role_granted" : "admin_role_removed",
    metadata: {
      isAdmin: input.isAdmin,
    },
  });

  return getAdminUserDetail(input.targetUserId);
}

export async function sendAdminPasswordReset(input: {
  actorUserId: string;
  targetUserId: string;
  redirectTo?: string;
  password?: string;
}) {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig();
  const passwordPepper = useRuntimeConfig().passwordPepper;
  const supabaseAdmin = createSupabaseAdminClient();
  const user = await getSupabaseAdminUser(input.targetUserId);

  if (!user.email) {
    throw createError({
      statusCode: 400,
      statusMessage: "Auth user has no email address",
    });
  }

  if (input.password) {
    const pepperedPassword = passwordPepper
      ? crypto
          .createHmac("sha256", passwordPepper)
          .update(input.password)
          .digest("hex")
      : input.password;

    const passwordResponse = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${input.targetUserId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ password: pepperedPassword }),
      },
    );

    if (!passwordResponse.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: "Failed to set password",
      });
    }

    const metadataResponse = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${input.targetUserId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          email_confirm: true,
          app_metadata: {
            ...clearAdminPasswordResetState(user.app_metadata),
            has_password: true,
            pending_password_setup: null,
          },
        }),
      },
    );

    if (!metadataResponse.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: "Failed to update password metadata",
      });
    }

    await prisma.$executeRaw`
      UPDATE public.players
      SET preferred_login_method = 'password'
      WHERE supabase_id = ${input.targetUserId}
         OR LOWER(email) = LOWER(${user.email})
    `;

    await logAdminAction({
      actorUserId: input.actorUserId,
      targetUserId: input.targetUserId,
      actionType: "admin_password_set_directly",
      metadata: {
        redirectTo: input.redirectTo || null,
      },
    });

    return {
      success: true,
      message: "Password set directly",
    };
  }

  const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
    input.targetUserId,
    {
      app_metadata: markAdminPasswordResetEnabled(user.app_metadata),
    },
  );

  if (metadataError) {
    throw createError({
      statusCode: 502,
      statusMessage: "Failed to prepare password reset",
    });
  }

  const authClient = createSupabasePublicAuthClient();
  const { error } = await authClient.auth.resetPasswordForEmail(user.email, {
    redirectTo: input.redirectTo,
  });

  if (error) {
    throw createError({
      statusCode: 502,
      statusMessage: "Failed to send password reset email",
    });
  }

  await logAdminAction({
    actorUserId: input.actorUserId,
    targetUserId: input.targetUserId,
    actionType: "admin_password_reset_requested",
    metadata: {
      redirectTo: input.redirectTo || null,
      adminResetBypassEnabled: true,
    },
  });

  return {
    success: true,
    message: "Password reset email sent",
  };
}
