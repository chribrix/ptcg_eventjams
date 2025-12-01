import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  // Only allow this endpoint in development
  if (process.env.NODE_ENV === "production") {
    throw createError({
      statusCode: 404,
      statusMessage: "Not found",
    });
  }

  if (event.node.req.method !== "GET") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    const devUserId = getCookie(event, "dev-user-id");
    const devUserEmail = getCookie(event, "dev-user-email");

    if (!devUserId || !devUserEmail) {
      throw createError({
        statusCode: 401,
        statusMessage: "Not authenticated",
      });
    }

    // Find the player
    const player = await prisma.player.findFirst({
      where: {
        playerId: devUserId,
      },
    });

    if (!player) {
      throw createError({
        statusCode: 404,
        statusMessage: "User not found",
      });
    }

    return {
      user: {
        id: player.id,
        playerId: player.playerId,
        name: player.name,
        email: player.email,
      },
    };
  } catch (error) {
    console.error("Dev me error:", error);
    throw createError({
      statusCode: 401,
      statusMessage: "Not authenticated",
    });
  }
});
