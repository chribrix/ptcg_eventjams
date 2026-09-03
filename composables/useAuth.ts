import { clearClientAuthState as clearSharedClientAuthState } from "~/utils/clientAuthState";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";

export const useAuth = () => {
  const supabaseUser = useSupabaseUser();
  const supabaseClient = useSupabaseClient();
  const isRefreshing = ref(false);
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
      const cookies: Record<string, string> = {};

      // Get all cookies
      document.cookie.split(";").forEach((cookie) => {
        const [name, value] = cookie.split("=").map((c) => c.trim());
        if (name) cookies[name] = value || "";
      });

      await $fetch("/api/admin/error-logs/create", {
        method: "POST",
        body: {
          userId: user?.id || null,
          userEmail: user?.email || null,
          errorType,
          errorMessage,
          cookies,
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

  // Check and refresh session if needed
  const ensureValidSession = async () => {
    if (isRefreshing.value) return supabaseUser.value;

    try {
      isRefreshing.value = true;
      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession();

      if (error) {
        await logError("session_check_failed", error.message, { error });
        if (isAuthRetryableFetchError(error)) {
          return supabaseUser.value;
        }

        await clearInvalidSession();
        showErrorToast("Your session has expired. Please log in again.", 7000);
        return null;
      }

      // If no session, user is logged out
      if (!session) {
        return null;
      }

      // Check if token is expired or about to expire (within 5 minutes)
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const fiveMinutes = 5 * 60;

      if (expiresAt && expiresAt - now < fiveMinutes) {
        // Token expired or expiring soon, try to refresh
        try {
          const {
            data: { session: newSession },
            error: refreshError,
          } = await supabaseClient.auth.refreshSession();

          if (refreshError) {
            await logError("token_refresh_failed", refreshError.message, {
              refreshError,
            });
            if (isAuthRetryableFetchError(refreshError)) {
              return supabaseUser.value;
            }

            await clearInvalidSession();
            showErrorToast("Session expired. Please log in again.", 7000);
            return null;
          }

          return newSession?.user || null;
        } catch (refreshError) {
          const errorMessage =
            refreshError instanceof Error
              ? refreshError.message
              : "Unknown refresh error";
          await logError("token_refresh_exception", errorMessage, {
            refreshError,
          });
          if (isAuthRetryableFetchError(refreshError)) {
            return supabaseUser.value;
          }

          await clearInvalidSession();
          showErrorToast("Authentication error. Please log in again.", 7000);
          return null;
        }
      }

      return session.user;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown session validation error";
      await logError("session_validation_exception", errorMessage, { error });
      if (isAuthRetryableFetchError(error)) {
        return supabaseUser.value;
      }

      await clearInvalidSession();
      showErrorToast("Session validation failed. Please log in again.", 7000);
      return null;
    } finally {
      isRefreshing.value = false;
    }
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

  // Setup periodic session check on client side
  if (process.client) {
    // Check session every 5 minutes, but don't let it block anything
    const checkInterval = setInterval(
      () => {
        if (supabaseUser.value) {
          // Run async but don't await - let it happen in background
          ensureValidSession().catch(() => {});
        }
      },
      5 * 60 * 1000,
    );

    // Clean up on unmount
    onUnmounted(() => {
      clearInterval(checkInterval);
    });
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
