import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Override ID is required",
    });
  }

  if (event.node.req.method === "POST") {
    try {
      // Get current override
      const currentOverride = await prisma.externalEventOverride.findUnique({
        where: { id },
        select: { hideFromCalendar: true },
      });

      if (!currentOverride) {
        throw createError({
          statusCode: 404,
          statusMessage: "Event override not found",
        });
      }

      // Toggle the hideFromCalendar field
      const override = await prisma.externalEventOverride.update({
        where: { id },
        data: {
          hideFromCalendar: !currentOverride.hideFromCalendar,
        },
      });

      // Invalidate the detailed events cache so changes are visible immediately
      const storage = useStorage("cache");
      await storage.removeItem("pokedata:detailed-events");

      return {
        success: true,
        override,
        hideFromCalendar: override.hideFromCalendar,
      };
    } catch (error: any) {
      console.error("Error toggling hide status:", error);

      if (error.code === "P2025") {
        throw createError({
          statusCode: 404,
          statusMessage: "Event override not found",
        });
      }

      throw createError({
        statusCode: 500,
        statusMessage: error.message || "Failed to toggle hide status",
      });
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
