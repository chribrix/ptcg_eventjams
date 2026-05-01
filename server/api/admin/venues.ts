import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import {
  createAdminVenueDirectoryEntry,
  deleteAdminVenueDirectoryEntry,
  listAdminVenueDirectory,
  updateAdminVenueDirectoryEntry,
} from "~/server/services/admin/venueAdminService";

export default defineAdminRoute(async ({ event }) => {
  const method = getMethod(event);
  const query = getQuery(event);

  switch (method) {
    case "GET": {
      const search =
        typeof query.search === "string" ? query.search : undefined;
      return {
        venues: await listAdminVenueDirectory(search),
      };
    }

    case "POST": {
      const body = await readBody(event);
      return createAdminVenueDirectoryEntry(body);
    }

    case "PUT": {
      const venueId = query.id as string;
      if (!venueId) {
        throw createError({
          statusCode: 400,
          statusMessage: "Venue ID is required",
        });
      }

      const body = await readBody(event);
      return updateAdminVenueDirectoryEntry(venueId, body);
    }

    case "DELETE": {
      const venueId = query.id as string;
      if (!venueId) {
        throw createError({
          statusCode: 400,
          statusMessage: "Venue ID is required",
        });
      }

      return deleteAdminVenueDirectoryEntry(venueId);
    }

    default:
      throw createError({
        statusCode: 405,
        statusMessage: "Method not allowed",
      });
  }
});
