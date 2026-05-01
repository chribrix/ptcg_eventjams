import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { toggleExternalEventOverrideHidden } from "~/server/services/admin/externalEventAdminService";

export default defineAdminRoute(async ({ event }) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Override ID is required",
    });
  }

  if (getMethod(event) !== "POST") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  return toggleExternalEventOverrideHidden(id);
});
