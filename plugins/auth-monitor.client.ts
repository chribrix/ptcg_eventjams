export default defineNuxtPlugin((nuxtApp) => {
  const supabaseClient = useSupabaseClient();

  // Set up auth state change listener
  const { data: authListener } = supabaseClient.auth.onAuthStateChange(
    async (event, session) => {
      // Handle different auth events
      switch (event) {
        case "SIGNED_OUT":
          // User signed out - clear all local state
          console.log("User signed out, clearing local storage");
          if (process.client) {
            try {
              localStorage.clear();
              sessionStorage.clear();

              // Clear cookies thoroughly for iOS Safari
              const cookies = document.cookie.split(";");
              for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                const eqPos = cookie.indexOf("=");
                const name =
                  eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                document.cookie =
                  name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
              }
            } catch (error) {
              console.error("Error clearing storage:", error);
            }
          }
          break;

        case "TOKEN_REFRESHED":
          // Token was refreshed successfully
          console.log("Auth token refreshed successfully");
          break;

        case "USER_UPDATED":
          // User data was updated
          console.log("User data updated");
          break;

        case "SIGNED_IN":
          // User signed in
          console.log("User signed in");
          break;

        case "PASSWORD_RECOVERY":
          console.log("Password recovery initiated");
          break;
      }

      // Check for session expiration
      if (!session && event !== "SIGNED_OUT" && event !== "SIGNED_IN") {
        console.log("Session expired or invalid, cleaning up");
        if (process.client) {
          localStorage.clear();
          sessionStorage.clear();
        }
      }
    }
  );

  // Cleanup on app unmount
  nuxtApp.hook("app:unmounted", () => {
    authListener?.subscription.unsubscribe();
  });
});
