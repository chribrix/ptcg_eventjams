import prisma from "~/lib/prisma";
import { z } from "zod";
import {
  projectAdminCustomEvent,
  projectAdminExternalOverrideEvent,
} from "~/server/services/events/eventProjectionService";
import { rememberVenueDirectoryEntry } from "~/server/services/admin/venueAdminService";
import {
  DEFAULT_EVENT_TIME_ZONE,
  parseDateTimeLocalInput,
} from "~/utils/eventDateTime";

const validateDatetimeLocal = (value: string) => {
  if (!value || value.trim() === "") {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error("Invalid datetime format. Expected YYYY-MM-DDTHH:MM");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }

  return true;
};

export const createCustomEventInputSchema = z.object({
  name: z.string().min(1),
  venue: z.string().min(1),
  tagType: z.enum(["pokemon", "riftbound", "generic"]).default("pokemon"),
  tags: z.record(z.any()).optional(),
  maxParticipants: z.number().min(1),
  participationFee: z.number().optional(),
  description: z.string().optional(),
  eventDate: z
    .string()
    .min(1)
    .refine(validateDatetimeLocal, "Invalid datetime format"),
  registrationDeadline: z
    .string()
    .refine(validateDatetimeLocal, "Invalid datetime format")
    .optional(),
  requiresDecklist: z.boolean().default(false),
  timeZone: z.string().min(1).optional(),
});

export const updateCustomEventInputSchema = z.object({
  name: z.string().min(1).optional(),
  venue: z.string().min(1).optional(),
  tagType: z.enum(["pokemon", "riftbound", "generic"]).optional(),
  tags: z.record(z.any()).optional(),
  maxParticipants: z.number().min(1).optional(),
  participationFee: z.number().optional(),
  description: z.string().optional(),
  eventDate: z
    .string()
    .refine(validateDatetimeLocal, "Invalid datetime format")
    .optional(),
  registrationDeadline: z
    .string()
    .refine(validateDatetimeLocal, "Invalid datetime format")
    .optional(),
  requiresDecklist: z.boolean().optional(),
  status: z.enum(["upcoming", "ongoing", "completed", "cancelled"]).optional(),
  timeZone: z.string().min(1).optional(),
});

export async function getAdminCustomEvent(eventId: string) {
  const customEvent = await prisma.customEvent.findUnique({
    where: { id: eventId },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      registrations: {
        include: {
          player: true,
        },
      },
      _count: {
        select: { registrations: true },
      },
    },
  });

  if (!customEvent) {
    throw createError({
      statusCode: 404,
      statusMessage: "Event not found",
    });
  }

  return customEvent;
}

export async function getAdminEventDetail(eventId: string) {
  const customEvent = await prisma.customEvent.findUnique({
    where: { id: eventId },
    include: {
      registrations: {
        include: {
          player: {
            select: {
              id: true,
              playerId: true,
              name: true,
              email: true,
              birthDate: true,
            },
          },
          tickets: true,
        },
        orderBy: {
          registeredAt: "asc",
        },
      },
    },
  });

  if (!customEvent) {
    throw createError({
      statusCode: 404,
      statusMessage: "Event not found",
    });
  }

  const registrations = customEvent.registrations.map((registration) => {
    const primaryTicket = registration.tickets?.[0];
    return {
      id: registration.id,
      playerId: registration.playerId,
      registeredAt: registration.registeredAt.toISOString(),
      decklist: primaryTicket?.decklist ?? null,
      bringingDecklistOnsite: primaryTicket?.bringingDecklistOnsite ?? false,
      tickets: registration.tickets.map((ticket) => ({
        id: ticket.id,
        participantName: ticket.participantName,
        participantPlayerId: ticket.participantPlayerId ?? null,
        status: ticket.status,
        decklist: ticket.decklist ?? null,
        bringingDecklistOnsite: ticket.bringingDecklistOnsite ?? false,
      })),
      player: {
        id: registration.player.id,
        playerId: registration.player.playerId,
        name: registration.player.name,
        email: registration.player.email,
        birthDate: registration.player.birthDate.toISOString(),
      },
    };
  });

  const { registrations: _registrations, ...eventData } = customEvent;

  return {
    success: true,
    event: {
      ...eventData,
      eventDate: eventData.eventDate.toISOString(),
      registrationDeadline:
        eventData.registrationDeadline?.toISOString() || null,
      createdAt: eventData.createdAt.toISOString(),
      updatedAt: eventData.updatedAt.toISOString(),
    },
    registrations,
  };
}

export async function listAdminCustomEvents(input: {
  page: number;
  limit: number;
}) {
  const skip = (input.page - 1) * input.limit;

  const [events, total] = await Promise.all([
    prisma.customEvent.findMany({
      skip,
      take: input.limit,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { registrations: true },
        },
      },
      orderBy: { eventDate: "asc" },
    }),
    prisma.customEvent.count(),
  ]);

  return {
    events,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      pages: Math.ceil(total / input.limit),
    },
  };
}

export async function createAdminCustomEvent(
  rawInput: unknown,
  createdBy: string,
) {
  const input = createCustomEventInputSchema.parse(rawInput);
  const { timeZone = DEFAULT_EVENT_TIME_ZONE, ...eventInput } = input;

  const createdEvent = await prisma.customEvent.create({
    data: {
      ...eventInput,
      eventDate: parseDateTimeLocalInput(eventInput.eventDate, timeZone),
      registrationDeadline:
        eventInput.registrationDeadline &&
        eventInput.registrationDeadline.trim() !== ""
          ? parseDateTimeLocalInput(eventInput.registrationDeadline, timeZone)
          : null,
      createdBy,
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  await rememberVenueDirectoryEntry(
    typeof eventInput.tags?.host === "string" ? eventInput.tags.host : null,
    eventInput.venue,
  );

  return createdEvent;
}

export async function updateAdminCustomEvent(
  eventId: string,
  rawInput: unknown,
) {
  const input = updateCustomEventInputSchema.parse(rawInput);
  const { timeZone = DEFAULT_EVENT_TIME_ZONE, ...eventInput } = input;

  const updatedEvent = await prisma.customEvent.update({
    where: { id: eventId },
    data: {
      ...eventInput,
      eventDate: eventInput.eventDate
        ? parseDateTimeLocalInput(eventInput.eventDate, timeZone)
        : undefined,
      registrationDeadline:
        eventInput.registrationDeadline &&
        eventInput.registrationDeadline.trim() !== ""
          ? parseDateTimeLocalInput(eventInput.registrationDeadline, timeZone)
          : null,
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: { registrations: true },
      },
    },
  });

  const organizationName =
    typeof eventInput.tags?.host === "string"
      ? eventInput.tags.host
      : updatedEvent.tags &&
          typeof updatedEvent.tags === "object" &&
          !Array.isArray(updatedEvent.tags) &&
          typeof (updatedEvent.tags as Record<string, unknown>).host === "string"
        ? ((updatedEvent.tags as Record<string, unknown>).host as string)
        : null;

  await rememberVenueDirectoryEntry(organizationName, updatedEvent.venue);

  return updatedEvent;
}

export async function deleteAdminCustomEvent(eventId: string) {
  await prisma.customEvent.delete({
    where: { id: eventId },
  });

  return {
    success: true,
    message: "Event deleted successfully",
  };
}

export async function listAdminCombinedEvents() {
  const [customEvents, externalEventsWithRegistration] = await Promise.all([
    prisma.customEvent.findMany({
      include: {
        registrations: {
          include: {
            player: true,
            _count: {
              select: { tickets: { where: { status: { not: "cancelled" } } } },
            },
          },
        },
        creator: {
          select: { name: true, email: true },
        },
      },
      orderBy: { eventDate: "desc" },
    }),
    prisma.externalEventOverride.findMany({
      where: {
        handleRegistrationLocally: true,
      },
      include: {
        registrations: {
          include: {
            player: true,
            _count: {
              select: { tickets: { where: { status: { not: "cancelled" } } } },
            },
          },
        },
        creator: {
          select: { name: true, email: true },
        },
      },
      orderBy: { eventDate: "desc" },
    }),
  ]);

  const transformedExternalEvents = externalEventsWithRegistration.map(
    projectAdminExternalOverrideEvent,
  );

  const allEvents = [
    ...customEvents.map(projectAdminCustomEvent),
    ...transformedExternalEvents,
  ].sort(
    (left, right) =>
      new Date(right.eventDate).getTime() - new Date(left.eventDate).getTime(),
  );

  return {
    success: true,
    events: allEvents,
  };
}
