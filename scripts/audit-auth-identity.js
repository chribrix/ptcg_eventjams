/**
 * Audit Script: Auth / Player / Admin Reconciliation
 *
 * Purpose:
 * - classify auth users without linked players
 * - classify players without supabaseId
 * - surface ambiguous email-only matches for manual review
 * - surface duplicate player emails
 * - surface legacy admin rows that do not match Supabase admin metadata
 *
 * Run with:
 * node scripts/audit-auth-identity.js
 *
 * Required environment variables:
 * - DATABASE_URL
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables:");
  console.error(`SUPABASE_URL: ${Boolean(supabaseUrl)}`);
  console.error(`SUPABASE_SERVICE_ROLE_KEY: ${Boolean(supabaseServiceKey)}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const hasSupabaseAdminRole = (appMetadata) => {
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

const listAllAuthUsers = async () => {
  const allUsers = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data?.users || [];
    allUsers.push(...users);

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return allUsers;
};

const printSection = (title, items, renderItem) => {
  console.log(`\n${title}: ${items.length}`);

  if (items.length === 0) {
    return;
  }

  for (const item of items) {
    console.log(`- ${renderItem(item)}`);
  }
};

async function auditAuthIdentity() {
  console.log("Starting auth identity audit...\n");

  try {
    await prisma.$connect();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Database connection failed. Ensure DATABASE_URL points to a reachable database before running the audit. Original error: ${message}`,
    );
  }

  const [authUsers, players, legacyAdminRows] = await Promise.all([
    listAllAuthUsers(),
    prisma.player.findMany({
      select: {
        id: true,
        supabaseId: true,
        email: true,
        name: true,
        playerId: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.adminUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const playersBySupabaseId = new Map(
    players
      .filter((player) => player.supabaseId)
      .map((player) => [player.supabaseId, player]),
  );

  const playersByEmail = new Map();
  for (const player of players) {
    if (!player.email) {
      continue;
    }

    const email = player.email.toLowerCase();
    const existing = playersByEmail.get(email) || [];
    existing.push(player);
    playersByEmail.set(email, existing);
  }

  const authUsersById = new Map(authUsers.map((user) => [user.id, user]));

  const authUsersWithoutPlayer = [];
  const authUsersWithEmailOnlyCandidates = [];
  const playersWithoutSupabaseId = players.filter(
    (player) => !player.supabaseId,
  );
  const duplicatePlayerEmails = [];
  const legacyAdminRowsMissingSupabaseRole = [];

  for (const authUser of authUsers) {
    const linkedPlayer = playersBySupabaseId.get(authUser.id);
    const emailMatches = authUser.email
      ? playersByEmail.get(authUser.email.toLowerCase()) || []
      : [];

    if (!linkedPlayer && emailMatches.length === 0) {
      authUsersWithoutPlayer.push(authUser);
    } else if (!linkedPlayer && emailMatches.length > 0) {
      authUsersWithEmailOnlyCandidates.push({
        authUser,
        matchingPlayers: emailMatches,
      });
    }
  }

  for (const [email, matchingPlayers] of playersByEmail.entries()) {
    if (matchingPlayers.length > 1) {
      duplicatePlayerEmails.push({ email, players: matchingPlayers });
    }
  }

  for (const adminRow of legacyAdminRows) {
    const authUser = authUsersById.get(adminRow.id) || null;

    if (!authUser || !hasSupabaseAdminRole(authUser.app_metadata || {})) {
      legacyAdminRowsMissingSupabaseRole.push({ adminRow, authUser });
    }
  }

  console.log("Summary");
  console.log(`- auth users: ${authUsers.length}`);
  console.log(`- players: ${players.length}`);
  console.log(`- legacy admin rows: ${legacyAdminRows.length}`);

  printSection(
    "Auth users without linked player",
    authUsersWithoutPlayer,
    (user) => `${user.email || "<no email>"} [${user.id}]`,
  );

  printSection(
    "Auth users with only email-match player candidates",
    authUsersWithEmailOnlyCandidates,
    ({ authUser, matchingPlayers }) =>
      `${authUser.email || "<no email>"} [${authUser.id}] -> ${matchingPlayers
        .map((player) => `${player.name} (${player.playerId})`)
        .join(", ")}`,
  );

  printSection(
    "Players without supabaseId",
    playersWithoutSupabaseId,
    (player) =>
      `${player.name} (${player.playerId}) <${player.email || "no email"}>`,
  );

  printSection(
    "Duplicate player emails",
    duplicatePlayerEmails,
    ({ email, players: matchingPlayers }) =>
      `${email} -> ${matchingPlayers
        .map((player) => `${player.name} (${player.playerId})`)
        .join(", ")}`,
  );

  printSection(
    "Legacy admin rows without Supabase admin role",
    legacyAdminRowsMissingSupabaseRole,
    ({ adminRow, authUser }) =>
      authUser
        ? `${adminRow.email} [${adminRow.id}] -> auth user exists but app_metadata is not admin`
        : `${adminRow.email} [${adminRow.id}] -> no matching auth user`,
  );
}

auditAuthIdentity()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("\nAudit failed:", error.message);
    await prisma.$disconnect();
    process.exit(1);
  });
