import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Validation schemas
const createPlayerSchema = z.object({
  playerId: z.string().min(1),
  name: z.string().min(1),
  birthDate: z.string().datetime(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

const updatePlayerSchema = z.object({
  name: z.string().min(1).optional(),
  birthDate: z.string().datetime().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const method = getMethod(event);
  const query = getQuery(event);

  try {
    switch (method) {
      case "GET":
        // Get all players or specific player by ID
        if (query.id) {
          const player = await prisma.player.findUnique({
            where: { id: query.id as string },
            include: {
              registrations: {
                include: {
                  customEvent: {
                    select: { id: true, name: true, eventDate: true },
                  },
                },
              },
            },
          });

          if (!player) {
            throw createError({
              statusCode: 404,
              statusMessage: "Player not found",
            });
          }

          return player;
        } else {
          // Get all players with pagination and search
          const page = parseInt((query.page as string) || "1");
          const limit = parseInt((query.limit as string) || "10");
          const skip = (page - 1) * limit;
          const search = query.search as string;

          const whereClause = search
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
              take: limit,
              orderBy: { name: "asc" },
            }),
            prisma.player.count({ where: whereClause }),
          ]);

          return {
            players,
            pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit),
            },
          };
        }

      case "POST":
        // Create new player
        const body = await readBody(event);
        const validatedData = createPlayerSchema.parse(body);

        // Check if player ID already exists
        const existingPlayer = await prisma.player.findUnique({
          where: { playerId: validatedData.playerId },
        });

        if (existingPlayer) {
          throw createError({
            statusCode: 409,
            statusMessage: "Player ID already exists",
          });
        }

        const newPlayer = await prisma.player.create({
          data: {
            ...validatedData,
            birthDate: new Date(validatedData.birthDate),
          },
        });

        return newPlayer;

      case "PUT":
        // Update existing player
        const playerId = query.id as string;
        if (!playerId) {
          throw createError({
            statusCode: 400,
            statusMessage: "Player ID is required",
          });
        }

        const updateBody = await readBody(event);
        const validatedUpdateData = updatePlayerSchema.parse(updateBody);

        const updatedPlayer = await prisma.player.update({
          where: { id: playerId },
          data: {
            ...validatedUpdateData,
            birthDate: validatedUpdateData.birthDate
              ? new Date(validatedUpdateData.birthDate)
              : undefined,
          },
        });

        return updatedPlayer;

      case "DELETE":
        // Delete player
        const deletePlayerId = query.id as string;
        if (!deletePlayerId) {
          throw createError({
            statusCode: 400,
            statusMessage: "Player ID is required",
          });
        }

        await prisma.player.delete({
          where: { id: deletePlayerId },
        });

        return { success: true, message: "Player deleted successfully" };

      default:
        throw createError({
          statusCode: 405,
          statusMessage: "Method not allowed",
        });
    }
  } catch (error: unknown) {
    console.error("Players API error:", error);

    // Handle Prisma errors
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2002") {
        throw createError({
          statusCode: 409,
          statusMessage: "Player with this name already exists",
        });
      }

      if (error.code === "P2025") {
        throw createError({
          statusCode: 404,
          statusMessage: "Player not found",
        });
      }
    }

    // Handle generic errors
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    throw createError({
      statusCode: 500,
      statusMessage: errorMessage,
    });
});
