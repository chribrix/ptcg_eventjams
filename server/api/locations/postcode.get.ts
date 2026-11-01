import { lookupPostcode, parsePostcodeLookup } from "~/server/services/geo/postcodeService";

export default defineEventHandler(async (event) => {
  let input: ReturnType<typeof parsePostcodeLookup>;
  try {
    const query = getQuery(event);
    input = parsePostcodeLookup(query.country, query.postcode);
  } catch {
    throw createError({ statusCode: 400, statusMessage: "Invalid postcode or country" });
  }
  let location;
  try {
    location = await lookupPostcode(input.country, input.postcode);
  } catch {
    throw createError({ statusCode: 503, statusMessage: "Postcode lookup temporarily unavailable" });
  }
  if (!location) throw createError({ statusCode: 404, statusMessage: "Postcode not found" });
  return location;
});
