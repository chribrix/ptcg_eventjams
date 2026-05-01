import prisma from "~/lib/prisma";
import { z } from "zod";
import { parseEventTags } from "~/types/eventTags";

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
});

const parseLocalDateTime = (dateTimeStr: string): Date => {
  return new Date(`${dateTimeStr}:00.000+01:00`);
};

const totalTickets = (registrations: { _count: { tickets: number } }[]) =>
  registrations.reduce((sum, registration) => sum + registration._count.tickets, 0);

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
      bringingDecklistOnsite:
        primaryTicket?.bringingDecklistOnsite ?? false,
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
      registrationDeadline: eventData.registrationDeadline?.toISOString() || null,
      createdAt: eventData.createdAt.toISOString(),
      updatedAt: eventData.updatedAt.toISOString(),
    },
    registrations,
  };
}

export async function listAdminCustomEvents(input: { page: number; limit: number }) {
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

  return prisma.customEvent.create({
    data: {
      ...input,
      eventDate: parseLocalDateTime(input.eventDate),
      registrationDeadline:
        input.registrationDeadline && input.registrationDeadline.trim() !== ""
          ? parseLocalDateTime(input.registrationDeadline)
          : null,
      createdBy,
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function updateAdminCustomEvent(
  eventId: string,
  rawInput: unknown,
) {
  const input = updateCustomEventInputSchema.parse(rawInput);

  return prisma.customEvent.update({
    where: { id: eventId },
    data: {
      ...input,
      eventDate: input.eventDate ? parseLocalDateTime(input.eventDate) : undefined,
      registrationDeadline:
        input.registrationDeadline && input.registrationDeadline.trim() !== ""
          ? parseLocalDateTime(input.registrationDeadline)
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

  const transformedExternalEvents = externalEventsWithRegistration.map((event) => {
    const overrides = event.overrides as Record<string, any>;
    const parsedTags = event.tags
      ? parseEventTags(event.tags, event.tagType || "pokemon")
      : overrides?.tags
        ? parseEventTags(overrides.tags, "pokemon")
        : { game: "Pokemon" };

    return {
      id: event.id,
      name: overrides.title || overrides.venue || event.eventName,
      venue: overrides.venue || event.eventName,
      maxParticipants: event.maxParticipants || 0,
      participationFee: event.participationFee || 0,
      description: event.description,
      eventDate: event.eventDate,
      registrationDeadline: event.registrationDeadline,
      status: new Date(event.eventDate) > new Date() ? "upcoming" : "completed",
      requiresDecklist: event.requiresDecklist,
      createdBy: event.createdBy,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      registrations: event.registrations,
      creator: event.creator,
      isExternalEvent: true,
      tagType: event.tagType || "pokemon",
      tags: event.tags || parsedTags,
      eventType: parsedTags.type || "custom",
      originalEventName: event.eventName,
      originalEventDate: event.eventDate,
      _count: {
        registrations: totalTickets(
          event.registrations as { _count: { tickets: number } }[],
        ),
      },
    };
  });

  const allEvents = [
    ...customEvents.map((event) => ({
      ...event,
      isExternalEvent: false,
      eventType: event.tags
        ? parseEventTags(event.tags, event.tagType).type || "custom"
        : "custom",
      _count: { registrations: totalTickets(event.registrations) },
    })),
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