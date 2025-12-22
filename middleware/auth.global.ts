// middleware/auth.global.ts
export default defineNuxtRouteMiddleware(async (to) => {
  const { user, ensureValidSession } = useAuth();
  const supabase = useSupabaseClient();
  const isClient = import.meta.client;

  const publicPages = ["/", "/login", "/register", "/events", "/eventlist"];

  // Check if path starts with public patterns
  const isPublicPath =
    publicPages.includes(to.path) || to.path.startsWith("/events/");

  // If already on a public page, don't redirect
  if (isPublicPath) return;

  // On client side, check for authentication
  if (isClient) {
    // If we think we have a user, validate the session first
    if (user.value) {
      const validUser = await ensureValidSession();
      if (!validUser) {
        // Session expired, clean up and redirect
        console.log("Session expired, cleaning up...");
        localStorage.clear();
        sessionStorage.clear();
        await supabase.auth.signOut();
        return navigateTo("/");
      }
    } else {
      // Give Supabase a chance to load
      // Wait a moment for Supabase auth to potentially load
      await new Promise((resolve) => setTimeout(resolve, 50));

      // If still no user, redirect
      if (!user.value) {
        return navigateTo("/");
      }
    }
  }
});
