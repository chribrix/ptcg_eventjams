import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  // Get all event overrides
  if (event.node.req.method === "GET") {
    try {
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
    } catch (error) {
      console.error("Error fetching event overrides:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch event overrides",
      });
    }
  }

  // Create new event override
  if (event.node.req.method === "POST") {
    try {
      const body = await readBody(event);
      const {
        eventName,
        eventDate,
        eventLocation,
        overrides,
        createdBy,
        notes,
        handleRegistrationLocally,
        maxParticipants,
        participationFee,
        registrationDeadline,
        requiresDecklist,
        description,
        hideFromCalendar,
      } = body;

      // Validate required fields
      if (!eventName || !eventDate || !createdBy || !overrides) {
        throw createError({
          statusCode: 400,
          statusMessage:
            "Missing required fields: eventName, eventDate, createdBy, overrides",
        });
      }

      const override = await prisma.externalEventOverride.create({
        data: {
          eventName,
          eventDate: new Date(eventDate),
          eventLocation,
          overrides,
          createdBy,
          notes,
          handleRegistrationLocally: handleRegistrationLocally || false,
          maxParticipants: maxParticipants || null,
          participationFee: participationFee || null,
          registrationDeadline: registrationDeadline
            ? new Date(registrationDeadline)
            : null,
          requiresDecklist: requiresDecklist || false,
          description: description || null,
          hideFromCalendar: hideFromCalendar || false,
        },
      });

      return {
        success: true,
        override,
      };
    } catch (error: any) {
      console.error("Error creating event override:", error);

      if (error.code === "P2002") {
        throw createError({
          statusCode: 409,
          statusMessage: "Override already exists for this event name and date",
        });
      }

      throw createError({
        statusCode: 500,
        statusMessage: error.message || "Failed to create event override",
      });
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
