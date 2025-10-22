import { PrismaClient } from "~/generated/prisma";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  // Only allow this endpoint in development
  if (process.env.NODE_ENV === "production") {
    throw createError({
      statusCode: 404,
      statusMessage: "Not found",
    });
  }

  if (event.node.req.method !== "POST") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    const body = await readBody(event);
    const {
      email = "dev@example.com",
      name = "Dev User",
      playerId = "DEV123",
    } = body;

    // Find or create a dev player
    let player = await prisma.player.findFirst({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!player) {
      // Create a dev player
      player = await prisma.player.create({
        data: {
          playerId: playerId,
          name: name,
          email: email.toLowerCase(),
          birthDate: new Date(), // Required field
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Create a mock session cookie (this is a simplified version)
    // In a real implementation, you'd set proper auth cookies
    setCookie(event, "dev-user-id", player.playerId, {
      httpOnly: true,
      secure: false, // Only for dev
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: "lax",
    });

    setCookie(event, "dev-user-email", player.email || email, {
      httpOnly: true,
      secure: false, // Only for dev
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: "lax",
    });

    return {
      success: true,
      player: {
        id: player.id,
        playerId: player.playerId,
        name: player.name,
        email: player.email,
      },
    };
  } catch (error) {
    console.error("Dev login error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
