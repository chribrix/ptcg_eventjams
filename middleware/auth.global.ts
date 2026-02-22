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
  // This is required for login/confirm/magic-link/password-setup flows.
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

      if (validUser.email && to.path !== "/set-password") {
        try {
          const passwordStatus = await $fetch<{
            hasPassword: boolean;
            passwordState?: "has" | "missing" | "unknown";
          }>("/api/auth/check-password", {
            method: "POST",
            body: { email: validUser.email },
          });

          if (passwordStatus.passwordState === "missing") {
            return navigateTo(
              `/set-password?return=${encodeURIComponent(to.fullPath)}`,
            );
          }
        } catch {}
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
