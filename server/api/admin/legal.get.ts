import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { getLegalState } from "~/server/services/legal/legalPageService";

export default defineAdminRoute(async () => getLegalState());
