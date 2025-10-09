export default defineNuxtRouteMiddleware(async (to, from) => {
  if (to.path.startsWith("/admin")) {
    try {
      const { checkAdminAccess } = useAdmin();
      await checkAdminAccess();
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
      } else {
        // Other errors - redirect to home
        return navigateTo("/");
      }
    }
  }
});
