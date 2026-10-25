import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { listPlatformTenants } from "~/server/services/tenants/tenantAdminService";

export default defineAdminRoute(async () => ({ tenants: await listPlatformTenants() }));
