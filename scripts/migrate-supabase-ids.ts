/**
 * Migration Script: Populate supabaseId for existing players
 *
 * This script matches existing players with Supabase auth users by email
 * and populates the supabaseId field in the players table.
 *
 * Run with: npx tsx scripts/migrate-supabase-ids.ts
 * Dry run: npx tsx scripts/migrate-supabase-ids.ts --dry-run
 * Run once: npx tsx scripts/migrate-supabase-ids.ts --once
 *
 * Required environment variables:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (get from Supabase Dashboard > Settings > API)
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load .env file
dotenv.config();

const prisma = new PrismaClient();

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables:");
  console.error("   SUPABASE_URL:", !!supabaseUrl);
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey);
  console.error("\n💡 Get the service role key from:");
  console.error(
    "   Supabase Dashboard > Settings > API > Service Role Key (secret)"
  );
  console.error("\n   Then add it to .env:");
  console.error('   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const isDryRun = process.argv.includes("--dry-run");
const runOnce = process.argv.includes("--once");
const migrationMarkerId = "migration:migrate-supabase-ids:v1";

async function fetchAllAuthUsers() {
  const allUsers: Array<{ id: string; email?: string | null }> = [];
  const pageSize = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });

    if (error) {
      throw error;
    }

    const users = data?.users || [];
    allUsers.push(...users);

    if (users.length < pageSize) {
      break;
    }

    page += 1;
  }

  return allUsers;
}

async function migrateSupabaseIds() {
  console.log("🔄 Starting Supabase ID migration...\n");
  if (isDryRun) {
    console.log("🧪 Dry run mode enabled. No database changes will be written.\n");
  }

  if (runOnce) {
    console.log(`🔒 Once mode enabled with marker: ${migrationMarkerId}\n`);
  }

  try {
    if (runOnce) {
      const existingMarker = await prisma.metaState.findUnique({
        where: { id: migrationMarkerId },
      });

      if (existingMarker) {
        console.log("✅ Migration marker already present. Skipping run.");
        return;
      }
    }

    // First, fetch all Supabase auth users
    console.log("📥 Fetching all Supabase auth users...");
    const authUsers = await fetchAllAuthUsers();
    console.log(`   Found ${authUsers.length} auth users\n`);

    // Create a map of email -> supabaseId for quick lookup
    const emailToSupabaseId = new Map<string, string>();
    authUsers.forEach((user) => {
      if (user.email) {
        emailToSupabaseId.set(user.email.toLowerCase(), user.id);
      }
    });

    // Fetch all players without supabaseId
    const playersWithoutSupabaseId = await prisma.player.findMany({
      where: {
        supabaseId: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        playerId: true,
      },
    });

    console.log(
      `📊 Found ${playersWithoutSupabaseId.length} players without supabaseId\n`
    );

    if (playersWithoutSupabaseId.length === 0) {
      console.log("✅ All players already have supabaseId assigned!");
      return;
    }

    let successCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    let missingEmailCount = 0;
    const notFoundPlayers: typeof playersWithoutSupabaseId = [];
    const missingEmailPlayers: typeof playersWithoutSupabaseId = [];
    const discardedPlayers: Array<{ player: any; reason: string }> = [];

    // Group players by email to detect duplicates
    const playersByEmail = new Map<string, typeof playersWithoutSupabaseId>();
    for (const player of playersWithoutSupabaseId) {
      if (!player.email) {
        missingEmailCount++;
        missingEmailPlayers.push(player);
        continue;
      }

      const email = player.email.toLowerCase();
      if (!playersByEmail.has(email)) {
        playersByEmail.set(email, []);
      }
      playersByEmail.get(email)!.push(player);
    }

    // Process each unique email
    const processedEmails = new Set<string>();

    for (const player of playersWithoutSupabaseId) {
      try {
        if (!player.email) {
          continue;
        }

        const playerEmail = player.email.toLowerCase();

        // Skip if we already processed this email
        if (processedEmails.has(playerEmail)) {
          continue;
        }

        const playersWithSameEmail = playersByEmail.get(playerEmail)!;
        console.log(`\n🔍 Processing email: ${player.email}`);

        // Look up Supabase user ID by email
        const supabaseUserId = emailToSupabaseId.get(playerEmail);

        if (!supabaseUserId) {
          console.log(`   ⚠️  No auth user found`);
          notFoundCount += playersWithSameEmail.length;
          playersWithSameEmail.forEach((p) => notFoundPlayers.push(p));
          processedEmails.add(playerEmail);
          continue;
        }

        // Check if this supabaseId is already assigned to another player
        const existingPlayer = await prisma.player.findUnique({
          where: { supabaseId: supabaseUserId },
          select: { id: true, name: true, email: true, playerId: true },
        });

        if (existingPlayer) {
          console.log(
            `   ℹ️  Supabase user already linked to: ${existingPlayer.name} (Player ID: ${existingPlayer.playerId})`
          );
          console.log(
            `   🗑️  Discarding ${playersWithSameEmail.length} duplicate(s)`
          );
          playersWithSameEmail.forEach((p) => {
            discardedPlayers.push({
              player: p,
              reason: `Email already linked to existing player: ${existingPlayer.name} (${existingPlayer.playerId})`,
            });
          });
          duplicateCount += playersWithSameEmail.length;
          processedEmails.add(playerEmail);
          continue;
        }

        // If multiple players with same email, keep the oldest one (smallest DB id)
        const sortedPlayers = [...playersWithSameEmail].sort((a, b) =>
          a.id.localeCompare(b.id)
        );
        const playerToKeep = sortedPlayers[0];
        const playersToDiscard = sortedPlayers.slice(1);

        if (playersToDiscard.length > 0) {
          console.log(
            `   ⚠️  Found ${playersWithSameEmail.length} players with this email`
          );
          console.log(
            `   ✅ Keeping oldest: ${playerToKeep.name} (Player ID: ${playerToKeep.playerId}, DB ID: ${playerToKeep.id})`
          );
          console.log(
            `   🗑️  Discarding ${playersToDiscard.length} duplicate(s):`
          );
          playersToDiscard.forEach((p) => {
            console.log(
              `      - ${p.name} (Player ID: ${p.playerId}, DB ID: ${p.id})`
            );
            discardedPlayers.push({
              player: p,
              reason: `Duplicate email - kept older player: ${playerToKeep.name} (${playerToKeep.playerId})`,
            });
          });
          duplicateCount += playersToDiscard.length;
        }

        // Update the player to keep with supabaseId
        if (!isDryRun) {
          await prisma.player.update({
            where: { id: playerToKeep.id },
            data: { supabaseId: supabaseUserId },
          });
        }

        console.log(
          `   ✅ ${isDryRun ? "Would link" : "Linked"} to Supabase ID: ${supabaseUserId}`
        );
        successCount++;
        processedEmails.add(playerEmail);
      } catch (error: any) {
        console.error(`   ❌ Error:`, error.message);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📈 Migration Summary:");
    console.log("=".repeat(60));
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`⚠️  No auth user found: ${notFoundCount}`);
    console.log(`⚠️  Missing player email: ${missingEmailCount}`);
    console.log(`🗑️  Duplicates discarded: ${duplicateCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total processed: ${playersWithoutSupabaseId.length}`);
    console.log("=".repeat(60) + "\n");

    if (discardedPlayers.length > 0) {
      console.log("🗑️  Discarded duplicate players (not migrated):");
      discardedPlayers.forEach(({ player, reason }) => {
        console.log(
          `   - ${player.name} (${player.email}) - Player ID: ${player.playerId}`
        );
        console.log(`     Reason: ${reason}`);
      });
      console.log(
        "\n💡 These player records can be safely deleted from the database if no longer needed."
      );
    }

    if (notFoundPlayers.length > 0) {
      console.log("\n⚠️  Players without matching auth users (not migrated):");
      for (const player of notFoundPlayers) {
        console.log(
          `   - ${player.name} (${player.email}) - Player ID: ${player.playerId}`
        );
      }
      console.log(
        "\n💡 These players need to register in Supabase auth first or can be deleted."
      );
    }

    if (missingEmailPlayers.length > 0) {
      console.log("\n⚠️  Players without email (cannot be auto-linked by this script):");
      for (const player of missingEmailPlayers) {
        console.log(`   - ${player.name} - Player ID: ${player.playerId}`);
      }
      console.log(
        "\n💡 These need manual linking or a separate migration strategy based on playerId/metadata."
      );
    }

    if (runOnce && !isDryRun) {
      await prisma.metaState.upsert({
        where: { id: migrationMarkerId },
        update: {
          value: {
            executedAt: new Date().toISOString(),
            migratedCount: successCount,
            notFoundCount,
            missingEmailCount,
            duplicateCount,
            errorCount,
          },
          info: {
            script: "scripts/migrate-supabase-ids.ts",
            mode: "once",
          },
        },
        create: {
          id: migrationMarkerId,
          value: {
            executedAt: new Date().toISOString(),
            migratedCount: successCount,
            notFoundCount,
            missingEmailCount,
            duplicateCount,
            errorCount,
          },
          info: {
            script: "scripts/migrate-supabase-ids.ts",
            mode: "once",
          },
        },
      });

      console.log(`\n📝 Recorded completion marker: ${migrationMarkerId}`);
    }
  } catch (error: any) {
    console.error("\n❌ Migration failed:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateSupabaseIds()
  .then(() => {
    console.log("✅ Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
