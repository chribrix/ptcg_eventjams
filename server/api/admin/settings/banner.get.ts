import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { getAdminLandingBanner } from "~/server/services/admin/adminBannerService";

type GetAdminBannerHandlerDependencies = {
  getBanner?: typeof getAdminLandingBanner;
};

export function createAdminBannerGetHandler(
  dependencies: GetAdminBannerHandlerDependencies = {},
) {
  const getBanner = dependencies.getBanner || getAdminLandingBanner;

  return async () => {
    return getBanner();
  };
}

export default defineAdminRoute(createAdminBannerGetHandler());