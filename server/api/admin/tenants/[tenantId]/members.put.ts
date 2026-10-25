import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { setTenantMember } from "~/server/services/tenants/tenantAdminService";

export default defineAdminRoute(async ({ event }) =>
  setTenantMember(getRouterParam(event, "tenantId") || "", await readBody(event)),
);
