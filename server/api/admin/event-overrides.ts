import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import {
  createExternalEventOverride,
  listExternalEventOverrides,
} from "~/server/services/admin/externalEventAdminService";

export default defineAdminRoute(async ({ event, adminUser }) => {
  const method = getMethod(event);

  switch (method) {
    case "GET":
      return listExternalEventOverrides();
    case "POST": {
      const body = await readBody(event);
      return createExternalEventOverride(body, adminUser.id);
    }
    default:
      throw createError({
        statusCode: 405,
        statusMessage: "Method not allowed",
      });
  }
});
