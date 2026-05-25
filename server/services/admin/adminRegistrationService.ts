import prisma from "~/lib/prisma";
import { z } from "zod";
import { promoteWaitlistForEvent } from "~/server/services/events/waitlistService";

const createRegistrationSchema = z.object({
  customEventId: z.string().min(1),
  playerId: z.string().min(1),
  notes: z.string().optional(),
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

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM public.custom_events WHERE id = ${input.customEventId} FOR UPDATE`;

    const customEvent = await tx.customEvent.findUnique({
      where: { id: input.customEventId },
    });

    if (!customEvent) {
      throw createError({
        statusCode: 404,
        statusMessage: "Event not found",
      });
    }

    const currentTicketCount = await tx.registrationTicket.count({
      where: {
        registration: {
          customEventId: input.customEventId,
        },
        status: {
          not: "cancelled",
        },
      },
    });

    if (currentTicketCount >= customEvent.maxParticipants) {
      throw createError({
        statusCode: 409,
        statusMessage: "Event is full",
      });
    }

    const player = await tx.player.findUnique({
      where: { id: input.playerId },
    });

    if (!player) {
      throw createError({
        statusCode: 404,
        statusMessage: "Player not found",
      });
    }

    const existingRegistration = await tx.eventRegistration.findUnique({
      where: {
        customEventId_playerId: {
          customEventId: input.customEventId,
          playerId: input.playerId,
        },
      },
    });

    if (existingRegistration) {
      throw createError({
        statusCode: 409,
        statusMessage: "Player already registered for this event",
      });
    }

    return tx.eventRegistration.create({
      data: input,
      include: {
        player: true,
        customEvent: {
          select: { id: true, name: true, eventDate: true },
        },
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
