import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";

const CANCELLATION_DEADLINE_HOURS = 24;
const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const registrationId = getRouterParam(event, "id");

  if (!registrationId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Registration ID is required",
    });
  }

  try {
    const supabaseUser = await serverSupabaseUser(event);

    if (!supabaseUser) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    // Find the registration by ID and verify ownership in one secure step
    // Only fetch registrations that belong to the authenticated user's email
    const registration = await prisma.eventRegistration.findFirst({
      where: {
        id: registrationId,
        player: {
          email: supabaseUser.email?.toLowerCase(),
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
        customEvent: {
          select: {
            id: true,
            name: true,
            eventDate: true,
            registrationDeadline: true,
            status: true,
          },
        },
        externalEvent: {
          select: {
            id: true,
            eventName: true,
            eventDate: true,
            registrationDeadline: true,
          },
        },
      },
    });

    if (!registration) {
      throw createError({
        statusCode: 404,
        statusMessage: "Registration not found or access denied",
      });
    }

    if (registration.status === "cancelled") {
      throw createError({
        statusCode: 400,
        statusMessage: "Registration already cancelled",
      });
    }

    // Get event details from either customEvent or externalEvent
    const eventData = registration.customEvent || registration.externalEvent;

    if (!eventData) {
      throw createError({
        statusCode: 400,
        statusMessage: "Event not found for this registration",
      });
    }

    const eventDate = new Date(eventData.eventDate);
    const now = new Date();

    if (eventDate < now) {
      throw createError({
        statusCode: 400,
        statusMessage: "Cannot cancel registration for past events",
      });
    }

    const cancellationDeadline = new Date(
      eventDate.getTime() - CANCELLATION_DEADLINE_HOURS * 60 * 60 * 1000
    );

    if (now > cancellationDeadline) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Cancellation deadline has passed (24 hours before event)",
      });
    }

    const updatedRegistration = await prisma.eventRegistration.update({
      where: {
        id: registrationId,
      },
      data: {
        status: "cancelled",
        notes: registration.notes
          ? `${
              registration.notes
            }\n\nCancelled by player on ${new Date().toISOString()}`
          : `Cancelled by player on ${new Date().toISOString()}`,
      },
    });

    return {
      success: true,
      message: "Registration cancelled successfully",
      registration: {
        id: updatedRegistration.id,
        eventName:
          registration.customEvent?.name ||
          registration.externalEvent?.eventName ||
          "Unknown Event",
        eventDate: eventData.eventDate,
        cancelledAt: new Date().toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("Registration cancellation error:", error);

    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to cancel registration",
    });
  }
});
