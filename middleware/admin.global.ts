export default defineNuxtRouteMiddleware(async (to, from) => {
  // Only run on admin pages
  if (to.path.startsWith("/admin")) {
    try {
      // Check admin access via server API - this works in both SSR and client contexts
      await $fetch("/api/admin/check");
    } catch (error: unknown) {
      const errorObj = error as { statusCode?: number };
      if (errorObj.statusCode === 401) {
        // Not authenticated - redirect to login
        return navigateTo("/login");
      } else if (errorObj.statusCode === 403) {
        // Authenticated but not admin - redirect to home with error
        throw createError({
          statusCode: 403,
          statusMessage: "Access denied - Admin privileges required",
        });
      } else if (errorObj.statusCode === 503) {
        // Supabase unavailable - redirect to home page with message
        return navigateTo("/?error=service-unavailable");
      } else {
        // Other errors (including 500 from missing auth) - redirect to login
        return navigateTo("/login");
      }
    }
  }
});
