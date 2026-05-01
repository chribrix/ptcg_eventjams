import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { getAdminEventDetail } from "~/server/services/admin/eventAdminService";

type AdminEventDetailsHandlerDependencies = {
  getEventId?: typeof getRouterParam;
  getEventDetail?: typeof getAdminEventDetail;
};

export function createAdminEventDetailsHandler(
  dependencies: AdminEventDetailsHandlerDependencies = {},
) {
  const getEventId =
    dependencies.getEventId ||
    ((event, name) => {
      return getRouterParam(event, name);
    });
  const getEventDetail = dependencies.getEventDetail || getAdminEventDetail;

  return async ({ event }: { event: unknown }) => {
    const eventId = getEventId(
      event as Parameters<typeof getRouterParam>[0],
      "id",
    );

    if (!eventId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Event ID is required",
      });
    }

    return getEventDetail(eventId);
  };
}

export default defineAdminRoute(createAdminEventDetailsHandler());
