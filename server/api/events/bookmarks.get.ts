import prisma from "~/lib/prisma";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";
import { logAuthError, logDatabaseError } from "~/server/util/errorLogger";

const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

export const createBookmarksListHandler = ({
  prismaClient = prisma,
  resolvePlayer = resolveAuthenticatedPlayer,
}: {
  prismaClient?: typeof prisma;
  resolvePlayer?: typeof resolveAuthenticatedPlayer;
} = {}) =>
  defineEventHandler(async (event) => {
    try {
      const player = await resolvePlayer(event);
      if (!player) {
        throw createError({
          statusCode: 404,
          statusMessage: "Player not found",
        });
      }
      const bookmarks = await prismaClient.eventBookmark.findMany({
        where: { playerId: player.id },
        orderBy: { createdAt: "desc" },
      });

      return {
        data: bookmarks,
        error: null,
      };
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        if ((error as any).statusCode === 401) {
          await logAuthError(
            event,
            error as unknown as Error,
            "event_bookmarks_list_unauthorized",
          );
        }
        throw error;
      }

      await logDatabaseError(
        event,
        error as unknown as Error,
        "event_bookmarks_list",
      );
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to load event bookmarks",
      });
    }
  });

export default createBookmarksListHandler();
