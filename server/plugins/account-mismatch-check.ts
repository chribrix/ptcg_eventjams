/**
 * Server Plugin: Account Mismatch Detection
 *
 * Runs on server startup to detect:
 * 1. Supabase auth users without linked player records
 * 2. Supabase auth users with only legacy email-based player matches
 * 3. Player records without supabaseId
 * 4. Duplicate player emails
 * 5. Legacy admin rows that no longer match Supabase admin metadata
 *
 * Logs mismatches to error logs with tag "account_mismatch"
 */

import { PrismaClient } from "@prisma/client";
import { createSupabaseServerClient } from "~/server/util/createSupabaseServerClient";

const hasSupabaseAdminRole = (
  appMetadata: Record<string, unknown> | null | undefined,
) => {
  if (!appMetadata) {
    return false;
  }

  const roleValues = [
    appMetadata.role,
    appMetadata.user_role,
    appMetadata.roles,
  ];

  return (
    appMetadata.is_admin === true ||
    roleValues.some((value) => {
      if (typeof value === "string") {
        return value.trim().toLowerCase() === "admin";
      }

      if (Array.isArray(value)) {
        return value.some(
          (entry) =>
            typeof entry === "string" && entry.trim().toLowerCase() === "admin",
        );
      }

      return false;
    })
  );
};

export default defineNitroPlugin(async (nitroApp) => {
  const config = useRuntimeConfig();

  const prisma = new PrismaClient();

  try {
    // Create Supabase client with service role key
    const supabaseUrl = config.public.supabaseUrl;
    const supabaseServiceKey = config.supabaseServiceKey;

    if (!supabaseServiceKey) {
      return;
    }

    const supabase = createSupabaseServerClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch all Supabase auth users
    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      return;
    }

    const authUsers = authData?.users || [];

    // Fetch all players and legacy admin rows
    const [players, legacyAdminRows] = await Promise.all([
      prisma.player.findMany({
        select: {
          id: true,
          supabaseId: true,
          email: true,
          name: true,
          playerId: true,
        },
      }),
      prisma.adminUser.findMany({
        select: {
          id: true,
          email: true,
          name: true,
        },
      }),
    ]);

    const playersBySupabaseId = new Set(
      players.flatMap((player) =>
        player.supabaseId ? [player.supabaseId] : [],
      ),
    );
    const playersByEmail = new Map<string, typeof players>();

    for (const player of players) {
      if (!player.email) {
        continue;
      }

      const normalizedEmail = player.email.toLowerCase();
      const existing = playersByEmail.get(normalizedEmail) || [];
      existing.push(player);
      playersByEmail.set(normalizedEmail, existing);
    }

    const authUsersById = new Map(
      authUsers.map((authUser) => [authUser.id, authUser]),
    );

    let authWithoutPlayerCount = 0;
    let authWithEmailOnlyMatchCount = 0;
    let duplicatePlayerEmailCount = 0;
    let legacyAdminMismatchCount = 0;

    for (const authUser of authUsers) {
      const hasLinkedPlayer = playersBySupabaseId.has(authUser.id);
      const emailMatches = authUser.email
        ? playersByEmail.get(authUser.email.toLowerCase()) || []
        : [];

      if (!hasLinkedPlayer && emailMatches.length === 0) {
        authWithoutPlayerCount++;

        await prisma.errorLog.create({
          data: {
            errorType: "account_mismatch",
            errorMessage: `Supabase auth user exists without linked player record`,
            userEmail: authUser.email || null,
            userId: authUser.id,
            metadata: {
              supabaseId: authUser.id,
              email: authUser.email || null,
              createdAt: authUser.created_at,
              appMetadata: authUser.app_metadata,
              userMetadata: authUser.user_metadata,
              type: "auth_without_player",
            },
          },
        });
      } else if (!hasLinkedPlayer && emailMatches.length > 0) {
        authWithEmailOnlyMatchCount++;

        await prisma.errorLog.create({
          data: {
            errorType: "account_mismatch",
            errorMessage:
              "Supabase auth user only has legacy email-based player match candidates",
            userEmail: authUser.email || null,
            userId: authUser.id,
            metadata: {
              supabaseId: authUser.id,
              email: authUser.email || null,
              type: "auth_email_only_match_candidate",
              matchingPlayers: emailMatches.map((player) => ({
                id: player.id,
                playerId: player.playerId,
                name: player.name,
                email: player.email,
                supabaseId: player.supabaseId,
              })),
            },
          },
        });
      }
    }

    // Check 2: Players without supabaseId
    const playersWithoutSupabaseId = players.filter((p) => !p.supabaseId);

    for (const player of playersWithoutSupabaseId) {
      await prisma.errorLog.create({
        data: {
          errorType: "account_mismatch",
          errorMessage: `Player record exists without Supabase ID`,
          userEmail: player.email,
          userId: null,
          metadata: {
            playerId: player.playerId,
            playerDbId: player.id,
            name: player.name,
            email: player.email,
            type: "player_without_supabase_id",
          },
        },
      });
    }

    // Check 3: Duplicate player emails
    for (const [email, matchingPlayers] of playersByEmail.entries()) {
      if (matchingPlayers.length < 2) {
        continue;
      }

      duplicatePlayerEmailCount++;
      await prisma.errorLog.create({
        data: {
          errorType: "account_mismatch",
          errorMessage: "Multiple player records share the same email",
          userEmail: email,
          userId: null,
          metadata: {
            type: "duplicate_player_email",
            email,
            players: matchingPlayers.map((player) => ({
              id: player.id,
              playerId: player.playerId,
              name: player.name,
              supabaseId: player.supabaseId,
            })),
          },
        },
      });
    }

    // Check 4: Legacy admin rows that no longer match Supabase metadata authority
    for (const adminRow of legacyAdminRows) {
      const authUser = authUsersById.get(adminRow.id);
      const hasSupabaseAdmin = authUser
        ? hasSupabaseAdminRole(
            (authUser.app_metadata || {}) as Record<string, unknown>,
          )
        : false;

      if (hasSupabaseAdmin) {
        continue;
      }

      legacyAdminMismatchCount++;
      await prisma.errorLog.create({
        data: {
          errorType: "account_mismatch",
          errorMessage: authUser
            ? "Legacy admin row exists without matching Supabase admin metadata"
            : "Legacy admin row exists without matching auth user",
          userEmail: adminRow.email,
          userId: adminRow.id,
          metadata: {
            type: authUser
              ? "legacy_admin_without_supabase_role"
              : "legacy_admin_without_auth_user",
            adminRow,
            authUser: authUser
              ? {
                  id: authUser.id,
                  email: authUser.email,
                  appMetadata: authUser.app_metadata,
                }
              : null,
          },
        },
      });
    }

    // Summary
    const totalMismatches =
      authWithoutPlayerCount +
      authWithEmailOnlyMatchCount +
      playersWithoutSupabaseId.length +
      duplicatePlayerEmailCount +
      legacyAdminMismatchCount;

    if (totalMismatches > 0) {
      // mismatches are already persisted in error logs
    } else {
      // no-op
    }
  } catch {
  } finally {
    await prisma.$disconnect();
  }
});
