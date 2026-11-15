import { z } from "zod";
import prisma from "~/lib/prisma";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const initialImprint = readFileSync(resolve(process.cwd(), "content/legal/impressum.de.txt"), "utf8");
const initialPrivacy = readFileSync(resolve(process.cwd(), "content/legal/datenschutz.de.txt"), "utf8");

const STATE_ID = "legal_pages_v1";
export const LEGAL_SLUGS = ["impressum", "datenschutz"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

const text = z.string().trim().max(20000);
const pageSchema = z.object({ body: text, published: z.boolean() });
const stateSchema = z.object({
  operatorName: z.string().trim().max(200),
  operatorAddress: z.string().trim().max(500),
  operatorEmail: z.string().trim().email().or(z.literal("")),
  operatorContact: z.string().trim().max(300),
  impressum: pageSchema,
  datenschutz: pageSchema,
});

export type LegalState = z.infer<typeof stateSchema>;

export const defaultLegalState = (): LegalState => ({
  operatorName: "",
  operatorAddress: "",
  operatorEmail: "",
  operatorContact: "",
  impressum: { body: initialImprint.trim(), published: false },
  datenschutz: { body: initialPrivacy, published: false },
});

export function parseLegalState(value: unknown): LegalState {
  const parsed = stateSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultLegalState();
}

export function validateLegalPublication(state: LegalState) {
  const hasLivePage = LEGAL_SLUGS.some((slug) => state[slug].published);
  if (hasLivePage && (!state.operatorName || !state.operatorAddress || !state.operatorEmail)) {
    throw new Error("Name, Anschrift und E-Mail müssen vor der Veröffentlichung ausgefüllt sein.");
  }
  for (const slug of LEGAL_SLUGS) {
    if (state[slug].published && (!state[slug].body || state[slug].body.includes("[["))) {
      throw new Error(`${slug}: Platzhalter entfernen und Text vervollständigen.`);
    }
  }
}

export async function getLegalState() {
  const record = await prisma.metaState.findUnique({ where: { id: STATE_ID } });
  return parseLegalState(record?.value);
}

export async function saveLegalState(value: unknown, actorId: string) {
  const state = stateSchema.parse(value);
  validateLegalPublication(state);
  await prisma.metaState.upsert({
    where: { id: STATE_ID },
    create: { id: STATE_ID, value: state, info: { updatedBy: actorId } },
    update: { value: state, info: { updatedBy: actorId } },
  });
  return state;
}

export async function getPublishedLegalPage(slug: LegalSlug) {
  const state = await getLegalState();
  return {
    published: state[slug].published,
    operatorName: state[slug].published ? state.operatorName : "",
    operatorAddress: state[slug].published ? state.operatorAddress : "",
    operatorEmail: state[slug].published ? state.operatorEmail : "",
    operatorContact: state[slug].published ? state.operatorContact : "",
    body: state[slug].published ? state[slug].body : "",
  };
}
