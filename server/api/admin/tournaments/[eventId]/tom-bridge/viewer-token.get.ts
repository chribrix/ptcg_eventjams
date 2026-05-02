import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { buildTomViewerToken } from "~/server/services/events/tomViewerTokenService";

export default defineAdminRoute(async ({ event }) => {
  const eventId = getRouterParam(event, "eventId");
  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  }

  const query = getQuery(event);
  const playerUserId = String(query.playerUserId || "").trim();
  if (!playerUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: "playerUserId query parameter is required",
    });
  }

  const viewer = buildTomViewerToken(eventId, playerUserId);
  return {
    success: true,
    viewer,
    url: `/tournaments/${eventId}?viewer=${viewer}`,
  };
});
