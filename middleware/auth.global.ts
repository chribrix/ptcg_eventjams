import { clearClientAuthState } from "~/utils/clientAuthState";

import { getApplicationRoutePath } from "~/utils/applicationRoutePath";
import { buildLoginRedirectPath } from "~/utils/loginRedirect";

type AuthMiddlewareDependencies = {
  getAuth?: typeof useAuth;
  getSupabaseClient?: typeof useSupabaseClient;
  navigate?: typeof navigateTo;
  delay?: (ms: number) => Promise<void>;
  isClient?: boolean;
};

export const createAuthRouteGuard = (
  dependencies: AuthMiddlewareDependencies = {},
) => {
  const getAuth = dependencies.getAuth || useAuth;
  const getSupabaseClient = dependencies.getSupabaseClient || useSupabaseClient;
  const navigate = dependencies.navigate || navigateTo;
  const delay =
    dependencies.delay ||
    ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const isClient = dependencies.isClient ?? import.meta.client;

  return async (to: { path: string; fullPath?: string }) => {
    const { user, ensureValidSession } = getAuth();
    const supabase = getSupabaseClient();
    const loginRedirect = buildLoginRedirectPath(to);
    const applicationPath = getApplicationRoutePath(to.path);

    const publicPages = [
      "/",
      "/login",
      "/register",
      "/events",
      "/eventlist",
      "/magic-login",
      "/confirm",
      "/set-password",
      "/password-set-success",
    ];

    // Check if path starts with public patterns
    const isPublicPath =
      publicPages.includes(applicationPath) ||
      applicationPath.startsWith("/events/");

    // Public pages should remain accessible without password-enforcement redirects.
    // This covers login, password setup, and legacy compatibility screens.
    if (isPublicPath) {
      return;
    }

    if (!isClient) {
      if (!user.value) {
        return navigate(loginRedirect);
      }

      return;
    }

    // If we think we have a user, validate the session first
    if (user.value) {
      const validUser = await ensureValidSession();
      if (!validUser) {
        // Session expired, clean up and redirect
        clearClientAuthState({ clearAllStorage: true });
        await supabase.auth.signOut();
        return navigate(loginRedirect);
      }

      return;
    }

    // Give Supabase a chance to load
    // Wait a moment for Supabase auth to potentially load
    await delay(50);

    // If still no user, redirect
    if (!user.value) {
      return navigate(loginRedirect);
    }
  };
};

export default defineNuxtRouteMiddleware(createAuthRouteGuard());
