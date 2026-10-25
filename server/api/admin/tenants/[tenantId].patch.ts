import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { renameTenant } from "~/server/services/tenants/tenantAdminService";

export default defineAdminRoute(async ({ event }) =>
  renameTenant(getRouterParam(event, "tenantId") || "", await readBody(event)),
);
