import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { updateAdminLandingBanner } from "~/server/services/admin/adminBannerService";

type UpdateAdminBannerHandlerDependencies = {
  readRequestBody?: typeof readBody;
  updateBanner?: typeof updateAdminLandingBanner;
};

export function createAdminBannerPatchHandler(
  dependencies: UpdateAdminBannerHandlerDependencies = {},
) {
  const readRequestBody =
    dependencies.readRequestBody ||
    (async (event) => {
      return readBody(event);
    });
  const updateBanner = dependencies.updateBanner || updateAdminLandingBanner;

  return async ({
    event,
    adminUser,
  }: {
    event: Parameters<typeof readBody>[0];
    adminUser: { id: string };
  }) => {
    const body = await readRequestBody(event);
    return updateBanner(adminUser.id, body);
  };
}

export default defineAdminRoute(createAdminBannerPatchHandler());