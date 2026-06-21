import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import {
  createAdminCustomEvent,
  deleteAdminCustomEvent,
  getAdminCustomEvent,
  listAdminCustomEvents,
  updateAdminCustomEvent,
} from "~/server/services/admin/eventAdminService";

type CustomEventRouteDependencies = {
  getRequestMethod?: typeof getMethod;
  readQuery?: typeof getQuery;
  readRequestBody?: typeof readBody;
  listEvents?: typeof listAdminCustomEvents;
  getEvent?: typeof getAdminCustomEvent;
  createEvent?: typeof createAdminCustomEvent;
  updateEvent?: typeof updateAdminCustomEvent;
  deleteEvent?: typeof deleteAdminCustomEvent;
};

export function createAdminCustomEventsHandler(
  dependencies: CustomEventRouteDependencies = {},
) {
  const getRequestMethod =
    dependencies.getRequestMethod ||
    ((event) => {
      return getMethod(event);
    });
  const readQuery =
    dependencies.readQuery ||
    ((event) => {
      return getQuery(event);
    });
  const readRequestBody =
    dependencies.readRequestBody ||
    (async (event) => {
      return readBody(event);
    });
  const listEvents = dependencies.listEvents || listAdminCustomEvents;
  const getEvent = dependencies.getEvent || getAdminCustomEvent;
  const createEvent = dependencies.createEvent || createAdminCustomEvent;
  const updateEvent = dependencies.updateEvent || updateAdminCustomEvent;
  const deleteEvent = dependencies.deleteEvent || deleteAdminCustomEvent;

  return async ({
    event,
    adminUser,
  }: {
    event: unknown;
    adminUser: { id: string };
  }) => {
    const method = getRequestMethod(event as Parameters<typeof getMethod>[0]);
    const query = readQuery(event as Parameters<typeof getQuery>[0]);

    switch (method) {
      case "GET": {
        if (query.id) {
          return getEvent(query.id as string);
        }

        const page = Number.parseInt((query.page as string) || "1", 10);
        const limit = Number.parseInt((query.limit as string) || "10", 10);
        return listEvents({ page, limit });
      }

      case "POST": {
        const body = await readRequestBody(
          event as Parameters<typeof readBody>[0],
        );
        return createEvent(body, adminUser);
      }

      case "PUT": {
        const eventId = query.id as string;
        if (!eventId) {
          throw createError({
            statusCode: 400,
            statusMessage: "Event ID is required",
          });
        }

        const body = await readRequestBody(
          event as Parameters<typeof readBody>[0],
        );
        return updateEvent(eventId, body);
      }

      case "DELETE": {
        const eventId = query.id as string;
        if (!eventId) {
          throw createError({
            statusCode: 400,
            statusMessage: "Event ID is required",
          });
        }

        return deleteEvent(eventId);
      }

      default:
        throw createError({
          statusCode: 405,
          statusMessage: "Method not allowed",
        });
    }
  };
}

export default defineAdminRoute(createAdminCustomEventsHandler());
