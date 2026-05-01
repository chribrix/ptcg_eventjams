import { getAuthenticatedAdminState } from "../../util/adminAccess";

export default defineEventHandler(async (event) => {
  try {
    const { user, isAdmin } = await getAuthenticatedAdminState(event);

    return {
      isAdmin,
      user: {
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.name || null,
        role: isAdmin ? "ADMIN" : "USER",
      },
    };
  } catch (error) {
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
