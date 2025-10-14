import { PrismaClient } from "~/generated/prisma";
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
    // Get user from Supabase authentication
    const supabaseUser = await serverSupabaseUser(event);

    if (!supabaseUser) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    const body = await readBody(event);
    const { registrationId, decklist, bringingDecklistOnsite } = body;

    if (!registrationId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Registration ID is required",
      });
    }

    // Validate that at least one option is provided
    if (decklist === undefined && bringingDecklistOnsite === undefined) {
      throw createError({
        statusCode: 400,
        statusMessage: "Either decklist or bringingDecklistOnsite must be provided",
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

    // Check if the event requires a decklist
    if (!existingRegistration.customEvent.requiresDecklist) {
      throw createError({
        statusCode: 400,
        statusMessage: "This event does not require a decklist",
      });
    }

    // Prepare update data
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
    
    // Determine status based on decklist fulfillment
    const hasDecklist = updateData.decklist !== undefined ? updateData.decklist !== null : existingRegistration.decklist !== null;
    const bringingOnsite = updateData.bringingDecklistOnsite !== undefined ? updateData.bringingDecklistOnsite : existingRegistration.bringingDecklistOnsite;
    
    if (hasDecklist || bringingOnsite) {
      updateData.status = "registered";
    } else {
      // If both decklist and bringing onsite are cleared/false, set back to reserved
      updateData.status = "reserved";
    }

    // Update the registration
    const updatedRegistration = await prisma.eventRegistration.update({
      where: {
        id: registrationId,
      },
      data: updateData,
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
