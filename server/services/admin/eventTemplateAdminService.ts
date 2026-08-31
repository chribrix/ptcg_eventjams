import prisma from "~/lib/prisma";
import { z } from "zod";
import { DEFAULT_EVENT_TIME_ZONE } from "~/utils/eventDateTime";

type AdminActor = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export const createEventTemplateInputSchema = z.object({
  name: z.string().min(1),
  venue: z.string().min(1),
  tagType: z.enum(["pokemon", "riftbound", "generic"]).default("pokemon"),
  tags: z.record(z.any()).optional(),
  maxParticipants: z.number().min(1),
  participationFee: z.number().optional(),
  description: z.string().optional(),
  requiresDecklist: z.boolean().default(false),
  // 0 = Sunday .. 6 = Saturday, matches JS Date#getDay()
  weekday: z.number().min(0).max(6),
  eventTime: z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:mm"),
  registrationDeadlineMinutesBefore: z.number().min(0).optional(),
  timeZone: z.string().min(1).optional(),
});

export const updateEventTemplateInputSchema = createEventTemplateInputSchema.partial();

async function ensureAdminUser(createdBy: AdminActor) {
  await prisma.adminUser.upsert({
    where: { id: createdBy.id },
    update: {
      email: createdBy.email || `${createdBy.id}@admin.local`,
      name:
        typeof createdBy.user_metadata?.name === "string"
          ? createdBy.user_metadata.name
          : null,
    },
    create: {
      id: createdBy.id,
      email: createdBy.email || `${createdBy.id}@admin.local`,
      name:
        typeof createdBy.user_metadata?.name === "string"
          ? createdBy.user_metadata.name
          : null,
    },
  });
}

export async function createAdminEventTemplate(
  rawInput: unknown,
  createdBy: AdminActor,
) {
  const input = createEventTemplateInputSchema.parse(rawInput);
  await ensureAdminUser(createdBy);

  return prisma.eventTemplate.create({
    data: {
      ...input,
      timeZone: input.timeZone || DEFAULT_EVENT_TIME_ZONE,
      createdBy: createdBy.id,
    },
  });
}

export async function listAdminEventTemplates() {
  return prisma.eventTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function updateAdminEventTemplate(id: string, rawInput: unknown) {
  const input = updateEventTemplateInputSchema.parse(rawInput);
  return prisma.eventTemplate.update({
    where: { id },
    data: input,
  });
}

export async function deleteAdminEventTemplate(id: string) {
  await prisma.eventTemplate.delete({ where: { id } });
  return { success: true };
}
