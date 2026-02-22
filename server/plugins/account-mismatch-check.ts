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

  const prisma = new PrismaClient();

  try {
    // Create Supabase client with service role key
    const supabaseUrl = config.public.supabaseUrl;
    const supabaseServiceKey = config.supabaseServiceKey;

    if (!supabaseServiceKey) {
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
      return;
    }

    const authUsers = authData?.users || [];

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

    // Check 1: Auth users without player records
    const playersWithSupabaseId = new Set(
      players.filter((p) => p.supabaseId).map((p) => p.supabaseId),
    );
    const playerEmailsMap = new Map(
      players.map((p) => [p.email.toLowerCase(), p]),
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
    }

    // Summary
    const totalMismatches =
      authWithoutPlayerCount + playersWithoutSupabaseId.length;

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
