import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { getAdminUserDetail } from "~/server/services/admin/adminUserService";

export default defineAdminRoute(async ({ event }) => {
  const userId = getRouterParam(event, "id");

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: "User ID is required",
    });
  }

  return getAdminUserDetail(userId);
});