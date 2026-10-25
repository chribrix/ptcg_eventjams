import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { removeTenantMember } from "~/server/services/tenants/tenantAdminService";

export default defineAdminRoute(async ({ event }) =>
  removeTenantMember(getRouterParam(event, "tenantId") || "", getRouterParam(event, "userId") || ""),
);
