import { serverSupabaseUser } from "#supabase/server";
import type { H3Event } from "h3";

type AuthUserLike = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  raw_app_meta_data?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

const ADMIN_ROLE = "admin";

function isAdminRoleValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().toLowerCase() === ADMIN_ROLE;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => isAdminRoleValue(entry));
  }

  return false;
}

export function hasAdminRole(user: AuthUserLike | null | undefined): boolean {
  if (!user) {
    return false;
  }

  const appMetadata = (user.app_metadata ||
    user.raw_app_meta_data ||
    {}) as Record<string, unknown>;

  return (
    appMetadata.is_admin === true ||
    isAdminRoleValue(appMetadata.user_role) ||
    isAdminRoleValue(appMetadata.role) ||
    isAdminRoleValue(appMetadata.roles)
  );
}

export async function getAuthenticatedAdminState(event: H3Event) {
  try {
    const user = (await serverSupabaseUser(event)) as AuthUserLike | null;

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Authentication required",
      });
    }

    return {
      user,
      isAdmin: hasAdminRole(user),
    };
  } catch (error) {
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

    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    console.error("Admin authentication error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error during admin verification",
    });
  }
}

export async function verifyAdmin(event: H3Event) {
  const { user, isAdmin } = await getAuthenticatedAdminState(event);

  if (!isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Access denied - Admin privileges required",
    });
  }

  return user;
}

export async function isAdminUserId(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }

  try {
    const supabaseAdmin = useSupabaseServiceRole();
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error) {
      console.error("Admin role lookup failed:", error);
      return false;
    }

    return hasAdminRole((data?.user as AuthUserLike | null) || null);
  } catch (error) {
    console.error("Admin role lookup error:", error);
    return false;
  }
}
