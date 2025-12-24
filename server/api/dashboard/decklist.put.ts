import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "PUT") {
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

    const body = await readBody(event);
    const { registrationId, ticketId, decklist, bringingDecklistOnsite } = body;

    if (!registrationId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Registration ID is required",
      });
    }

    if (!ticketId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Ticket ID is required",
      });
    }

    // Validate that at least one option is provided
    if (decklist === undefined && bringingDecklistOnsite === undefined) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Either decklist or bringingDecklistOnsite must be provided",
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
      throw createError({
        statusCode: 404,
        statusMessage: "Player not found",
      });
    }

    // Verify that this registration belongs to the current user
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        id: registrationId,
      },
      include: {
        customEvent: true,
        externalEvent: true,
        tickets: true, // Include tickets to update them
      },
    });

    if (!existingRegistration) {
      throw createError({
        statusCode: 404,
        statusMessage: "Registration not found",
      });
    }

    if (existingRegistration.playerId !== player.id) {
      throw createError({
        statusCode: 403,
        statusMessage: "Not authorized to update this registration",
      });
    }

    // Check if the event exists and requires a decklist
    const registeredEvent =
      existingRegistration.customEvent || existingRegistration.externalEvent;

    if (!registeredEvent) {
      throw createError({
        statusCode: 400,
        statusMessage: "Event not found for this registration",
      });
    }

    if (!registeredEvent.requiresDecklist) {
      throw createError({
        statusCode: 400,
        statusMessage: "This event does not require a decklist",
      });
    }

    // Prepare update data for tickets
    const updateData: any = {};

    if (decklist !== undefined) {
      if (decklist === null || decklist.trim() === "") {
        // Clearing decklist
        updateData.decklist = null;
      } else {
        // Setting decklist
        updateData.decklist = decklist.trim();
        // Reset bringingDecklistOnsite if submitting actual decklist
        updateData.bringingDecklistOnsite = false;
      }
    }

    if (bringingDecklistOnsite !== undefined) {
      updateData.bringingDecklistOnsite = bringingDecklistOnsite;
      // Clear decklist if choosing to bring onsite
      if (bringingDecklistOnsite) {
        updateData.decklist = null;
      }
    }

    // Determine status based on decklist fulfillment for this specific ticket
    if (decklist || bringingDecklistOnsite) {
      updateData.status = "registered";
    } else {
      // If both decklist and bringing onsite are cleared/false, set back to reserved
      updateData.status = "reserved";
    }

    // Verify that the ticket belongs to this registration
    const ticketToUpdate = existingRegistration.tickets.find(
      (t) => t.id === ticketId
    );
    if (!ticketToUpdate) {
      throw createError({
        statusCode: 404,
        statusMessage: "Ticket not found in this registration",
      });
    }

    // Update only the specific ticket
    await prisma.registrationTicket.update({
      where: {
        id: ticketId,
      },
      data: updateData,
    });

    // Fetch updated registration with tickets
    const updatedRegistration = await prisma.eventRegistration.findUnique({
      where: {
        id: registrationId,
      },
      include: {
        tickets: true,
        customEvent: true,
        externalEvent: true,
      },
    });

    return {
      data: updatedRegistration,
      error: null,
    };
  } catch (error) {
    console.error("Decklist submission error:", error);

    // Re-throw createError instances
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
