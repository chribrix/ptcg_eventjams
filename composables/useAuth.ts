export const useAuth = () => {
  const supabaseUser = useSupabaseUser();
  const devUser = ref<any>(null);
  const isDevMode = process.dev;

  // Check for dev authentication (manual trigger only)
  const checkDevAuth = async () => {
    if (!isDevMode) return null;

    try {
      // Try to fetch user data using dev authentication
      const response = await $fetch("/api/dev/me", {
        method: "GET",
        credentials: "include",
      });

      if (response?.user) {
        devUser.value = {
          id: response.user.playerId,
          email: response.user.email,
          user_metadata: {
            name: response.user.name,
          },
        };
        return devUser.value;
      }
    } catch (error) {
      // No dev auth available
      devUser.value = null;
    }

    return null;
  };

  // Clear dev authentication
  const clearDevAuth = () => {
    devUser.value = null;
  };

  // Combined user - prioritize Supabase, fallback to dev
  const user = computed(() => {
    return supabaseUser.value || devUser.value;
  });

  // Watch for Supabase user changes and clear dev auth when real user logs in
  watch(supabaseUser, (newSupabaseUser) => {
    if (newSupabaseUser && devUser.value) {
      // Real user logged in, clear dev auth
      console.log("Real Supabase user detected, clearing dev auth");
      clearDevAuth();

      // Also clear dev cookies
      if (process.client) {
        document.cookie =
          "dev-user-id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        document.cookie =
          "dev-user-email=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      }
    }
  });

  // Auto-check dev auth on client side (if no Supabase user exists)
  if (process.client && isDevMode && !supabaseUser.value) {
    // Use nextTick to ensure Supabase auth has been checked first
    nextTick(() => {
      if (!supabaseUser.value) {
        checkDevAuth();
      }
    });
  }

  return {
    user,
    supabaseUser,
    devUser,
    checkDevAuth,
    clearDevAuth,
    isDevMode,
  };
};
