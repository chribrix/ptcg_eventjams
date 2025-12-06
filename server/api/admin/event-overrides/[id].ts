import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Override ID is required",
    });
  }

  // Update event override
  if (event.node.req.method === "PUT" || event.node.req.method === "PATCH") {
    try {
      const body = await readBody(event);
      const {
        eventName,
        eventDate,
        eventLocation,
        overrides,
        notes,
        handleRegistrationLocally,
        maxParticipants,
        participationFee,
        registrationDeadline,
        requiresDecklist,
        description,
      } = body;

      const updateData: any = {};

      if (eventName !== undefined) updateData.eventName = eventName;
      if (eventDate !== undefined) updateData.eventDate = new Date(eventDate);
      if (eventLocation !== undefined) updateData.eventLocation = eventLocation;
      if (overrides !== undefined) updateData.overrides = overrides;
      if (notes !== undefined) updateData.notes = notes;
      if (handleRegistrationLocally !== undefined)
        updateData.handleRegistrationLocally = handleRegistrationLocally;
      if (maxParticipants !== undefined)
        updateData.maxParticipants = maxParticipants;
      if (participationFee !== undefined)
        updateData.participationFee = participationFee;
      if (registrationDeadline !== undefined)
        updateData.registrationDeadline = registrationDeadline
          ? new Date(registrationDeadline)
          : null;
      if (requiresDecklist !== undefined)
        updateData.requiresDecklist = requiresDecklist;
      if (description !== undefined) updateData.description = description;

      const override = await prisma.externalEventOverride.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        override,
      };
    } catch (error: any) {
      console.error("Error updating event override:", error);

      if (error.code === "P2025") {
        throw createError({
          statusCode: 404,
          statusMessage: "Event override not found",
        });
      }

      if (error.code === "P2002") {
        throw createError({
          statusCode: 409,
          statusMessage: "Override already exists for this event name and date",
        });
      }

      throw createError({
        statusCode: 500,
        statusMessage: error.message || "Failed to update event override",
      });
    }
  }

  // Delete event override
  if (event.node.req.method === "DELETE") {
    try {
      await prisma.externalEventOverride.delete({
        where: { id },
      });

      return {
        success: true,
        message: "Event override deleted successfully",
      };
    } catch (error: any) {
      console.error("Error deleting event override:", error);

      if (error.code === "P2025") {
        throw createError({
          statusCode: 404,
          statusMessage: "Event override not found",
        });
      }

      throw createError({
        statusCode: 500,
        statusMessage: error.message || "Failed to delete event override",
      });
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
