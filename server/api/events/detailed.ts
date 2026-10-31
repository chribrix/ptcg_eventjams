import {
  listPokedataCatalogEvents,
  parsePokedataSearchQuery,
  PokedataSearchInputError,
} from "~/server/services/events/pokedataSearchService";

export default defineEventHandler(async (event) => {
  try {
    const search = parsePokedataSearchQuery(getQuery(event));
    const events = await listPokedataCatalogEvents(search);
    setResponseHeader(event, "Cache-Control", "no-store");
    return { events };
  } catch (error) {
    if (error instanceof PokedataSearchInputError) {
      throw createError({ statusCode: 400, statusMessage: error.message });
    }
    console.error("Detailed Pokedata event feed unavailable");
    setResponseHeader(event, "Cache-Control", "no-store");
    return { events: [] };
  }
});
