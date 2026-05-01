import prisma from "~/lib/prisma";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

export const createPlayerInputSchema = z.object({
  playerId: z
    .string()
    .min(1, "Player ID is required")
    .regex(/^\d+$/, "Player ID must contain only numbers"),
  name: z.string().min(1, "Name is required"),
  birthDate: z.string().datetime(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

export const updatePlayerInputSchema = z.object({
  name: z.string().min(1).optional(),
  birthDate: z.string().datetime().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

const playerDetailInclude = {
  registrations: {
    include: {
      customEvent: {
        select: { id: true, name: true, eventDate: true },
      },
    },
  },
} satisfies Prisma.PlayerInclude;

export async function getAdminPlayer(playerRecordId: string) {
  const player = await prisma.player.findUnique({
    where: { id: playerRecordId },
    include: playerDetailInclude,
  });

  if (!player) {
    throw createError({
      statusCode: 404,
      statusMessage: "Player not found",
    });
  }

  return player;
}

export async function listAdminPlayers(input: {
  page: number;
  limit: number;
  search?: string;
}) {
  const skip = (input.page - 1) * input.limit;
  const search = input.search?.trim();

  const whereClause: Prisma.PlayerWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { playerId: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [players, total] = await Promise.all([
    prisma.player.findMany({
      where: whereClause,
      skip,
      take: input.limit,
      orderBy: { name: "asc" },
    }),
    prisma.player.count({ where: whereClause }),
  ]);

  return {
    players,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      pages: Math.ceil(total / input.limit),
    },
  };
}

export async function createAdminPlayer(rawInput: unknown) {
  const input = createPlayerInputSchema.parse(rawInput);

  const existingPlayer = await prisma.player.findUnique({
    where: { playerId: input.playerId },
  });

  if (existingPlayer) {
    throw createError({
      statusCode: 409,
      statusMessage: "Player ID already exists",
    });
  }

  return prisma.player.create({
    data: {
      ...input,
      birthDate: new Date(input.birthDate),
    },
  });
}

export async function updateAdminPlayer(
  playerRecordId: string,
  rawInput: unknown,
) {
  const input = updatePlayerInputSchema.parse(rawInput);

  return prisma.player.update({
    where: { id: playerRecordId },
    data: {
      ...input,
      birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
    },
  });
}

export async function deleteAdminPlayer(playerRecordId: string) {
  const player = await prisma.player.findUnique({
    where: { id: playerRecordId },
    select: { id: true },
  });

  if (!player) {
    throw createError({
      statusCode: 404,
      statusMessage: "Player not found",
    });
  }

  await prisma.player.delete({
    where: { id: playerRecordId },
  });

  return {
    success: true,
    message: "Player deleted successfully",
  };
}
