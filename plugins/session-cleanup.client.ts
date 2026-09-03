export default defineNuxtPlugin(async () => {
  const supabaseClient = useSupabaseClient();
  const isDev = import.meta.dev;

  // On app initialization, check for stale/expired sessions
  if (process.client) {
    try {
      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession();

      if (error) {
        if (isDev)
          console.log("Session check error on init, keeping local state:", error);
        return;
      }

      // If we have a session, check if it's expired
      if (session) {
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);

        if (expiresAt && expiresAt < now) {
          const { data, error: refreshError } =
            await supabaseClient.auth.refreshSession();

          if (refreshError || !data.session) {
            if (isDev)
              console.log(
                "Expired access token could not be refreshed; keeping the persisted session for a later retry",
                refreshError,
              );
          }
        }
      }
    } catch (error) {
      console.error("Error during session cleanup on init:", error);
      // Avoid destructive cleanup on transient session check failures.
    }
  }
});
