import { clearClientAuthState } from "~/utils/clientAuthState";

export default defineNuxtPlugin(async () => {
  const supabaseClient = useSupabaseClient();

  // On app initialization, check for stale/expired sessions
  if (process.client) {
    try {
      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession();

      if (error) {
        console.log("Session check error on init, cleaning up:", error);
        clearClientAuthState({ clearAllStorage: true });
        return;
      }

      // If we have a session, check if it's expired
      if (session) {
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);

        if (expiresAt && expiresAt < now) {
          console.log("Detected expired session on app init, cleaning up");
          clearClientAuthState({ clearAllStorage: true });
          await supabaseClient.auth.signOut();
        }
      }
    } catch (error) {
      console.error("Error during session cleanup on init:", error);
      // If there's any error checking session, clear storage to be safe
      clearClientAuthState({ clearAllStorage: true });
    }
  }
});
