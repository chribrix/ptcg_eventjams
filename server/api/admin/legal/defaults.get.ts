import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { defaultLegalState } from "~/server/services/legal/legalPageService";

export default defineAdminRoute(async () => {
  const state = defaultLegalState();
  return { impressum: state.impressum.body, datenschutz: state.datenschutz.body };
});
