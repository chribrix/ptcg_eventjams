import { z } from "zod";
import prisma from "~/lib/prisma";

const registrationSchema = z.object({
  playerId: z.string().min(1, "Player ID is required").max(50),
  name: z.string().min(1, "Full name is required").max(100),
  email: z.string().email("Valid email is required").max(100),
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

    const { playerId, name, email } = validationResult.data;

    // Check if event exists
    const customEvent = await prisma.customEvent.findUnique({
      where: { id: eventId },
    });

    if (!customEvent) {
      throw createError({
        statusCode: 404,
        statusMessage: "Event not found",
      });
    }

    // Check if event is in the future
    const eventDate = new Date(customEvent.eventDate);
    const now = new Date();
    if (eventDate < now) {
      throw createError({
        statusCode: 400,
        statusMessage: "Cannot register for past events",
        data: { message: "This event has already taken place" },
      });
    }

    // Check current registration count
    const currentRegistrations = await prisma.eventRegistration.count({
      where: { customEventId: eventId },
    });

    if (currentRegistrations >= customEvent.maxParticipants) {
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

    // Check if player is already registered for this event
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        customEventId_playerId: {
          customEventId: eventId,
          playerId: player.id,
        },
      },
    });

    if (existingRegistration) {
      throw createError({
        statusCode: 400,
        statusMessage: "Already registered",
        data: { message: "You are already registered for this event" },
      });
    }

    // Create event registration
    const registration = await prisma.eventRegistration.create({
      data: {
        customEventId: eventId,
        playerId: player.id,
      },
    });

    return {
      success: true,
      message: "Registration successful",
      registration: {
        id: registration.id,
        playerName: name,
        playerId: playerId,
        email: email.toLowerCase(),
        eventName: customEvent.name,
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
