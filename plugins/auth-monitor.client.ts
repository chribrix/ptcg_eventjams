import { clearClientAuthState } from "~/utils/clientAuthState";
import { notifyEventBookmarksUpdated } from "~/utils/eventBookmarks";
import { useEventBookmarks } from "~/composables/useEventBookmarks";

export default defineNuxtPlugin((nuxtApp) => {
  const supabaseClient = useSupabaseClient();
  const { mergeGuestBookmarksIntoAccount } = useEventBookmarks();

  // Set up auth state change listener
  const { data: authListener } = supabaseClient.auth.onAuthStateChange(
    async (event, session) => {
      // Handle different auth events
      switch (event) {
        case "SIGNED_OUT":
          // User signed out - clear all local state
          console.log("User signed out, clearing local storage");
          clearClientAuthState({ clearAllStorage: true });
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
          try {
            const result = await mergeGuestBookmarksIntoAccount();
            if (result.mergedCount > 0 || result.skippedCount > 0) {
              notifyEventBookmarksUpdated();
            }
          } catch (mergeError) {
            console.error("Failed to merge guest bookmarks:", mergeError);
          }
          break;

        case "PASSWORD_RECOVERY":
          console.log("Password recovery initiated");
          break;
      }

      // Check for session expiration
      if (!session && event !== "SIGNED_OUT" && event !== "SIGNED_IN") {
        console.log("Session expired or invalid, cleaning up");
        clearClientAuthState({ clearAllStorage: true });
      }
    },
  );

  // Cleanup on app unmount
  nuxtApp.hook("app:unmounted", () => {
    authListener?.subscription.unsubscribe();
  });
});
