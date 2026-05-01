import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { getAdminDashboardView } from "~/server/services/admin/adminDashboardService";

type GetAdminDashboardHandlerDependencies = {
  getDashboard?: typeof getAdminDashboardView;
};

export function createAdminDashboardHandler(
  dependencies: GetAdminDashboardHandlerDependencies = {},
) {
  const getDashboard = dependencies.getDashboard || getAdminDashboardView;

  return async () => {
    return getDashboard();
  };
}

export default defineAdminRoute(createAdminDashboardHandler());