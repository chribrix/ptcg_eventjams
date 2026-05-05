import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import {
  createAdminRegistration,
  deleteAdminRegistration,
  listAdminRegistrationsForEvent,
  updateAdminRegistration,
  updateAdminWaitlistPriority,
} from "~/server/services/admin/adminRegistrationService";

export default defineAdminRoute(async ({ event }) => {
  const method = getMethod(event);
  const query = getQuery(event);

  switch (method) {
    case "GET": {
      const eventId = query.eventId as string;
      if (!eventId) {
        throw createError({
          statusCode: 400,
          statusMessage: "Event ID is required",
        });
      }
      return listAdminRegistrationsForEvent(eventId);
    }
    case "POST": {
      const body = await readBody(event);
      return createAdminRegistration(body);
    }
    case "PUT": {
      const waitlistId = query.waitlistId as string | undefined;
      const body = await readBody(event);

      if (waitlistId) {
        return updateAdminWaitlistPriority(waitlistId, body);
      }

      const registrationId = query.id as string;
      if (!registrationId) {
        throw createError({
          statusCode: 400,
          statusMessage: "Registration ID is required",
        });
      }
      return updateAdminRegistration(registrationId, body);
    }
    case "DELETE": {
      const registrationId = query.id as string;
      if (!registrationId) {
        throw createError({
          statusCode: 400,
          statusMessage: "Registration ID is required",
        });
      }
      return deleteAdminRegistration(registrationId);
    }
    default:
      throw createError({
        statusCode: 405,
        statusMessage: "Method not allowed",
      });
  }
});
