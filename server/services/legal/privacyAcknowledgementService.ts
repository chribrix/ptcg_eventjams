import { createHash } from "node:crypto";
import prisma from "~/lib/prisma";
import { getLegalState } from "./legalPageService";

const recordId = (scope: string, identity: string) =>
  `privacy_ack_${createHash("sha256").update(`${scope}:${identity}`).digest("hex")}`;

export async function getActivePrivacyVersion() {
  const state = await getLegalState();
  if (!state.datenschutz.published) return null;
  return createHash("sha256")
    .update(JSON.stringify([state.datenschutz.body, state.operatorName, state.operatorAddress, state.operatorEmail, state.operatorContact]))
    .digest("hex");
}

export async function requireCurrentPrivacyVersion(version: unknown) {
  const current = await getActivePrivacyVersion();
  if (current && version !== current) {
    throw createError({ statusCode: 428, statusMessage: "Bitte lies die aktuelle Datenschutzerklärung und bestätige die Kenntnisnahme." });
  }
  return current;
}

export async function hasPrivacyAcknowledgement(scope: string, identity: string, version: string) {
  const record = await prisma.metaState.findUnique({ where: { id: recordId(scope, identity) } });
  return (record?.value as { version?: string } | null)?.version === version;
}

export async function recordPrivacyAcknowledgement(scope: string, identity: string, version: string | null) {
  if (!version) return;
  const id = recordId(scope, identity);
  const value = { version, acknowledgedAt: new Date().toISOString() };
  await prisma.metaState.upsert({
    where: { id },
    create: { id, value },
    update: { value },
  });
}
