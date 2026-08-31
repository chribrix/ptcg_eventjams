import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import {
  createAdminEventTemplate,
  deleteAdminEventTemplate,
  listAdminEventTemplates,
  updateAdminEventTemplate,
} from "~/server/services/admin/eventTemplateAdminService";

export default defineAdminRoute(async ({ event, adminUser }) => {
  const method = getMethod(event);

  switch (method) {
    case "GET":
      return { templates: await listAdminEventTemplates() };

    case "POST": {
      const body = await readBody(event);
      return createAdminEventTemplate(body, adminUser);
    }

    case "PUT": {
      const query = getQuery(event);
      const id = query.id as string;
      if (!id) {
        throw createError({
          statusCode: 400,
          statusMessage: "Template ID is required",
        });
      }
      const body = await readBody(event);
      return updateAdminEventTemplate(id, body);
    }

    case "DELETE": {
      const query = getQuery(event);
      const id = query.id as string;
      if (!id) {
        throw createError({
          statusCode: 400,
          statusMessage: "Template ID is required",
        });
      }
      return deleteAdminEventTemplate(id);
    }

    default:
      throw createError({
        statusCode: 405,
        statusMessage: "Method not allowed",
      });
  }
});
