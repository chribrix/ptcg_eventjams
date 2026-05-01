import { getPublishedLandingBanner } from "~/server/services/admin/adminBannerService";

export default defineEventHandler(async () => {
  return getPublishedLandingBanner();
});