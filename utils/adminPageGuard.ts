import { buildLoginRedirectPath } from "~/utils/loginRedirect";

type AdminPageGuardDependencies = {
  fetchAdminCheck?: typeof $fetch;
};

export const createAdminPageGuard = (
  dependencies: AdminPageGuardDependencies = {},
) => {
  return async (to: { path: string; fullPath?: string }) => {
    const fetchAdminCheck =
      dependencies.fetchAdminCheck || ((url: string) => $fetch(url));

    if (!to.path.startsWith("/admin")) {
      return;
    }

    const loginRedirect = buildLoginRedirectPath(to);

    try {
      await fetchAdminCheck("/api/admin/check");
    } catch (error: unknown) {
      const errorObj = error as { statusCode?: number };
      if (errorObj.statusCode === 401) {
        return loginRedirect;
      }

      if (errorObj.statusCode === 403) {
        throw createError({
          statusCode: 403,
          statusMessage: "Access denied - Admin privileges required",
        });
      }

      if (errorObj.statusCode === 503) {
        return "/?error=service-unavailable";
      }

      return loginRedirect;
    }
  };
};
