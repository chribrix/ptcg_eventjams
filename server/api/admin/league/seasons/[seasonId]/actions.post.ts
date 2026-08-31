import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import {
  addLeaguePlayerAlias,
  deleteLeagueEvent,
  importLeagueTournament,
  mergeLeaguePlayers,
  replaceLeaguePointRules,
  saveLeagueEvent,
  saveLeagueParticipation,
  updateLeaguePlayer,
} from "~/server/services/league/leagueService";
import { parseLeagueTdf } from "~/server/services/league/leagueTdfService";

export default defineAdminRoute(async ({ event, adminUser }) => {
  const seasonId = getRouterParam(event, "seasonId");
  if (!seasonId) throw createError({ statusCode: 400, statusMessage: "Season ID is required" });
  const body = await readBody<any>(event);

  switch (body?.action) {
    case "preview-import":
      if (!body.xml) throw createError({ statusCode: 400, statusMessage: "TDF/XML-Inhalt fehlt" });
      return parseLeagueTdf(body.xml);
    case "confirm-import": {
      if (!body.xml) throw createError({ statusCode: 400, statusMessage: "TDF/XML-Inhalt fehlt" });
      return importLeagueTournament({
        seasonId,
        tournament: parseLeagueTdf(body.xml),
        adminUserId: adminUser.id,
        sourceXml: body.xml,
        warningsConfirmed: Boolean(body.warningsConfirmed),
        review: body.review,
      });
    }
    case "replace-point-rules":
      return replaceLeaguePointRules(seasonId, body.rules || []);
    case "update-player":
      return updateLeaguePlayer(seasonId, body.playerId, body.player);
    case "add-player-alias":
      return addLeaguePlayerAlias(seasonId, body.playerId, body.alias || "");
    case "merge-players":
      return mergeLeaguePlayers(seasonId, body.sourceId, body.targetId, body.reason || "");
    case "save-event":
      return saveLeagueEvent(seasonId, body.event);
    case "delete-event":
      return deleteLeagueEvent(seasonId, body.eventId, body.reason || "");
    case "save-participation":
      return saveLeagueParticipation(seasonId, body.participation);
    default:
      throw createError({ statusCode: 400, statusMessage: "Unbekannte Liga-Aktion" });
  }
});