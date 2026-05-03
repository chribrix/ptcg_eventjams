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

const mergeSchema = z.object({
  bookmarks: z.array(bookmarkSchema).max(300),
});

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const parsed = mergeSchema.safeParse(body);

    if (!parsed.success) {
      await logValidationError(event, parsed.error, "event_bookmark_merge");
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid bookmark merge payload",
      });
    }

    const player = await resolveAuthenticatedPlayer(event);
    if (!player) {
      throw createError({
        statusCode: 404,
        statusMessage: "Player not found",
      });
    }

    let mergedCount = 0;
    let skippedCount = 0;

    for (const bookmark of parsed.data.bookmarks) {
      const existing = await prisma.eventBookmark.findUnique({
        where: {
          playerId_externalEventId: {
            playerId: player.id,
            externalEventId: bookmark.externalEventId,
          },
        },
        select: { id: true },
      });

      if (existing) {
        skippedCount += 1;
        continue;
      }

      await prisma.eventBookmark.create({
        data: {
          playerId: player.id,
          externalEventId: bookmark.externalEventId,
          title: bookmark.title,
          eventType: bookmark.eventType || null,
          venue: bookmark.venue,
          location: bookmark.location || null,
          country: bookmark.country || null,
          eventDate: new Date(bookmark.eventDate),
          registrationUrl: bookmark.registrationUrl || null,
          cost: bookmark.cost || null,
          streetAddress: bookmark.streetAddress || null,
          icon: bookmark.icon || null,
        },
      });

      mergedCount += 1;
    }

    return { mergedCount, skippedCount };
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      if ((error as { statusCode?: number }).statusCode === 401) {
        await logAuthError(
          event,
          error as unknown as Error,
          "event_bookmark_merge_unauthorized",
        );
      }
      throw error;
    }

    await logDatabaseError(event, error as Error, "event_bookmark_merge");
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to merge event bookmarks",
    });
  }
});
