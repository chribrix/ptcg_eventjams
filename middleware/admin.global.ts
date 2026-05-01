import { createAdminPageGuard } from "~/utils/adminPageGuard";

const adminPageGuard = createAdminPageGuard();

export default defineNuxtRouteMiddleware(async (to, from) => {
  const redirectTarget = await adminPageGuard(to);

  if (typeof redirectTarget === "string") {
    return navigateTo(redirectTarget);
  }

  return redirectTarget;
});
