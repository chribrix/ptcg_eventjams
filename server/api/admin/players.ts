import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import {
  createAdminPlayer,
  deleteAdminPlayer,
  getAdminPlayer,
  listAdminPlayers,
  updateAdminPlayer,
} from "~/server/services/admin/playerAdminService";

export default defineAdminRoute(async ({ event }) => {
  const method = getMethod(event);
  const query = getQuery(event);

  switch (method) {
    case "GET": {
      if (query.id) {
        return getAdminPlayer(query.id as string);
      }

      const page = Number.parseInt((query.page as string) || "1", 10);
      const limit = Number.parseInt((query.limit as string) || "10", 10);
      const search = typeof query.search === "string" ? query.search : undefined;

      return listAdminPlayers({ page, limit, search });
    }

    case "POST": {
      const body = await readBody(event);
      return createAdminPlayer(body);
    }

    case "PUT": {
      const playerId = query.id as string;
      if (!playerId) {
        throw createError({
          statusCode: 400,
          statusMessage: "Player ID is required",
        });
      }

      const body = await readBody(event);
      return updateAdminPlayer(playerId, body);
    }

    case "DELETE": {
      const playerId = query.id as string;
      if (!playerId) {
        throw createError({
          statusCode: 400,
          statusMessage: "Player ID is required",
        });
      }

      return deleteAdminPlayer(playerId);
    }

    default:
      throw createError({
        statusCode: 405,
        statusMessage: "Method not allowed",
      });
  }
});
