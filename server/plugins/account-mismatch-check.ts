/**
 * Server Plugin: Account Mismatch Detection
 *
 * Runs on server startup to detect:
 * 1. Supabase auth users without linked player records
 * 2. Player records without supabaseId
 *
 * Logs mismatches to error logs with tag "account_mismatch"
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

export default defineNitroPlugin(async (nitroApp) => {
  const config = useRuntimeConfig();

  console.log("🔍 Checking for account mismatches...");

  const prisma = new PrismaClient();

  try {
    // Create Supabase client with service role key
    const supabaseUrl = config.public.supabaseUrl;
    const supabaseServiceKey = config.supabaseServiceKey;

    if (!supabaseServiceKey) {
      console.log(
        "   ⚠️  Supabase service key not configured, skipping mismatch check"
      );
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch all Supabase auth users
    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.error(
        "❌ Failed to fetch Supabase auth users:",
        authError.message
      );
      return;
    }

    const authUsers = authData?.users || [];
    console.log(`   Found ${authUsers.length} Supabase auth users`);

    // Fetch all players
    const players = await prisma.player.findMany({
      select: {
        id: true,
        supabaseId: true,
        email: true,
        name: true,
        playerId: true,
      },
    });
    console.log(`   Found ${players.length} player records`);

    // Check 1: Auth users without player records
    const playersWithSupabaseId = new Set(
      players.filter((p) => p.supabaseId).map((p) => p.supabaseId)
    );
    const playerEmailsMap = new Map(
      players.map((p) => [p.email.toLowerCase(), p])
    );

    let authWithoutPlayerCount = 0;

    for (const authUser of authUsers) {
      if (!authUser.email) continue;

      // Check if auth user has a linked player (by supabaseId or email)
      const hasLinkedPlayer = playersWithSupabaseId.has(authUser.id);
      const hasEmailMatch = playerEmailsMap.has(authUser.email.toLowerCase());

      if (!hasLinkedPlayer && !hasEmailMatch) {
        authWithoutPlayerCount++;

        // Log to error logs
        await prisma.errorLog.create({
          data: {
            errorType: "account_mismatch",
            errorMessage: `Supabase auth user exists without player record`,
            userEmail: authUser.email,
            userId: authUser.id,
            metadata: {
              supabaseId: authUser.id,
              email: authUser.email,
              createdAt: authUser.created_at,
              userMetadata: authUser.user_metadata,
              type: "auth_without_player",
            },
          },
        });

        console.log(
          `   ⚠️  Auth user without player: ${authUser.email} (${authUser.id})`
        );
      }
    }

    // Check 2: Players without supabaseId
    const playersWithoutSupabaseId = players.filter((p) => !p.supabaseId);

    for (const player of playersWithoutSupabaseId) {
      // Log to error logs
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

      console.log(
        `   ⚠️  Player without supabaseId: ${player.name} (${player.email})`
      );
    }

    // Summary
    const totalMismatches =
      authWithoutPlayerCount + playersWithoutSupabaseId.length;

    if (totalMismatches > 0) {
      console.log("\n" + "=".repeat(60));
      console.log("⚠️  Account Mismatch Summary:");
      console.log("=".repeat(60));
      console.log(
        `   Auth users without player records: ${authWithoutPlayerCount}`
      );
      console.log(
        `   Players without supabaseId: ${playersWithoutSupabaseId.length}`
      );
      console.log(`   Total mismatches: ${totalMismatches}`);
      console.log(
        `   View in admin panel: /admin/logs (filter: account_mismatch)`
      );
      console.log("=".repeat(60) + "\n");
    } else {
      console.log("✅ No account mismatches found\n");
    }
  } catch (error: any) {
    console.error("❌ Error checking account mismatches:", error.message);
  } finally {
    await prisma.$disconnect();
  }
});
