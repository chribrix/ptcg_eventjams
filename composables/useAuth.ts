import { clearClientAuthState as clearSharedClientAuthState } from "~/utils/clientAuthState";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createAuthSessionService } from "~/services/authSessionService";

let authSessionService: ReturnType<typeof createAuthSessionService<any>> | null =
  null;

export const useAuth = () => {
  const supabaseUser = useSupabaseUser();
  const supabaseClient = useSupabaseClient();
  const { error: showErrorToast } = useToast();

  // Helper to log errors to database
  const logError = async (
    errorType: string,
    errorMessage: string,
    additionalData?: any,
  ) => {
    if (!process.client) return;

    try {
      const user = supabaseUser.value;
      await $fetch("/api/admin/error-logs/create", {
        method: "POST",
        body: {
          userId: user?.id || null,
          userEmail: user?.email || null,
          errorType,
          errorMessage,
          userAgent: navigator.userAgent,
          url: window.location.href,
          stackTrace: new Error().stack,
          metadata: additionalData || null,
        },
      });
    } catch {}
  };

  const clearClientAuthState = (clearAllStorage = false) => {
    clearSharedClientAuthState({ clearAllStorage });
  };

  const assignLocation = (path: string) => {
    if (!process.client) return;
    window.location.assign(path);
  };

  // Helper to safely clear invalid sessions without blocking UI
  const clearInvalidSession = async () => {
    try {
      await supabaseClient.auth.signOut();
    } catch {}

    clearClientAuthState(false);
  };

  if (process.client && !authSessionService) {
    authSessionService = createAuthSessionService({
      getSession: () => supabaseClient.auth.getSession(),
      refreshSession: () => supabaseClient.auth.refreshSession(),
      signOut: () => supabaseClient.auth.signOut(),
      getCurrentUser: () => supabaseUser.value,
      clearAuthState: () => clearClientAuthState(false),
      logError,
      isRetryableError: isAuthRetryableFetchError,
    });
  }

  // All components delegate to one service: one in-flight refresh and one timer.
  const ensureValidSession = async () => {
    if (!process.client || !authSessionService) return supabaseUser.value;
    const validUser = await authSessionService.ensureValidSession();
    if (!validUser && supabaseUser.value) {
      showErrorToast("Your session has expired. Please log in again.", 7000);
    }
    return validUser;
  };

  const logout = createLogoutAction({
    logError,
    signOut: () => supabaseClient.auth.signOut(),
    clearClientAuthState,
    assignLocation,
    isClient: process.client,
    getMetadata: () => ({
      userName: supabaseUser.value?.user_metadata?.name,
    }),
  });

  // User is just the Supabase user
  const user = computed(() => {
    return supabaseUser.value;
  });

  // Centralized userName for consistent display across all components
  const userName = computed(() => {
    const currentUser = user.value;
    if (!currentUser) return null;
    return currentUser.user_metadata?.name || currentUser.email || null;
  });

  // Start the singleton monitor once for the entire browser app.
  if (process.client) {
    authSessionService?.startMonitoring();
  }

  return {
    user,
    userName,
    supabaseUser,
    ensureValidSession,
    clearInvalidSession,
    logout,
  };
};

type LogoutActionDependencies = {
  logError: (
    errorType: string,
    errorMessage: string,
    additionalData?: any,
  ) => Promise<void>;
  signOut: () => Promise<unknown>;
  clearClientAuthState: (clearAllStorage?: boolean) => void;
  assignLocation: (path: string) => void;
  isClient: boolean;
  getMetadata?: () => Record<string, unknown>;
};

export const createLogoutAction = (dependencies: LogoutActionDependencies) => {
  return async (redirectTo = "/login") => {
    try {
      await dependencies.logError("info_user_logout", "User initiated logout", {
        ...(dependencies.getMetadata?.() || {}),
      });

      await dependencies.signOut().catch(() => undefined);
    } catch (error) {
      await dependencies.logError(
        "logout_error",
        error instanceof Error ? error.message : "Logout failed",
        { error },
      );
    } finally {
      dependencies.clearClientAuthState(true);

      if (dependencies.isClient) {
        dependencies.assignLocation(redirectTo);
      }
    }
  };
};
