import { parseReverseCoordinates, reverseLocationName } from "~/server/services/geo/reverseLocationService";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const point = parseReverseCoordinates(query.latitude, query.longitude);
    setResponseHeader(event, "Cache-Control", "no-store");
    return await reverseLocationName(point.latitude, point.longitude);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid coordinates") {
      throw createError({ statusCode: 400, statusMessage: "Invalid coordinates" });
    }
    return { place: null, country: null };
  }
});
