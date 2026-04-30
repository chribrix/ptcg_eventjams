// middleware/auth.global.ts
export default defineNuxtRouteMiddleware(async (to) => {
  const { user, ensureValidSession } = useAuth();
  const supabase = useSupabaseClient();
  const isClient = import.meta.client;

  const publicPages = [
    "/",
    "/login",
    "/register",
    "/events",
    "/eventlist",
    "/magic-login",
    "/confirm",
    "/set-password",
    "/password-set-success",
  ];

  // Check if path starts with public patterns
  const isPublicPath =
    publicPages.includes(to.path) || to.path.startsWith("/events/");

  // Public pages should remain accessible without password-enforcement redirects.
  // This covers login, password setup, and legacy compatibility screens.
  if (isPublicPath) {
    return;
  }

  // On client side, check for authentication
  if (isClient) {
    // If we think we have a user, validate the session first
    if (user.value) {
      const validUser = await ensureValidSession();
      if (!validUser) {
        // Session expired, clean up and redirect
        localStorage.clear();
        sessionStorage.clear();
        await supabase.auth.signOut();
        return navigateTo("/");
      }

      // Session ist gültig, Nutzer darf weiter.
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
