import { requireAuthUser } from "~/server/services/auth/authService";
import { recordPrivacyAcknowledgement, requireCurrentPrivacyVersion } from "~/server/services/legal/privacyAcknowledgementService";

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event);
  const body = await readBody<{ version?: string; acknowledged?: boolean }>(event);
  if (body?.acknowledged !== true) throw createError({ statusCode: 400, statusMessage: "Kenntnisnahme fehlt." });
  const version = await requireCurrentPrivacyVersion(body.version);
  await recordPrivacyAcknowledgement("user", user.id, version);
  return { success: true };
});
