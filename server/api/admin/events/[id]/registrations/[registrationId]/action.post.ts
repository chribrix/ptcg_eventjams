import { z } from "zod";
import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { updateAdminRegistrationAction } from "~/server/services/admin/eventAdminService";

const actionSchema = z.object({
  action: z.enum(["drop", "dq", "reinstate"]),
  reason: z.string().trim().max(500).optional(),
});

export default defineAdminRoute(async ({ event, adminUser }) => {
  const eventId = getRouterParam(event, "id");
  const registrationId = getRouterParam(event, "registrationId");

  if (!eventId || !registrationId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID and registration ID are required",
    });
  }

  const payload = actionSchema.parse(await readBody(event));

  return updateAdminRegistrationAction({
    eventId,
    registrationId,
    action: payload.action,
    reason: payload.reason,
    adminUserId: adminUser.id,
  });
});
