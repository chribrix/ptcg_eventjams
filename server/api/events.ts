import {
  listPokedataCatalogEvents,
  parsePokedataSearchQuery,
  PokedataSearchInputError,
} from "~/server/services/events/pokedataSearchService";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const search = parsePokedataSearchQuery(query);
    const includeHidden = query.includeHidden === "1" || query.includeHidden === "true";
    const events = await listPokedataCatalogEvents(search, includeHidden);
    setResponseHeader(event, "Cache-Control", "no-store");
    return {
      success: true,
      totalFound: events.length,
      events,
      message: `Found ${events.length} events total, returning ${events.length} unique calendar events`,
    };
  } catch (error) {
    if (error instanceof PokedataSearchInputError) {
      throw createError({ statusCode: 400, statusMessage: error.message });
    }
    console.error("Pokedata event feed unavailable");
    throw createError({ statusCode: 500, statusMessage: "Event feed temporarily unavailable" });
  }
});
