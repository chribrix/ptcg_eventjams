import { serverSupabaseUser } from "#supabase/server";
import { PrismaClient } from "@prisma/client";
import type { H3Event } from "h3";

const prisma = new PrismaClient();

// Server-side utility function to check if a user is admin
export async function verifyAdmin(event: H3Event) {
  try {
    // Get the authenticated user from Supabase
    const user = await serverSupabaseUser(event);

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Authentication required",
      });
    }

    // Simply check if user ID exists in admin_users table
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: user.id },
    });

    // If user doesn't exist in admin table, they're not admin
    if (!adminUser) {
      throw createError({
        statusCode: 403,
        statusMessage: "Access denied - Admin privileges required",
      });
    }

    return user; // Return the authenticated user if they are admin
  } catch (error) {
    // Re-throw createError objects
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    console.error("Admin verification error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error during admin verification",
    });
  }
}

// Middleware function for admin routes
export default defineEventHandler(async (event) => {
  // Only apply to admin API routes (except the check endpoint)
  if (
    event.node.req.url?.startsWith("/api/admin/") &&
    !event.node.req.url.includes("/api/admin/check")
  ) {
    await verifyAdmin(event);
  }
});
