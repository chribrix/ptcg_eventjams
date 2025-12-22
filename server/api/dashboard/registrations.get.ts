import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";
import { getEventTypeFromOverrides } from "~/utils/eventTypes";

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
      } catch (supabaseError) {
        console.log("Supabase auth failed:", supabaseError);
        // Continue without Supabase auth
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

    // Get all upcoming/current event registrations for this player
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
        tickets: {
          where: {
            status: {
              not: "cancelled", // Only include non-cancelled tickets
            },
          },
          select: {
            id: true,
            participantName: true,
            participantPlayerId: true,
            status: true,
            isAnonymous: true,
            decklist: true,
            bringingDecklistOnsite: true,
          },
        },
        customEvent: {
          select: {
            id: true,
            name: true,
            venue: true,
            eventType: true,
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

    // Filter out registrations with no active tickets
    const activeRegistrations = registrations.filter(
      (reg) => reg.tickets.length > 0
    );

    // Transform registrations to have a consistent structure
    const transformedRegistrations = activeRegistrations.map((reg) => {
      const isExternalEvent = !!reg.externalEventId;

      // Get overall status from tickets (all tickets must be registered for overall "registered" status)
      const allTicketsRegistered = reg.tickets.every(
        (t) => t.status === "registered"
      );
      const overallStatus = allTicketsRegistered ? "registered" : "reserved";

      // Check if any ticket has a decklist or will bring one onsite
      const hasDecklist = reg.tickets.some(
        (t) => t.decklist || t.bringingDecklistOnsite
      );
      const bringingDecklistOnsite = reg.tickets.some(
        (t) => t.bringingDecklistOnsite
      );

      if (isExternalEvent && reg.externalEvent) {
        const overrides = reg.externalEvent.overrides;

        // Use centralized event type utility
        const eventType = getEventTypeFromOverrides(overrides);

        return {
          id: reg.id,
          customEventId: reg.customEventId,
          externalEventId: reg.externalEventId,
          playerId: reg.playerId,
          registeredAt: reg.registeredAt,
          status: overallStatus,
          notes: null,
          decklist: hasDecklist ? "has_decklist" : null,
          bringingDecklistOnsite: bringingDecklistOnsite,
          ticketCount: reg.tickets.length,
          tickets: reg.tickets,
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
          eventType: eventType,
        };
      }

      return {
        id: reg.id,
        customEventId: reg.customEventId,
        externalEventId: reg.externalEventId,
        playerId: reg.playerId,
        registeredAt: reg.registeredAt,
        status: overallStatus,
        notes: null,
        decklist: hasDecklist ? "has_decklist" : null,
        bringingDecklistOnsite: bringingDecklistOnsite,
        ticketCount: reg.tickets.length,
        tickets: reg.tickets,
        customEvent: reg.customEvent,
        isExternalEvent: false,
        eventType: reg.customEvent?.eventType || "custom",
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
