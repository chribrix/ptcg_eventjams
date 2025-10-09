import { serverSupabaseUser } from "#supabase/server";
import { PrismaClient } from "~/generated/prisma";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
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
      select: { email: true, name: true },
    });

    // Return admin status based on whether user exists in admin table
    return {
      isAdmin: !!adminUser,
      user: {
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.name || null,
        role: adminUser ? "ADMIN" : "USER",
      },
    };
  } catch (error) {
    // Handle auth session missing errors specifically
    if (
      error &&
      typeof error === "object" &&
      "statusMessage" in error &&
      error.statusMessage === "Auth session missing!"
    ) {
      throw createError({
        statusCode: 401,
        statusMessage: "Authentication required",
      });
    }

    // If it's already a createError, re-throw it
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    console.error("Admin check error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
