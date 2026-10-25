import { getAuthenticatedAdminState } from "../../util/adminAccess";
import { safeDiagnosticRecord } from "~/server/util/safeDiagnostics";

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

    const diagnostic = safeDiagnosticRecord({ errorType: "admin_check_error", error });
    console.error("[diagnostic]", diagnostic.errorType, diagnostic.metadata);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
