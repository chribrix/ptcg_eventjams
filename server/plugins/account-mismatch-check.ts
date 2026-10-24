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
import { safeDiagnosticRecord } from "~/server/util/safeDiagnostics";

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
          data: safeDiagnosticRecord({ errorType: "account_mismatch_auth_without_player", userId: authUser.id }),
        });
      } else if (!hasLinkedPlayer && emailMatches.length > 0) {
        authWithEmailOnlyMatchCount++;

        await prisma.errorLog.create({
          data: safeDiagnosticRecord({ errorType: "account_mismatch_email_only", userId: authUser.id }),
        });
      }
    }

    // Check 2: Players without supabaseId
    const playersWithoutSupabaseId = players.filter((p) => !p.supabaseId);

    for (const player of playersWithoutSupabaseId) {
      await prisma.errorLog.create({
        data: safeDiagnosticRecord({ errorType: "account_mismatch_player_without_auth", userId: player.id }),
      });
    }

    // Check 3: Duplicate player emails
    for (const [email, matchingPlayers] of playersByEmail.entries()) {
      if (matchingPlayers.length < 2) {
        continue;
      }

      duplicatePlayerEmailCount++;
      await prisma.errorLog.create({
        data: safeDiagnosticRecord({ errorType: "account_mismatch_duplicate_email" }),
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
        data: safeDiagnosticRecord({
          errorType: authUser ? "account_mismatch_legacy_admin_role" : "account_mismatch_legacy_admin_missing",
          userId: adminRow.id,
        }),
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
