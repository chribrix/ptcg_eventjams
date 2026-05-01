import prisma from "~/lib/prisma";
import { z } from "zod";

const overrideWriteSchema = z.object({
  eventName: z.string().min(1, "Event name is required"),
  eventDate: z.string().min(1, "Event date is required"),
  eventLocation: z.string().nullable().optional(),
  overrides: z.record(z.any()),
  notes: z.string().nullable().optional(),
  handleRegistrationLocally: z.boolean().optional(),
  maxParticipants: z.number().int().min(1).nullable().optional(),
  participationFee: z.number().min(0).nullable().optional(),
  registrationDeadline: z.string().datetime().nullable().optional(),
  requiresDecklist: z.boolean().optional(),
  description: z.string().nullable().optional(),
  hideFromCalendar: z.boolean().optional(),
  tagType: z.enum(["pokemon", "riftbound", "generic"]).nullable().optional(),
  tags: z.record(z.any()).nullable().optional(),
});

type OverrideWriteInput = z.infer<typeof overrideWriteSchema>;

async function invalidateDetailedEventsCache() {
  const storage = useStorage("cache");
  await storage.removeItem("pokedata:detailed-events");
}

export function buildExternalEventOverrideData(
  input: OverrideWriteInput,
  actorUserId: string,
) {
  return {
    eventName: input.eventName,
    eventDate: new Date(input.eventDate),
    eventLocation: input.eventLocation || null,
    overrides: input.overrides,
    createdBy: actorUserId,
    notes: input.notes || null,
    handleRegistrationLocally: input.handleRegistrationLocally || false,
    maxParticipants: input.handleRegistrationLocally
      ? input.maxParticipants || null
      : null,
    participationFee: input.handleRegistrationLocally
      ? (input.participationFee ?? null)
      : null,
    registrationDeadline:
      input.handleRegistrationLocally && input.registrationDeadline
        ? new Date(input.registrationDeadline)
        : null,
    requiresDecklist:
      input.handleRegistrationLocally && input.requiresDecklist === true,
    description:
      input.handleRegistrationLocally && input.description
        ? input.description
        : null,
    hideFromCalendar: input.hideFromCalendar || false,
    tagType: input.tagType || null,
    tags: input.tags || null,
  };
}

export async function listExternalEventOverrides() {
  const overrides = await prisma.externalEventOverride.findMany({
    include: {
      creator: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      eventDate: "asc",
    },
  });

  return {
    success: true,
    overrides,
  };
}

export async function createExternalEventOverride(
  rawInput: unknown,
  actorUserId: string,
) {
  const input = overrideWriteSchema.parse(rawInput);

  const override = await prisma.externalEventOverride.create({
    data: buildExternalEventOverrideData(input, actorUserId),
  });

  await invalidateDetailedEventsCache();

  return {
    success: true,
    override,
  };
}

export async function updateExternalEventOverride(
  overrideId: string,
  rawInput: unknown,
) {
  const input = overrideWriteSchema
    .partial()
    .parse(rawInput) as Partial<OverrideWriteInput>;
  const updateData: Record<string, unknown> = {};

  if (input.eventName !== undefined) updateData.eventName = input.eventName;
  if (input.eventDate !== undefined)
    updateData.eventDate = new Date(input.eventDate);
  if (input.eventLocation !== undefined)
    updateData.eventLocation = input.eventLocation || null;
  if (input.overrides !== undefined) updateData.overrides = input.overrides;
  if (input.notes !== undefined) updateData.notes = input.notes || null;
  if (input.handleRegistrationLocally !== undefined) {
    updateData.handleRegistrationLocally = input.handleRegistrationLocally;

    if (!input.handleRegistrationLocally) {
      updateData.maxParticipants = null;
      updateData.participationFee = null;
      updateData.registrationDeadline = null;
      updateData.requiresDecklist = false;
      updateData.description = null;
    }
  }

  if (input.maxParticipants !== undefined)
    updateData.maxParticipants = input.maxParticipants;
  if (input.participationFee !== undefined)
    updateData.participationFee = input.participationFee;
  if (input.registrationDeadline !== undefined) {
    updateData.registrationDeadline = input.registrationDeadline
      ? new Date(input.registrationDeadline)
      : null;
  }
  if (input.requiresDecklist !== undefined)
    updateData.requiresDecklist = input.requiresDecklist;
  if (input.description !== undefined)
    updateData.description = input.description || null;
  if (input.hideFromCalendar !== undefined)
    updateData.hideFromCalendar = input.hideFromCalendar;
  if (input.tagType !== undefined) updateData.tagType = input.tagType || null;
  if (input.tags !== undefined) updateData.tags = input.tags || null;

  const override = await prisma.externalEventOverride.update({
    where: { id: overrideId },
    data: updateData,
  });

  await invalidateDetailedEventsCache();

  return {
    success: true,
    override,
  };
}

export async function deleteExternalEventOverride(overrideId: string) {
  await prisma.externalEventOverride.delete({
    where: { id: overrideId },
  });

  await invalidateDetailedEventsCache();

  return {
    success: true,
    message: "Event override deleted successfully",
  };
}

export async function toggleExternalEventOverrideHidden(overrideId: string) {
  const currentOverride = await prisma.externalEventOverride.findUnique({
    where: { id: overrideId },
    select: { hideFromCalendar: true },
  });

  if (!currentOverride) {
    throw createError({
      statusCode: 404,
      statusMessage: "Event override not found",
    });
  }

  const override = await prisma.externalEventOverride.update({
    where: { id: overrideId },
    data: {
      hideFromCalendar: !currentOverride.hideFromCalendar,
    },
  });

  await invalidateDetailedEventsCache();

  return {
    success: true,
    override,
    hideFromCalendar: override.hideFromCalendar,
  };
}
