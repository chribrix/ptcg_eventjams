import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import {
  deleteExternalEventOverride,
  updateExternalEventOverride,
} from "~/server/services/admin/externalEventAdminService";

export default defineAdminRoute(async ({ event }) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Override ID is required",
    });
  }

  const method = getMethod(event);

  switch (method) {
    case "PUT":
    case "PATCH": {
      const body = await readBody(event);
      return updateExternalEventOverride(id, body);
    }
    case "DELETE":
      return deleteExternalEventOverride(id);
    default:
      throw createError({
        statusCode: 405,
        statusMessage: "Method not allowed",
      });
  }
});
