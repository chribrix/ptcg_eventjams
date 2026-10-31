import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { listManagedTournaments } from "~/server/services/events/tournamentManagementService";

export default defineAdminRoute(async () => ({ events: await listManagedTournaments() }));
