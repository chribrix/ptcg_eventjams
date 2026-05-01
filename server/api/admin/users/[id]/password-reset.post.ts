import { z } from "zod";
import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { sendAdminPasswordReset } from "~/server/services/admin/adminUserService";

const passwordResetSchema = z.object({
  redirectTo: z.string().url().optional(),
});

export default defineAdminRoute(async ({ event, adminUser }) => {
  const userId = getRouterParam(event, "id");
  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: "User ID is required",
    });
  }

  const body = passwordResetSchema.parse(await readBody(event));
  return sendAdminPasswordReset({
    actorUserId: adminUser.id,
    targetUserId: userId,
    redirectTo: body.redirectTo,
  });
});