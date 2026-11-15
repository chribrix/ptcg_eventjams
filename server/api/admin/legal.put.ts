import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { saveLegalState } from "~/server/services/legal/legalPageService";

export default defineAdminRoute(async ({ event, adminUser }) => {
  const input = await readBody(event);
  try {
    return await saveLegalState(input, adminUser.id);
  } catch (error) {
    if (error instanceof Error && error.message.includes("vor der Veröffentlichung") || error instanceof Error && error.message.includes("Platzhalter")) {
      throw createError({ statusCode: 400, statusMessage: error.message });
    }
    throw error;
  }
});
