import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { verifyAdmin } from "../../middleware/admin";

const prisma = new PrismaClient();

// Helper function to validate datetime-local format
const validateDatetimeLocal = (value: string) => {
  // Allow empty string for optional fields
  if (!value || value.trim() === "") return true;

  // Check format: YYYY-MM-DDTHH:MM
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error("Invalid datetime format. Expected YYYY-MM-DDTHH:MM");
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  return true;
};

// Validation schemas
const createCustomEventSchema = z.object({
  name: z.string().min(1),
  venue: z.string().min(1),
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

const updateCustomEventSchema = z.object({
  name: z.string().min(1).optional(),
  venue: z.string().min(1).optional(),
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

export default defineEventHandler(async (event) => {
  const method = getMethod(event);
  const query = getQuery(event);

  try {
    switch (method) {
      case "GET":
        // Get all custom events or specific event by ID
        if (query.id) {
          const customEvent = await prisma.customEvent.findUnique({
            where: { id: query.id as string },
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
        } else {
          // Get all events with pagination
          const page = parseInt((query.page as string) || "1");
          const limit = parseInt((query.limit as string) || "10");
          const skip = (page - 1) * limit;

          const [events, total] = await Promise.all([
            prisma.customEvent.findMany({
              skip,
              take: limit,
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
              page,
              limit,
              total,
              pages: Math.ceil(total / limit),
            },
          };
        }

      case "POST":
        // Create new custom event
        const body = await readBody(event);
        const validatedData = createCustomEventSchema.parse(body);

        // Get authenticated admin user from middleware verification
        const adminUser = await verifyAdmin(event);

        const newEvent = await prisma.customEvent.create({
          data: {
            ...validatedData,
            eventDate: new Date(validatedData.eventDate),
            registrationDeadline:
              validatedData.registrationDeadline &&
              validatedData.registrationDeadline.trim() !== ""
                ? new Date(validatedData.registrationDeadline)
                : null,
            createdBy: adminUser.id,
          },
          include: {
            creator: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        return newEvent;

      case "PUT":
        // Update existing event
        const eventId = query.id as string;
        if (!eventId) {
          throw createError({
            statusCode: 400,
            statusMessage: "Event ID is required",
          });
        }

        const updateBody = await readBody(event);
        const validatedUpdateData = updateCustomEventSchema.parse(updateBody);

        const updatedEvent = await prisma.customEvent.update({
          where: { id: eventId },
          data: {
            ...validatedUpdateData,
            eventDate: validatedUpdateData.eventDate
              ? new Date(validatedUpdateData.eventDate)
              : undefined,
            registrationDeadline:
              validatedUpdateData.registrationDeadline &&
              validatedUpdateData.registrationDeadline.trim() !== ""
                ? new Date(validatedUpdateData.registrationDeadline)
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

        return updatedEvent;

      case "DELETE":
        // Delete event
        const deleteEventId = query.id as string;
        if (!deleteEventId) {
          throw createError({
            statusCode: 400,
            statusMessage: "Event ID is required",
          });
        }

        await prisma.customEvent.delete({
          where: { id: deleteEventId },
        });

        return { success: true, message: "Event deleted successfully" };

      default:
        throw createError({
          statusCode: 405,
          statusMessage: "Method not allowed",
        });
    }
  } catch (error: unknown) {
    console.error("Custom events API error:", error);

    // Handle Prisma errors
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2002") {
        throw createError({
          statusCode: 409,
          statusMessage: "Event with this name already exists",
        });
      }

      if (error.code === "P2025") {
        throw createError({
          statusCode: 404,
          statusMessage: "Event not found",
        });
      }
    }

    // Handle generic errors
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    throw createError({
      statusCode: 500,
      statusMessage: errorMessage,
    });
  }
});
