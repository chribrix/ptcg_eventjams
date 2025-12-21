import { z } from "zod";
import prisma from "~/lib/prisma";

const registrationSchema = z.object({
  playerId: z.string().min(1, "Player ID is required").max(50),
  name: z.string().min(1, "Full name is required").max(100),
  email: z.string().email("Valid email is required").max(100),
  isAnonymous: z.boolean().optional().default(false),
});

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== "POST") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  const eventId = getRouterParam(event, "id");

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  }

  try {
    const body = await readBody(event);

    // Validate request body
    const validationResult = registrationSchema.safeParse(body);
    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid registration data",
        data: {
          message: validationResult.error.errors
            .map((e) => e.message)
            .join(", "),
        },
      });
    }

    const { playerId, name, email, isAnonymous } = validationResult.data;

    // Check if this is a custom event or an external event override
    let customEvent = await prisma.customEvent.findUnique({
      where: { id: eventId },
    });

    let externalEventOverride = null;
    let isExternalEvent = false;

    if (!customEvent) {
      // Try to find external event override with local registration
      externalEventOverride = await prisma.externalEventOverride.findUnique({
        where: { id: eventId },
      });

      if (
        !externalEventOverride ||
        !externalEventOverride.handleRegistrationLocally
      ) {
        throw createError({
          statusCode: 404,
          statusMessage: "Event not found",
        });
      }

      isExternalEvent = true;
    }

    // Get event details (either custom or external)
    const eventDate = isExternalEvent
      ? new Date(externalEventOverride!.eventDate)
      : new Date(customEvent!.eventDate);
    const maxParticipants = isExternalEvent
      ? externalEventOverride!.maxParticipants || 0
      : customEvent!.maxParticipants;
    const requiresDecklist = isExternalEvent
      ? externalEventOverride!.requiresDecklist
      : customEvent!.requiresDecklist;
    const eventName = isExternalEvent
      ? externalEventOverride!.eventName
      : customEvent!.name;

    // Check if event is in the future
    const now = new Date();
    if (eventDate < now) {
      throw createError({
        statusCode: 400,
        statusMessage: "Cannot register for past events",
        data: { message: "This event has already taken place" },
      });
    }

    // Note: Decklist validation is now handled on the dashboard after registration

    // Check current registration count (excluding cancelled registrations)
    const currentRegistrations = await prisma.eventRegistration.count({
      where: isExternalEvent
        ? {
            externalEventId: eventId,
            status: {
              not: "cancelled",
            },
          }
        : {
            customEventId: eventId,
            status: {
              not: "cancelled",
            },
          },
    });

    if (maxParticipants && currentRegistrations >= maxParticipants) {
      throw createError({
        statusCode: 400,
        statusMessage: "Event is full",
        data: { message: "This event has reached maximum capacity" },
      });
    }

    // Find player by playerId first, then by email
    let player = await prisma.player.findUnique({
      where: { playerId: playerId },
    });

    if (!player) {
      // Try to find by email as backup
      player = await prisma.player.findFirst({
        where: { email: email.toLowerCase() },
      });
    }

    if (!player) {
      // Create new player with provided playerId and name
      player = await prisma.player.create({
        data: {
          playerId: playerId,
          name: name,
          birthDate: new Date("2000-01-01"), // Temporary birthdate
          email: email.toLowerCase(),
        },
      });
    } else {
      // Update player info if provided
      player = await prisma.player.update({
        where: { id: player.id },
        data: {
          name: name,
          email: email.toLowerCase(),
        },
      });
    }

    // Check if a player with this playerId is already registered for this event
    const existingPlayerRegistration = await prisma.eventRegistration.findFirst(
      {
        where: isExternalEvent
          ? {
              externalEventId: eventId,
              status: {
                not: "cancelled",
              },
              player: {
                playerId: playerId,
              },
            }
          : {
              customEventId: eventId,
              status: {
                not: "cancelled",
              },
              player: {
                playerId: playerId,
              },
            },
        include: {
          player: {
            select: {
              playerId: true,
              name: true,
              email: true,
            },
          },
        },
      }
    );

    if (existingPlayerRegistration) {
      // Check if it's the same person (same email) trying to re-register
      if (
        existingPlayerRegistration.player.email?.toLowerCase() ===
        email.toLowerCase()
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: "Already registered",
          data: { message: "You are already registered for this event" },
        });
      } else {
        // Different person trying to use the same playerId
        throw createError({
          statusCode: 400,
          statusMessage: "Player ID already taken",
          data: {
            message: `Player ID "${playerId}" is already registered for this event by another participant. Please use a different Player ID.`,
          },
        });
      }
    }

    // Check if player is already registered for this event (excluding cancelled registrations)
    const existingRegistration = isExternalEvent
      ? await prisma.eventRegistration.findUnique({
          where: {
            externalEventId_playerId: {
              externalEventId: eventId,
              playerId: player.id,
            },
          },
        })
      : await prisma.eventRegistration.findUnique({
          where: {
            customEventId_playerId: {
              customEventId: eventId,
              playerId: player.id,
            },
          },
        });

    if (existingRegistration && existingRegistration.status !== "cancelled") {
      throw createError({
        statusCode: 400,
        statusMessage: "Already registered",
        data: { message: "You are already registered for this event" },
      });
    }

    // Create or update event registration
    // Set status based on whether event requires decklist
    const initialStatus = requiresDecklist ? "reserved" : "registered";

    let registration;

    if (existingRegistration && existingRegistration.status === "cancelled") {
      // Update the cancelled registration
      registration = await prisma.eventRegistration.update({
        where: { id: existingRegistration.id },
        data: {
          status: initialStatus,
          registeredAt: new Date(), // Update registration timestamp
          decklist: null, // Reset decklist
          bringingDecklistOnsite: false, // Reset onsite option
          notes: null, // Clear any notes
          isAnonymous: isAnonymous || false, // Set anonymous preference
        },
      });
    } else {
      // Create new registration
      registration = await prisma.eventRegistration.create({
        data: isExternalEvent
          ? {
              externalEventId: eventId,
              playerId: player.id,
              status: initialStatus,
              decklist: null,
              bringingDecklistOnsite: false,
              isAnonymous: isAnonymous || false,
            }
          : {
              customEventId: eventId,
              playerId: player.id,
              status: initialStatus,
              decklist: null,
              bringingDecklistOnsite: false,
              isAnonymous: isAnonymous || false,
            },
      });
    }

    return {
      success: true,
      message: "Registration successful",
      registration: {
        id: registration.id,
        playerName: name,
        playerId: playerId,
        email: email.toLowerCase(),
        eventName: eventName,
      },
    };
  } catch (error: unknown) {
    console.error("Registration error:", error);

    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Registration failed",
    });
  }
});
