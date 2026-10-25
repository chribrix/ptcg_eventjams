import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { createDraftTenant } from "~/server/services/tenants/tenantAdminService";

export default defineAdminRoute(async ({ event }) => createDraftTenant(await readBody(event)));
