import { requireAuthUser } from "~/server/services/auth/authService";
import { getActivePrivacyVersion, hasPrivacyAcknowledgement } from "~/server/services/legal/privacyAcknowledgementService";

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event);
  const version = await getActivePrivacyVersion();
  setResponseHeader(event, "Cache-Control", "no-store");
  return { version, acknowledged: !version || await hasPrivacyAcknowledgement("user", user.id, version) };
});
