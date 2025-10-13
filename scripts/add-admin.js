/**
 * Admin User Management Script
 *
 * Run this script to manually add admin users to the database.
 *
 * Usage:
 * 1. First, get the Supabase user ID from your Supabase dashboard or by logging in
 * 2. Run: node scripts/add-admin.js <supabase-user-id> <email> [name]
 *
 * Example:
 * node scripts/add-admin.js "550e8400-e29b-41d4-a716-446655440000" "admin@example.com" "Admin User"
 */

import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

async function addAdmin(userId, email, name = null) {
  try {
    const adminUser = await prisma.adminUser.create({
      data: {
        id: userId,
        email: email,
        name: name,
      },
    });

    console.log("✅ Admin user created successfully:", adminUser);
  } catch (error) {
    if (error.code === "P2002") {
      console.error(
        "❌ Error: Admin user already exists with that ID or email"
      );
    } else {
      console.error("❌ Error creating admin user:", error);
    }
  }
}

async function removeAdmin(userId) {
  try {
    await prisma.adminUser.delete({
      where: { id: userId },
    });
    console.log("✅ Admin user removed successfully");
  } catch (error) {
    if (error.code === "P2025") {
      console.error("❌ Error: Admin user not found");
    } else {
      console.error("❌ Error removing admin user:", error);
    }
  }
}

async function listAdmins() {
  try {
    const admins = await prisma.adminUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    console.log("👑 Admin Users:");
    admins.forEach((admin) => {
      console.log(`  - ${admin.name || "No name"} (${admin.email})`);
      console.log(`    ID: ${admin.id}`);
      console.log(`    Created: ${admin.createdAt.toISOString()}`);
      console.log("");
    });
  } catch (error) {
    console.error("❌ Error listing admin users:", error);
  }
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "add":
    if (args.length < 3) {
      console.error("Usage: node add-admin.js add <user-id> <email> [name]");
      process.exit(1);
    }
    await addAdmin(args[1], args[2], args[3]);
    break;

  case "remove":
    if (args.length < 2) {
      console.error("Usage: node add-admin.js remove <user-id>");
      process.exit(1);
    }
    await removeAdmin(args[1]);
    break;

  case "list":
    await listAdmins();
    break;

  default:
    console.log(`
Admin User Management

Commands:
  add <user-id> <email> [name]  - Add a new admin user
  remove <user-id>              - Remove an admin user
  list                          - List all admin users

Examples:
  node scripts/add-admin.js add "550e8400-e29b-41d4-a716-446655440000" "admin@example.com" "Admin User"
  node scripts/add-admin.js remove "550e8400-e29b-41d4-a716-446655440000"
  node scripts/add-admin.js list

To get your Supabase user ID:
1. Log into your app
2. Check the Supabase dashboard > Authentication > Users
3. Copy the UUID from the "UID" column
`);
}

await prisma.$disconnect();
