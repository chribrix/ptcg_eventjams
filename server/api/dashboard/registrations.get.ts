import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "GET") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    let supabaseUser = null;

    // Try Supabase authentication FIRST (real auth takes priority)
    try {
      supabaseUser = await serverSupabaseUser(event);
    } catch (supabaseError) {
      console.log("Supabase auth failed:", supabaseError);
      // Continue without Supabase auth
    }

    // Only fallback to dev authentication if no Supabase user AND in development
    if (!supabaseUser && process.env.NODE_ENV !== "production") {
      const devUserId = getCookie(event, "dev-user-id");
      const devUserEmail = getCookie(event, "dev-user-email");

      if (devUserId && devUserEmail) {
        supabaseUser = {
          id: devUserId,
          email: devUserEmail,
        } as any;
      }
    }

    if (!supabaseUser) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    // Find the player by their Supabase user ID first, then by email as fallback
    let player = await prisma.player.findUnique({
      where: {
        playerId: supabaseUser.id,
      },
    });

    if (!player && supabaseUser.email) {
      // Try to find by email as fallback
      player = await prisma.player.findFirst({
        where: {
          email: supabaseUser.email.toLowerCase(),
        },
      });
    }

    if (!player) {
      // Return empty array if player doesn't exist yet
      return {
        data: [],
        error: null,
      };
    }

    // Get all upcoming/current event registrations for this player (including cancelled ones so they can re-register)
    const registrations = await prisma.eventRegistration.findMany({
      where: {
        playerId: player.id,
        OR: [
          {
            customEvent: {
              eventDate: {
                gte: new Date(), // Only future or current events
              },
            },
          },
          {
            externalEvent: {
              eventDate: {
                gte: new Date(), // Only future or current events
              },
            },
          },
        ],
      },
      include: {
        customEvent: {
          select: {
            id: true,
            name: true,
            venue: true,
            maxParticipants: true,
            participationFee: true,
            description: true,
            eventDate: true,
            registrationDeadline: true,
            status: true,
            requiresDecklist: true,
          },
        },
        externalEvent: {
          select: {
            id: true,
            eventName: true,
            eventLocation: true,
            eventDate: true,
            maxParticipants: true,
            participationFee: true,
            description: true,
            registrationDeadline: true,
            requiresDecklist: true,
            overrides: true,
          },
        },
      },
      orderBy: {
        registeredAt: "desc",
      },
    });

    // Transform registrations to have a consistent structure
    const transformedRegistrations = registrations.map((reg) => {
      const isExternalEvent = !!reg.externalEventId;

      if (isExternalEvent && reg.externalEvent) {
        const overrides = reg.externalEvent.overrides;

        // Helper function to determine event type from overrides
        const getEventType = (): string => {
          if (!overrides) return "custom";
          if (overrides.icon === "cup" || overrides.type === "cup")
            return "cup";
          if (overrides.icon === "challenge" || overrides.type === "challenge")
            return "challenge";
          if (overrides.icon === "local" || overrides.type === "local")
            return "local";
          return "custom";
        };

        return {
          id: reg.id,
          customEventId: reg.customEventId,
          externalEventId: reg.externalEventId,
          playerId: reg.playerId,
          registeredAt: reg.registeredAt,
          status: reg.status,
          notes: reg.notes,
          decklist: reg.decklist,
          bringingDecklistOnsite: reg.bringingDecklistOnsite,
          customEvent: {
            id: reg.externalEvent.id,
            name:
              overrides?.title ||
              overrides?.venue ||
              reg.externalEvent.eventName,
            venue:
              overrides?.venue ||
              reg.externalEvent.eventLocation ||
              reg.externalEvent.eventName,
            eventDate: reg.externalEvent.eventDate,
            maxParticipants: reg.externalEvent.maxParticipants || 0,
            participationFee:
              reg.externalEvent.participationFee?.toString() || null,
            description: reg.externalEvent.description,
            registrationDeadline: reg.externalEvent.registrationDeadline,
            status: "published",
            requiresDecklist: reg.externalEvent.requiresDecklist,
          },
          isExternalEvent: true,
          eventType: getEventType(),
        };
      }

      return {
        id: reg.id,
        customEventId: reg.customEventId,
        externalEventId: reg.externalEventId,
        playerId: reg.playerId,
        registeredAt: reg.registeredAt,
        status: reg.status,
        notes: reg.notes,
        decklist: reg.decklist,
        bringingDecklistOnsite: reg.bringingDecklistOnsite,
        customEvent: reg.customEvent,
        isExternalEvent: false,
        eventType: "custom",
      };
    });

    // Sort by event date
    transformedRegistrations.sort((a, b) => {
      const dateA = new Date(a.customEvent.eventDate);
      const dateB = new Date(b.customEvent.eventDate);
      return dateA.getTime() - dateB.getTime();
    });

    return {
      data: transformedRegistrations,
      error: null,
    };
  } catch (error) {
    console.error("Dashboard registrations error:", error);
    throw createError({
      statusCode: 500,
      statusMessage:
        "Internal server error: " +
        (error instanceof Error ? error.message : String(error)),
    });
  }
});
