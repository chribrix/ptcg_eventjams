import { getActivePrivacyVersion } from "~/server/services/legal/privacyAcknowledgementService";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  return { version: await getActivePrivacyVersion() };
});
