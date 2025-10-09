// middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser();
  const isClient = import.meta.client;

  const publicPages = ["/", "/login", "/register", "/events", "/eventlist"];

  // If already on a public page, don't redirect
  if (publicPages.includes(to.path)) return;

  // Let SSR render, only redirect on client
  if (isClient && !user.value) {
    return navigateTo("/");
  }
});
