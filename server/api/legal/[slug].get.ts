import { getPublishedLegalPage, LEGAL_SLUGS } from "~/server/services/legal/legalPageService";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug");
  if (!LEGAL_SLUGS.some((value) => value === slug)) throw createError({ statusCode: 404 });
  setResponseHeader(event, "Cache-Control", "no-store");
  return getPublishedLegalPage(slug as (typeof LEGAL_SLUGS)[number]);
});
