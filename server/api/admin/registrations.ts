import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Validation schemas
const createRegistrationSchema = z.object({
  customEventId: z.string().min(1),
  playerId: z.string().min(1),
  notes: z.string().optional(),
});

const updateRegistrationSchema = z.object({
  status: z.enum(["registered", "attended", "no-show", "cancelled"]).optional(),
  notes: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const method = getMethod(event);
  const query = getQuery(event);

  try {
    switch (method) {
      case "GET":
        // Get registrations for a specific event
        const eventId = query.eventId as string;
        if (!eventId) {
          throw createError({
            statusCode: 400,
            statusMessage: "Event ID is required",
          });
        }

        const registrations = await prisma.eventRegistration.findMany({
          where: { customEventId: eventId },
          include: {
            player: true,
            customEvent: {
              select: { id: true, name: true, eventDate: true },
            },
          },
          orderBy: { registeredAt: "asc" },
        });

        return { registrations };

      case "POST":
        // Register player for event
        const body = await readBody(event);
        const validatedData = createRegistrationSchema.parse(body);

        // Check if event exists and has capacity
        const customEvent = await prisma.customEvent.findUnique({
          where: { id: validatedData.customEventId },
          include: {
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

        if (customEvent._count.registrations >= customEvent.maxParticipants) {
          throw createError({
            statusCode: 409,
            statusMessage: "Event is full",
          });
        }

        // Check if player exists
        const player = await prisma.player.findUnique({
          where: { id: validatedData.playerId },
        });

        if (!player) {
          throw createError({
            statusCode: 404,
            statusMessage: "Player not found",
          });
        }

        // Check if already registered
        const existingRegistration = await prisma.eventRegistration.findUnique({
          where: {
            customEventId_playerId: {
              customEventId: validatedData.customEventId,
              playerId: validatedData.playerId,
            },
          },
        });

        if (existingRegistration) {
          throw createError({
            statusCode: 409,
            statusMessage: "Player already registered for this event",
          });
        }

        const newRegistration = await prisma.eventRegistration.create({
          data: validatedData,
          include: {
            player: true,
            customEvent: {
              select: { id: true, name: true, eventDate: true },
            },
          },
        });

        return newRegistration;

      case "PUT":
        // Update registration status
        const registrationId = query.id as string;
        if (!registrationId) {
          throw createError({
            statusCode: 400,
            statusMessage: "Registration ID is required",
          });
        }

        const updateBody = await readBody(event);
        const validatedUpdateData = updateRegistrationSchema.parse(updateBody);

        const updatedRegistration = await prisma.eventRegistration.update({
          where: { id: registrationId },
          data: validatedUpdateData,
          include: {
            player: true,
            customEvent: {
              select: { id: true, name: true, eventDate: true },
            },
          },
        });

        return updatedRegistration;

      case "DELETE":
        // Cancel registration
        const deleteRegistrationId = query.id as string;
        if (!deleteRegistrationId) {
          throw createError({
            statusCode: 400,
            statusMessage: "Registration ID is required",
          });
        }

        await prisma.eventRegistration.delete({
          where: { id: deleteRegistrationId },
        });

        return {
          success: true,
          message: "Registration cancelled successfully",
        };

      default:
        throw createError({
          statusCode: 405,
          statusMessage: "Method not allowed",
        });
    }
  } catch (error: any) {
    console.error("Event registrations API error:", error);

    if (error.code === "P2002") {
      throw createError({
        statusCode: 409,
        statusMessage: "Player already registered for this event",
      });
    }

    if (error.code === "P2025") {
      throw createError({
        statusCode: 404,
        statusMessage: "Registration not found",
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Internal server error",
    });
  }
});
