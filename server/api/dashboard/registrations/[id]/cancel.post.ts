import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";
import {
  logError,
  logDatabaseError,
  logAuthError,
} from "~/server/util/errorLogger";

const CANCELLATION_DEADLINE_HOURS = 2;
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
    let supabaseUser = null;

    // Check for impersonation first
    const impersonatedUserId = event.context.impersonatedUserId;

    if (impersonatedUserId) {
      supabaseUser = {
        id: impersonatedUserId,
        email: "",
      } as any;
    } else {
      // Try Supabase authentication
      try {
        supabaseUser = await serverSupabaseUser(event);
      } catch {
        // Continue without Supabase auth
      }
    }

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
        tickets: {
          select: {
            id: true,
            participantName: true,
            status: true,
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

    // Check if all tickets are already cancelled
    const activeTickets = registration.tickets.filter(
      (t) => t.status !== "cancelled",
    );

    if (activeTickets.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "All tickets already cancelled",
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
      eventDate.getTime() - CANCELLATION_DEADLINE_HOURS * 60 * 60 * 1000,
    );

    if (now > cancellationDeadline) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Cancellation deadline has passed (2 hours before event)",
      });
    }

    // Cancel all active tickets for this registration
    await prisma.registrationTicket.updateMany({
      where: {
        registrationId: registrationId,
        status: {
          not: "cancelled",
        },
      },
      data: {
        status: "cancelled",
      },
    });

    // Log successful cancellation
    await prisma.errorLog.create({
      data: {
        errorType: "info_registration_cancelled",
        errorMessage: `User cancelled registration for event`,
        userEmail: registration.player.email,
        userId: supabaseUser.id,
        url: `/dashboard/registrations/${registrationId}/cancel`,
        metadata: {
          registrationId,
          eventName:
            registration.customEvent?.name ||
            registration.externalEvent?.eventName ||
            "Unknown Event",
          eventDate: eventData.eventDate,
          cancelledTickets: activeTickets.length,
        },
      },
    });

    return {
      success: true,
      message: "Registration cancelled successfully",
      registration: {
        id: registration.id,
        eventName:
          registration.customEvent?.name ||
          registration.externalEvent?.eventName ||
          "Unknown Event",
        eventDate: eventData.eventDate,
        cancelledAt: new Date().toISOString(),
        cancelledTickets: activeTickets.length,
      },
    };
  } catch (error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const statusCode = (error as any).statusCode;
      if (statusCode === 401 || statusCode === 404) {
        await logAuthError(
          event,
          error as Error,
          "registration_cancel_unauthorized",
        );
      } else if (statusCode >= 500) {
        await logDatabaseError(event, error as Error, "registration_cancel", {
          registrationId,
        });
      }
      throw error;
    }

    await logDatabaseError(event, error as Error, "registration_cancel", {
      registrationId,
    });
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to cancel registration",
    });
  }
});
