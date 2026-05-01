import prisma from "~/lib/prisma";
import { z } from "zod";

const createRegistrationSchema = z.object({
  customEventId: z.string().min(1),
  playerId: z.string().min(1),
  notes: z.string().optional(),
});

const updateRegistrationSchema = z.object({
  status: z.enum(["registered", "attended", "no-show", "cancelled"]).optional(),
  notes: z.string().optional(),
});

export async function listAdminRegistrationsForEvent(eventId: string) {
  const registrations = await prisma.eventRegistration.findMany({
    where: { customEventId: eventId },
    include: {
      player: true,
      tickets: true,
      customEvent: {
        select: { id: true, name: true, eventDate: true },
      },
    },
    orderBy: { registeredAt: "asc" },
  });

  return {
    registrations: registrations.map((registration) => {
      const primaryTicket = registration.tickets?.[0];
      return {
        ...registration,
        decklist: primaryTicket?.decklist ?? null,
        bringingDecklistOnsite: primaryTicket?.bringingDecklistOnsite ?? false,
      };
    }),
  };
}

export async function createAdminRegistration(rawInput: unknown) {
  const input = createRegistrationSchema.parse(rawInput);

  const customEvent = await prisma.customEvent.findUnique({
    where: { id: input.customEventId },
  });

  if (!customEvent) {
    throw createError({
      statusCode: 404,
      statusMessage: "Event not found",
    });
  }

  const currentTicketCount = await prisma.registrationTicket.count({
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

  const player = await prisma.player.findUnique({
    where: { id: input.playerId },
  });

  if (!player) {
    throw createError({
      statusCode: 404,
      statusMessage: "Player not found",
    });
  }

  const existingRegistration = await prisma.eventRegistration.findUnique({
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

  return prisma.eventRegistration.create({
    data: input,
    include: {
      player: true,
      customEvent: {
        select: { id: true, name: true, eventDate: true },
      },
    },
  });
}

export async function updateAdminRegistration(
  registrationId: string,
  rawInput: unknown,
) {
  const input = updateRegistrationSchema.parse(rawInput);

  const registration = await prisma.eventRegistration.findUnique({
    where: { id: registrationId },
    select: { id: true },
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
    await prisma.registrationTicket.updateMany({
      where: { registrationId },
      data: { status: input.status },
    });
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
  await prisma.eventRegistration.delete({
    where: { id: registrationId },
  });

  return {
    success: true,
    message: "Registration cancelled successfully",
  };
}
