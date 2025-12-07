// middleware/auth.global.ts
export default defineNuxtRouteMiddleware(async (to) => {
  const { user, checkDevAuth } = useAuth();
  const isClient = import.meta.client;

  const publicPages = ["/", "/login", "/register", "/events", "/eventlist"];

  // Check if path starts with public patterns
  const isPublicPath =
    publicPages.includes(to.path) || to.path.startsWith("/events/");

  // If already on a public page, don't redirect
  if (isPublicPath) return;

  // On client side, check for authentication
  if (isClient) {
    // Give Supabase a chance to load first, then check dev auth as fallback
    if (!user.value) {
      // Wait a moment for Supabase auth to potentially load
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Only check dev auth if still no Supabase user
      if (!user.value) {
        await checkDevAuth();
      }
    }

    // If still no user after both checks, redirect
    if (!user.value) {
      return navigateTo("/");
    }
  }
});
