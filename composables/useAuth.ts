export const useAuth = () => {
  const supabaseUser = useSupabaseUser();
  const supabaseClient = useSupabaseClient();
  const isRefreshing = ref(false);
  const runtimeConfig = useRuntimeConfig();
  const { error: showErrorToast } = useToast();

  // Helper to log errors to database
  const logError = async (
    errorType: string,
    errorMessage: string,
    additionalData?: any
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
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
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
        console.error("Session check error:", error);
        await logError("session_check_failed", error.message, { error });
        await clearInvalidSession();
        showErrorToast("Your session has expired. Please log in again.", 7000);
        return null;
      }

      // If no session, user is logged out
      if (!session) {
        return null;
      }

      // Check if session was created before current deployment
      const deployTimestamp = runtimeConfig.public.deployTimestamp;
      if (deployTimestamp && process.client) {
        try {
          const deployTime = parseInt(deployTimestamp);

          // Get session start time from localStorage
          const sessionStartKey = `session_start_${session.user.id}`;
          const stored = localStorage.getItem(sessionStartKey);

          if (stored) {
            const sessionStartTime = parseInt(stored);

            // If session started before this deployment, invalidate it
            if (sessionStartTime < deployTime) {
              console.log("Session invalidated due to new deployment");
              await logError(
                "session_deployment_invalidated",
                "Session started before current deployment",
                {
                  sessionStartTime,
                  deployTime,
                  sessionAge: Date.now() - sessionStartTime,
                }
              );
              await clearInvalidSession();
              showErrorToast(
                "New version deployed. Please log in again.",
                7000
              );
              return null;
            }
          } else {
            // First time seeing this session, record it
            localStorage.setItem(sessionStartKey, Date.now().toString());
          }
        } catch (deployCheckError) {
          console.error("Deployment timestamp check failed:", deployCheckError);
          // Don't block on this - continue with normal session checks
        }
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
            console.error("Token refresh failed:", refreshError);
            await logError("token_refresh_failed", refreshError.message, {
              refreshError,
            });
            await clearInvalidSession();
            showErrorToast("Session expired. Please log in again.", 7000);
            return null;
          }

          return newSession?.user || null;
        } catch (refreshError) {
          console.error("Refresh attempt failed:", refreshError);
          const errorMessage =
            refreshError instanceof Error
              ? refreshError.message
              : "Unknown refresh error";
          await logError("token_refresh_exception", errorMessage, {
            refreshError,
          });
          await clearInvalidSession();
          showErrorToast("Authentication error. Please log in again.", 7000);
          return null;
        }
      }

      return session.user;
    } catch (error) {
      console.error("Error ensuring valid session:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown session validation error";
      await logError("session_validation_exception", errorMessage, { error });
      await clearInvalidSession();
      showErrorToast("Session validation failed. Please log in again.", 7000);
      return null;
    } finally {
      isRefreshing.value = false;
    }
  };

  // Helper to safely clear invalid sessions without blocking UI
  const clearInvalidSession = async () => {
    try {
      await supabaseClient.auth.signOut();
    } catch (signOutError) {
      console.log("SignOut failed (likely already signed out):", signOutError);
    }

    if (process.client) {
      try {
        // Clear only session-related items, not everything
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.includes("supabase") || key.includes("session_start_"))
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      } catch (storageError) {
        console.error("Storage cleanup error:", storageError);
      }
    }
  };

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
    const checkInterval = setInterval(() => {
      if (supabaseUser.value) {
        // Run async but don't await - let it happen in background
        ensureValidSession().catch((err) => {
          console.error("Background session check failed:", err);
        });
      }
    }, 5 * 60 * 1000);

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
  };
};
