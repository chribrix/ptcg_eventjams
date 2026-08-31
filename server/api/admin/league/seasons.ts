import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { createLeagueSeason, listLeagueSeasons } from "~/server/services/league/leagueService";

export default defineAdminRoute(async ({ event }) => {
  if (getMethod(event) === "GET") return listLeagueSeasons();
  if (getMethod(event) === "POST") return createLeagueSeason(await readBody(event));
  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});