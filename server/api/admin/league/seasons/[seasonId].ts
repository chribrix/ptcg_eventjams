import prisma from "~/lib/prisma";
import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { getLeagueSeasonView, parseLeagueDivision, updateLeagueSeason } from "~/server/services/league/leagueService";

export default defineAdminRoute(async ({ event }) => {
  const seasonId = getRouterParam(event, "seasonId");
  if (!seasonId) throw createError({ statusCode: 400, statusMessage: "Season ID is required" });
  if (getMethod(event) === "GET") return getLeagueSeasonView(seasonId, parseLeagueDivision(getQuery(event).division));
  if (getMethod(event) === "PATCH") return updateLeagueSeason(seasonId, await readBody(event));
  if (getMethod(event) === "DELETE") return prisma.leagueSeason.delete({ where: { id: seasonId } });
  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});