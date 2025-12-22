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

    // Try Supabase authentication
    try {
      supabaseUser = await serverSupabaseUser(event);
    } catch (supabaseError) {
      console.log("Supabase auth failed:", supabaseError);
      // Continue without Supabase auth
    }


    if (!supabaseUser) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    // Verify admin access
    const admin = await prisma.adminUser.findUnique({
      where: { id: supabaseUser.id },
    });

    if (!admin) {
      throw createError({
        statusCode: 403,
        statusMessage: "Admin access required",
      });
    }

    // Get all past events (regardless of status but prioritize completed/cancelled)
    const pastEvents = await prisma.customEvent.findMany({
      where: {
        eventDate: {
          lt: new Date(), // Events in the past
        },
      },
      include: {
        _count: {
          select: {
            registrations: true,
          },
        },
        registrations: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                playerId: true,
              },
            },
          },
          orderBy: [
            {
              // Order by placement first (if available)
              // This would require adding placement to EventRegistration model
            },
            {
              // Then by registration time
              registeredAt: "asc",
            },
          ],
        },
        // Include participant results if available
        customParticipants: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                playerId: true,
              },
            },
          },
          orderBy: {
            placement: "asc",
          },
        },
      },
      orderBy: {
        eventDate: "desc",
      },
    });

    // Transform the data for the frontend
    const eventHistory = pastEvents.map((customEvent) => ({
      id: customEvent.id,
      name: customEvent.name,
      venue: customEvent.venue,
      eventDate: customEvent.eventDate.toISOString(),
      participationFee: customEvent.participationFee?.toString(),
      description: customEvent.description,
      status: customEvent.status,
      requiresDecklist: customEvent.requiresDecklist,
      totalParticipants: customEvent._count.registrations,
      // Combine registration and participant data for a complete view
      participants: customEvent.registrations.map((registration) => {
        // Find corresponding participant result (if any)
        const participantResult = customEvent.customParticipants.find(
          (p) => p.playerId === registration.playerId
        );

        return {
          id: registration.id,
          status: registration.status,
          placement: participantResult?.placement,
          points: participantResult?.points,
          registeredAt: registration.registeredAt.toISOString(),
          player: registration.player,
        };
      }),
    }));

    return {
      data: eventHistory,
    };
  } catch (error) {
    console.error("Error fetching admin event history:", error);
    throw createError({
      statusCode: 500,
      statusMessage:
        "Failed to fetch event history: " +
        (error instanceof Error ? error.message : String(error)),
    });
  }
});
