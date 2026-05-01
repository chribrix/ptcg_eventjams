/**
 * Admin Role Management Script
 *
 * Runtime admin authority lives in Supabase auth app_metadata.
 * Legacy users.admin_users rows are compatibility data only.
 *
 * Commands:
 * - add <user-id>      Grant admin role in Supabase metadata
 * - remove <user-id>   Remove admin role from Supabase metadata
 * - list               List current Supabase admin users
 * - list-legacy        List legacy users.admin_users rows
 * - migrate-legacy     Copy legacy admin rows into Supabase metadata
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing required environment variables:");
  console.error(`SUPABASE_URL: ${Boolean(supabaseUrl)}`);
  console.error(
    `SUPABASE_SERVICE_ROLE_KEY: ${Boolean(supabaseServiceRoleKey)}`,
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const prisma = new PrismaClient();

const ADMIN_ROLE = "admin";

function hasSupabaseAdminRole(appMetadata = {}) {
  const roleValues = [
    appMetadata.user_role,
    appMetadata.role,
    appMetadata.roles,
  ];

  return (
    appMetadata.is_admin === true ||
    roleValues.some((value) => {
      if (typeof value === "string") {
        return value.trim().toLowerCase() === ADMIN_ROLE;
      }

      if (Array.isArray(value)) {
        return value.some(
          (entry) =>
            typeof entry === "string" &&
            entry.trim().toLowerCase() === ADMIN_ROLE,
        );
      }

      return false;
    })
  );
}

function mergeAdminMetadata(appMetadata = {}) {
  const roles = new Set(
    Array.isArray(appMetadata.roles) ? appMetadata.roles : [],
  );
  roles.add(ADMIN_ROLE);

  return {
    ...appMetadata,
    user_role: ADMIN_ROLE,
    roles: Array.from(roles),
    is_admin: true,
  };
}

function removeAdminMetadata(appMetadata = {}) {
  const next = { ...appMetadata };
  delete next.is_admin;

  if (next.user_role === ADMIN_ROLE) {
    delete next.user_role;
  }

  if (next.role === ADMIN_ROLE) {
    delete next.role;
  }

  if (Array.isArray(next.roles)) {
    const remainingRoles = next.roles.filter(
      (entry) =>
        !(
          typeof entry === "string" && entry.trim().toLowerCase() === ADMIN_ROLE
        ),
    );

    if (remainingRoles.length > 0) {
      next.roles = remainingRoles;
    } else {
      delete next.roles;
    }
  }

  return next;
}

async function getAuthUserById(userId) {
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    throw error;
  }

  if (!data?.user) {
    throw new Error(`Auth user not found for id ${userId}`);
  }

  return data.user;
}

async function updateAdminRole(userId, mode) {
  const user = await getAuthUserById(userId);
  const currentMetadata = user.app_metadata || {};
  const nextMetadata =
    mode === "add"
      ? mergeAdminMetadata(currentMetadata)
      : removeAdminMetadata(currentMetadata);

  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: nextMetadata,
  });

  if (error) {
    throw error;
  }

  const actionText = mode === "add" ? "granted" : "removed";
  console.log(
    `Admin role ${actionText} for ${data.user.email || "<no email>"} [${data.user.id}]`,
  );
}

async function listAllAuthUsers() {
  const users = [];
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

    const batch = data?.users || [];
    users.push(...batch);

    if (batch.length < perPage) {
      return users;
    }

    page += 1;
  }
}

async function listAdmins() {
  const users = await listAllAuthUsers();
  const adminUsers = users.filter((user) =>
    hasSupabaseAdminRole(user.app_metadata || {}),
  );

  console.log(`Supabase admin users: ${adminUsers.length}`);

  for (const user of adminUsers) {
    console.log(`- ${user.email || "<no email>"}`);
    console.log(`  id: ${user.id}`);
    console.log(
      `  app_metadata: ${JSON.stringify(user.app_metadata || {}, null, 2)}`,
    );
  }
}

async function listLegacyAdmins() {
  const admins = await prisma.adminUser.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Legacy admin rows: ${admins.length}`);

  for (const admin of admins) {
    console.log(`- ${admin.email}`);
    console.log(`  id: ${admin.id}`);
    console.log(`  name: ${admin.name || "<no name>"}`);
    console.log(`  createdAt: ${admin.createdAt.toISOString()}`);
  }
}

async function migrateLegacyAdmins() {
  const admins = await prisma.adminUser.findMany({
    select: {
      id: true,
      email: true,
      name: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (admins.length === 0) {
    console.log("No legacy admin rows found.");
    return;
  }

  let migrated = 0;
  let alreadyAdmin = 0;
  let missingAuthUser = 0;

  for (const admin of admins) {
    try {
      const authUser = await getAuthUserById(admin.id);

      if (hasSupabaseAdminRole(authUser.app_metadata || {})) {
        alreadyAdmin += 1;
        console.log(
          `Already admin in Supabase: ${authUser.email || admin.email} [${authUser.id}]`,
        );
        continue;
      }

      const nextMetadata = mergeAdminMetadata(authUser.app_metadata || {});
      const { error } = await supabase.auth.admin.updateUserById(admin.id, {
        app_metadata: nextMetadata,
      });

      if (error) {
        throw error;
      }

      migrated += 1;
      console.log(
        `Migrated legacy admin -> Supabase metadata: ${admin.email} [${admin.id}]`,
      );
    } catch (error) {
      missingAuthUser += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Could not migrate ${admin.email} [${admin.id}]: ${message}`);
    }
  }

  console.log("\nMigration summary");
  console.log(`- migrated: ${migrated}`);
  console.log(`- already admin in Supabase: ${alreadyAdmin}`);
  console.log(`- missing or failed auth users: ${missingAuthUser}`);
  console.log(
    "Legacy admin rows remain in the database for compatibility only; runtime admin authority is Supabase metadata.",
  );
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "add":
      if (args.length < 2) {
        throw new Error("Usage: node scripts/add-admin.js add <user-id>");
      }
      await updateAdminRole(args[1], "add");
      break;

    case "remove":
      if (args.length < 2) {
        throw new Error("Usage: node scripts/add-admin.js remove <user-id>");
      }
      await updateAdminRole(args[1], "remove");
      break;

    case "list":
      await listAdmins();
      break;

    case "list-legacy":
      await listLegacyAdmins();
      break;

    case "migrate-legacy":
      await migrateLegacyAdmins();
      break;

    default:
      console.log(`
Admin Role Management

Runtime admin authority is stored in Supabase auth app_metadata.
Legacy users.admin_users rows are compatibility data only.

Commands:
  add <user-id>       Grant admin role in Supabase metadata
  remove <user-id>    Remove admin role from Supabase metadata
  list                List Supabase admin users
  list-legacy         List legacy users.admin_users rows
  migrate-legacy      Copy legacy admin rows into Supabase metadata

Examples:
  node scripts/add-admin.js add "550e8400-e29b-41d4-a716-446655440000"
  node scripts/add-admin.js remove "550e8400-e29b-41d4-a716-446655440000"
  node scripts/add-admin.js list
  node scripts/add-admin.js migrate-legacy
`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
