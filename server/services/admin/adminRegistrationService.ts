import prisma from "~/lib/prisma";
import { z } from "zod";
import { promoteWaitlistForEvent } from "~/server/services/events/waitlistService";

const createRegistrationSchema = z.object({
  eventId: z.string().min(1).optional(),
  customEventId: z.string().min(1).optional(),
  playerId: z.string().min(1).optional(),
  pokemonPlayerId: z.string().trim().regex(/^\d+$/, "Player ID must contain digits only").optional(),
  playerName: z.string().trim().min(1).optional(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  notes: z.string().optional(),
  target: z.enum(["registration", "waitlist"]).default("registration"),
}).refine((input) => input.eventId || input.customEventId, {
  message: "Event ID is required",
  path: ["eventId"],
}).refine((input) => input.playerId || (input.pokemonPlayerId && input.playerName && input.birthYear), {
  message: "Player ID, name and birth year are required",
  path: ["pokemonPlayerId"],
});

const updateRegistrationSchema = z.object({
  ticketId: z.string().min(1).optional(),
  status: z
    .enum(["registered", "reserved", "attended", "no-show", "cancelled"])
    .optional(),
  notes: z.string().optional(),
});

const updateWaitlistPrioritySchema = z.object({
  priority: z.number().int().min(-100).max(100),
});

export async function listAdminRegistrationsForEvent(eventId: string) {
  const registrations = await prisma.eventRegistration.findMany({
    where: {
      OR: [{ customEventId: eventId }, { externalEventId: eventId }],
    },
    include: {
      player: true,
      tickets: {
        where: {
          status: {
            not: "cancelled",
          },
        },
      },
      customEvent: {
        select: { id: true, name: true, eventDate: true },
      },
    },
    orderBy: { registeredAt: "asc" },
  });

  const waitlistDelegate = (prisma as any).waitlistEntry;
  const waitlist = waitlistDelegate
    ? await waitlistDelegate.findMany({
        where: {
          OR: [{ customEventId: eventId }, { externalEventId: eventId }],
          status: {
            in: ["waiting", "pending_claim"],
          },
        },
        include: {
          player: {
            select: {
              id: true,
              playerId: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ priority: "desc" }, { queuePositionAt: "asc" }],
      })
    : [];

  return {
    registrations: registrations.map((registration) => {
      const primaryTicket = registration.tickets?.[0];
      return {
        ...registration,
        decklist: primaryTicket?.decklist ?? null,
        bringingDecklistOnsite: primaryTicket?.bringingDecklistOnsite ?? false,
      };
    }),
    waitlist,
  };
}

export async function createAdminRegistration(rawInput: unknown) {
  const input = createRegistrationSchema.parse(rawInput);
  const eventId = input.eventId || input.customEventId!;

  return prisma.$transaction(async (tx) => {
    const customEvent = await tx.customEvent.findUnique({
      where: { id: eventId },
    });
    const externalEvent = customEvent
      ? null
      : await tx.externalEventOverride.findUnique({ where: { id: eventId } });

    if (!customEvent && !externalEvent) {
      throw createError({
        statusCode: 404,
        statusMessage: "Event not found",
      });
    }

    if (externalEvent && !externalEvent.handleRegistrationLocally) {
      throw createError({
        statusCode: 400,
        statusMessage: "External event does not use local registration",
      });
    }

    if (customEvent) {
      await tx.$queryRaw`SELECT id FROM public.custom_events WHERE id = ${eventId} FOR UPDATE`;
    } else {
      await tx.$queryRaw`SELECT id FROM public.external_event_overrides WHERE id = ${eventId} FOR UPDATE`;
    }

    let player = input.playerId
      ? await tx.player.findUnique({ where: { id: input.playerId } })
      : null;

    if (!input.playerId) {
      const pokemonPlayerId = input.pokemonPlayerId!;
      const playerName = input.playerName!;
      const birthYear = input.birthYear!;
      const existingPlayer = await tx.player.findUnique({
        where: { playerId: pokemonPlayerId },
      });

      player = existingPlayer
        ? await tx.player.update({
            where: { id: existingPlayer.id },
            data: { name: playerName, birthYear },
          })
        : await tx.player.create({
            data: {
              playerId: pokemonPlayerId,
              name: playerName,
              birthYear,
            },
          });
    }

    if (!player) {
      throw createError({
        statusCode: 404,
        statusMessage: "Player not found",
      });
    }

    const playerRecordId = player.id;

    const existingRegistration = customEvent
      ? await tx.eventRegistration.findUnique({
          where: {
            customEventId_playerId: { customEventId: eventId, playerId: playerRecordId },
          },
          include: { tickets: { where: { status: { not: "cancelled" } } } },
        })
      : await tx.eventRegistration.findUnique({
          where: {
            externalEventId_playerId: { externalEventId: eventId, playerId: playerRecordId },
          },
          include: { tickets: { where: { status: { not: "cancelled" } } } },
        });

    if (existingRegistration && existingRegistration.tickets.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: "Player already registered for this event",
      });
    }

    const waitlistDelegate = (tx as any).waitlistEntry;
    const eventKey = `${customEvent ? "custom" : "external"}:${eventId}`;

    if (input.target === "waitlist") {
      if (!waitlistDelegate) {
        throw createError({ statusCode: 503, statusMessage: "Waitlist is temporarily unavailable" });
      }

      const existingWaitlistEntry = await waitlistDelegate.findUnique({
        where: { eventKey_playerId: { eventKey, playerId: playerRecordId } },
      });
      const now = new Date();
      const data = {
        status: "waiting",
        queuePositionAt: now,
        notifiedAt: null,
        claimExpiresAt: null,
        confirmedAt: null,
      };

      return existingWaitlistEntry
        ? waitlistDelegate.update({ where: { id: existingWaitlistEntry.id }, data })
        : waitlistDelegate.create({
            data: {
              ...data,
              eventKey,
              customEventId: customEvent ? eventId : null,
              externalEventId: externalEvent ? eventId : null,
              playerId: playerRecordId,
            },
          });
    }

    const registration = existingRegistration
      ? await tx.eventRegistration.update({
          where: { id: existingRegistration.id },
          data: { notes: input.notes },
        })
      : await tx.eventRegistration.create({
          data: {
            customEventId: customEvent ? eventId : null,
            externalEventId: externalEvent ? eventId : null,
            playerId: playerRecordId,
            notes: input.notes,
          },
        });

    await tx.registrationTicket.create({
      data: {
        registrationId: registration.id,
        participantName: player.name,
        participantPlayerId: player.playerId || null,
        status: "registered",
      },
    });

    if (waitlistDelegate) {
      await waitlistDelegate.updateMany({
        where: { eventKey, playerId: playerRecordId, status: { in: ["waiting", "pending_claim"] } },
        data: { status: "confirmed", confirmedAt: new Date(), claimExpiresAt: null },
      });
    }

    return tx.eventRegistration.findUnique({
      where: { id: registration.id },
      include: {
        player: true,
        tickets: true,
        customEvent: { select: { id: true, name: true, eventDate: true } },
        externalEvent: { select: { id: true, eventName: true, eventDate: true } },
      },
    });
  });
}

export async function updateAdminRegistration(
  registrationId: string,
  rawInput: unknown,
) {
  const input = updateRegistrationSchema.parse(rawInput);

  const registration = await prisma.eventRegistration.findUnique({
    where: { id: registrationId },
    select: { id: true, customEventId: true, externalEventId: true },
  });

  if (!registration) {
    throw createError({
      statusCode: 404,
      statusMessage: "Registration not found",
    });
  }

  if (!input.status && input.notes === undefined) {
    return prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: {
        player: true,
        customEvent: {
          select: { id: true, name: true, eventDate: true },
        },
      },
    });
  }

  if (input.status) {
    if (input.ticketId) {
      const ticket = await prisma.registrationTicket.findFirst({
        where: {
          id: input.ticketId,
          registrationId,
        },
        select: { id: true },
      });

      if (!ticket) {
        throw createError({
          statusCode: 404,
          statusMessage: "Registration ticket not found",
        });
      }

      await prisma.registrationTicket.update({
        where: { id: input.ticketId },
        data: { status: input.status },
      });
    } else {
      await prisma.registrationTicket.updateMany({
        where: { registrationId },
        data: { status: input.status },
      });
    }
  }

  if (input.notes !== undefined) {
    await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { notes: input.notes },
    });
  }

  return prisma.eventRegistration.findUnique({
    where: { id: registrationId },
    include: {
      player: true,
      tickets: true,
      customEvent: {
        select: { id: true, name: true, eventDate: true },
      },
    },
  });
}

export async function deleteAdminRegistration(registrationId: string) {
  const registration = await prisma.eventRegistration.findUnique({
    where: { id: registrationId },
    include: {
      tickets: {
        where: {
          status: {
            not: "cancelled",
          },
        },
      },
    },
  });

  await prisma.eventRegistration.delete({
    where: { id: registrationId },
  });

  if (registration && registration.tickets.length > 0) {
    await promoteWaitlistForEvent(
      {
        customEventId: registration.customEventId,
        externalEventId: registration.externalEventId,
      },
      registration.tickets.length,
    );
  }

  return {
    success: true,
    message: "Registration cancelled successfully",
  };
}

export async function updateAdminWaitlistPriority(
  waitlistId: string,
  rawInput: unknown,
) {
  const waitlistDelegate = (prisma as any).waitlistEntry;
  if (!waitlistDelegate) {
    throw createError({
      statusCode: 503,
      statusMessage: "Waitlist is temporarily unavailable",
    });
  }

  const input = updateWaitlistPrioritySchema.parse(rawInput);

  const entry = await waitlistDelegate.findUnique({
    where: { id: waitlistId },
    select: { id: true, status: true },
  });

  if (!entry) {
    throw createError({
      statusCode: 404,
      statusMessage: "Waitlist entry not found",
    });
  }

  if (!["waiting", "pending_claim"].includes(entry.status)) {
    throw createError({
      statusCode: 409,
      statusMessage: "Cannot reprioritize inactive waitlist entry",
    });
  }

  return waitlistDelegate.update({
    where: { id: waitlistId },
    data: { priority: input.priority },
    include: {
      player: {
        select: {
          id: true,
          playerId: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
