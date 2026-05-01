import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { listAdminCombinedEvents } from "~/server/services/admin/eventAdminService";

type CombinedEventsHandlerDependencies = {
  listCombinedEvents?: typeof listAdminCombinedEvents;
};

export function createAdminCombinedEventsHandler(
  dependencies: CombinedEventsHandlerDependencies = {},
) {
  const listCombinedEvents =
    dependencies.listCombinedEvents || listAdminCombinedEvents;

  return async () => {
    return listCombinedEvents();
  };
}

export default defineAdminRoute(createAdminCombinedEventsHandler());
