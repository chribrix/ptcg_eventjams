import { z } from "zod";
import prisma from "~/lib/prisma";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";
import {
  logAuthError,
  logDatabaseError,
  logValidationError,
} from "~/server/util/errorLogger";

const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

const bookmarkSchema = z.object({
  externalEventId: z.string().min(1),
  title: z.string().min(1),
  eventType: z.string().optional().nullable(),
  venue: z.string().min(1),
  location: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  eventDate: z.string().datetime(),
  registrationUrl: z.string().url().optional().nullable(),
  cost: z.string().optional().nullable(),
  streetAddress: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
});

export const createBookmarkCreateHandler = ({
  prismaClient = prisma,
  resolvePlayer = resolveAuthenticatedPlayer,
}: {
  prismaClient?: typeof prisma;
  resolvePlayer?: typeof resolveAuthenticatedPlayer;
} = {}) =>
  defineEventHandler(async (event) => {
    try {
      const body = await readBody(event);
      const parsed = bookmarkSchema.safeParse(body);

      if (!parsed.success) {
        await logValidationError(event, parsed.error, "event_bookmark_create");
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid bookmark payload",
        });
      }

      const player = await resolvePlayer(event);
      if (!player) {
        throw createError({
          statusCode: 404,
          statusMessage: "Player not found",
        });
      }
      const payload = parsed.data;

      const bookmark = await prismaClient.eventBookmark.upsert({
        where: {
          playerId_externalEventId: {
            playerId: player.id,
            externalEventId: payload.externalEventId,
          },
        },
        update: {
          title: payload.title,
          eventType: payload.eventType || null,
          venue: payload.venue,
          location: payload.location || null,
          country: payload.country || null,
          eventDate: new Date(payload.eventDate),
          registrationUrl: payload.registrationUrl || null,
          cost: payload.cost || null,
          streetAddress: payload.streetAddress || null,
          icon: payload.icon || null,
        },
        create: {
          playerId: player.id,
          externalEventId: payload.externalEventId,
          title: payload.title,
          eventType: payload.eventType || null,
          venue: payload.venue,
          location: payload.location || null,
          country: payload.country || null,
          eventDate: new Date(payload.eventDate),
          registrationUrl: payload.registrationUrl || null,
          cost: payload.cost || null,
          streetAddress: payload.streetAddress || null,
          icon: payload.icon || null,
        },
      });

      return {
        success: true,
        bookmark,
      };
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        if ((error as any).statusCode === 401) {
          await logAuthError(
            event,
            error as unknown as Error,
            "event_bookmark_create_unauthorized",
          );
        }
        throw error;
      }

      await logDatabaseError(
        event,
        error as unknown as Error,
        "event_bookmark_create",
      );
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to save event bookmark",
      });
    }
  });

export default createBookmarkCreateHandler();
