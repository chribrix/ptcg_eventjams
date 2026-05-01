import prisma from "~/lib/prisma";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";
import { logAuthError, logDatabaseError } from "~/server/util/errorLogger";

const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

export const createBookmarkDeleteHandler = ({
  prismaClient = prisma,
  resolvePlayer = resolveAuthenticatedPlayer,
}: {
  prismaClient?: typeof prisma;
  resolvePlayer?: typeof resolveAuthenticatedPlayer;
} = {}) =>
  defineEventHandler(async (event) => {
    try {
      const externalEventId = getRouterParam(event, "externalEventId");
      if (!externalEventId) {
        throw createError({
          statusCode: 400,
          statusMessage: "External event ID is required",
        });
      }

      const player = await resolvePlayer(event);
      if (!player) {
        throw createError({
          statusCode: 404,
          statusMessage: "Player not found",
        });
      }

      await prismaClient.eventBookmark.deleteMany({
        where: {
          playerId: player.id,
          externalEventId,
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        if ((error as any).statusCode === 401) {
          await logAuthError(
            event,
            error as unknown as Error,
            "event_bookmark_delete_unauthorized",
          );
        }
        throw error;
      }

      await logDatabaseError(
        event,
        error as unknown as Error,
        "event_bookmark_delete",
      );
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to remove event bookmark",
      });
    }
  });

export default createBookmarkDeleteHandler();
