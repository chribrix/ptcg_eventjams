import { createAdminPageGuard } from "~/utils/adminPageGuard";

const adminPageGuard = createAdminPageGuard();

export default defineNuxtRouteMiddleware(async (to, from) => {
  if (import.meta.dev && (to.path === "/admin-style-preview" || (to.path === "/admin/legal" && to.query.preview === "1"))) return;
  const redirectTarget = await adminPageGuard(to);

  if (typeof redirectTarget === "string") {
    return navigateTo(redirectTarget);
  }

  return redirectTarget;
});
