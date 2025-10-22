import { PrismaClient } from "~/generated/prisma";
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

    let player = await prisma.player.findUnique({
      where: {
        playerId: supabaseUser.id,
      },
    });

    if (!player && supabaseUser.email) {
      player = await prisma.player.findFirst({
        where: {
          email: supabaseUser.email.toLowerCase(),
        },
      });
    }

    if (!player) {
      throw createError({
        statusCode: 404,
        statusMessage: "Player not found",
      });
    }

    const registration = await prisma.eventRegistration.findFirst({
      where: {
        id: registrationId,
        playerId: player.id,
      },
      include: {
        customEvent: {
          select: {
            id: true,
            name: true,
            eventDate: true,
            registrationDeadline: true,
            status: true,
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

    const eventDate = new Date(registration.customEvent.eventDate);
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
      include: {
        customEvent: {
          select: {
            name: true,
            eventDate: true,
          },
        },
      },
    });

    return {
      success: true,
      message: "Registration cancelled successfully",
      registration: {
        id: updatedRegistration.id,
        eventName: updatedRegistration.customEvent.name,
        eventDate: updatedRegistration.customEvent.eventDate,
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
