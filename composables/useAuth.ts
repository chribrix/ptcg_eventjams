export const useAuth = () => {
  const supabaseUser = useSupabaseUser();
  const supabaseClient = useSupabaseClient();
  const isRefreshing = ref(false);

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
        const {
          data: { session: newSession },
          error: refreshError,
        } = await supabaseClient.auth.refreshSession();

        if (refreshError) {
          console.error("Token refresh failed:", refreshError);
          // Session is invalid, clear it
          await supabaseClient.auth.signOut();
          return null;
        }

        return newSession?.user || null;
      }

      return session.user;
    } catch (error) {
      console.error("Error ensuring valid session:", error);
      return null;
    } finally {
      isRefreshing.value = false;
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
    // Check session every 5 minutes
    const checkInterval = setInterval(() => {
      if (supabaseUser.value) {
        ensureValidSession();
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
