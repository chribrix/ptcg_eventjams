// middleware/auth.global.ts
export default defineNuxtRouteMiddleware(() => {
  const user = useSupabaseUser();
  const isClient = process.client;

  const publicPages = ["/", "/login", "/register"];

  // If already on a public page, don't redirect
  if (publicPages.includes(useRoute().path)) return;

  // Let SSR render, only redirect on client
  if (isClient && !user.value) {
    return navigateTo("/");
  }
});
