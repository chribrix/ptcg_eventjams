import { PrismaClient } from "@prisma/client";
import { parseEventTags, type TagType } from "~/types/eventTags";
import { getExternalCalendarEventType } from "~/utils/calendarEventUtils";
import { isUpcomingAdminEvent } from "~/utils/adminEventBuckets";
import { buildTomStateView } from "~/server/services/events/tournamentTomStateService";
import { isTournamentViewAvailable } from "~/utils/tournamentViewAvailability";
import {
  logDatabaseError,
  logAuthError,
} from "~/server/util/errorLogger";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";

const prisma = new PrismaClient();
const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);
const normalizeOverrideData = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "GET") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    const player = await resolveAuthenticatedPlayer(event, {
      allowMissing: true,
    });

    if (!player) {
      // Return empty array if player doesn't exist yet
      return {
        data: [],
        error: null,
      };
    }

    const registrations = await prisma.eventRegistration.findMany({
      where: {
        playerId: player.id,
      },
      include: {
        tickets: {
          where: {
            status: {
              not: "cancelled", // Only include non-cancelled tickets
            },
          },
          select: {
            id: true,
            participantName: true,
            participantPlayerId: true,
            status: true,
            isAnonymous: true,
            decklist: true,
            bringingDecklistOnsite: true,
          },
        },
        customEvent: {
          select: {
            id: true,
            name: true,
            venue: true,
            tagType: true,
            tags: true,
            maxParticipants: true,
            participationFee: true,
            description: true,
            eventDate: true,
            registrationDeadline: true,
            status: true,
            requiresDecklist: true,
          },
        },
        externalEvent: {
          select: {
            id: true,
            eventName: true,
            eventLocation: true,
            eventDate: true,
            maxParticipants: true,
            participationFee: true,
            description: true,
            registrationDeadline: true,
            requiresDecklist: true,
            overrides: true,
          },
        },
      },
      orderBy: {
        registeredAt: "desc",
      },
    });

    const customEventIds = Array.from(
      new Set(
        registrations
          .map((registration) => registration.customEventId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const tomStates = customEventIds.length
      ? await prisma.tournamentTomState.findMany({
          where: {
            customEventId: {
              in: customEventIds,
            },
          },
          select: {
            customEventId: true,
            currentXml: true,
            metadata: true,
          },
        })
      : [];
    const placementByEventId = new Map<string, number>();
    const tournamentViewAvailableByEventId = new Map<string, boolean>();
    for (const tomState of tomStates) {
      tournamentViewAvailableByEventId.set(
        tomState.customEventId,
        isTournamentViewAvailable(
          tomState.metadata as { pairingsReleasedRound?: unknown } | null,
        ),
      );

      try {
        const view = buildTomStateView(tomState.currentXml);
        for (const division of view.divisions || []) {
          const index = (division.standings || []).findIndex(
            (entry) => entry.userId === player.playerId,
          );
          if (index >= 0) {
            placementByEventId.set(tomState.customEventId, index + 1);
            break;
          }
        }
      } catch {
        // ignore malformed TOM state for dashboard rendering
      }
    }

    const bookmarks = await prisma.eventBookmark.findMany({
      where: {
        playerId: player.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const waitlistDelegate = (prisma as any).waitlistEntry;
    const waitlistEntries = waitlistDelegate
      ? await waitlistDelegate.findMany({
          where: {
            playerId: player.id,
            status: {
              in: ["waiting", "pending_claim"],
            },
          },
          include: {
            customEvent: {
              select: {
                id: true,
                name: true,
                venue: true,
                tagType: true,
                tags: true,
                maxParticipants: true,
                participationFee: true,
                description: true,
                eventDate: true,
                registrationDeadline: true,
                status: true,
                requiresDecklist: true,
              },
            },
            externalEvent: {
              select: {
                id: true,
                eventName: true,
                eventLocation: true,
                eventDate: true,
                maxParticipants: true,
                participationFee: true,
                description: true,
                registrationDeadline: true,
                requiresDecklist: true,
                overrides: true,
              },
            },
          },
          orderBy: [{ priority: "desc" }, { queuePositionAt: "asc" }],
        })
      : [];

    // Keep events visible for their full calendar day and remove them the day after.
    const futureRegistrations = registrations.filter((reg) => {
      const eventDate =
        reg.customEvent?.eventDate || reg.externalEvent?.eventDate;
      if (!eventDate) return false;
      return isUpcomingAdminEvent({ eventDate });
    });

    // Filter out registrations where all tickets have been cancelled.
    // A registration with 0 active tickets means the user fully cancelled their booking
    // and the event should no longer appear on their dashboard.
    const activeRegistrations = futureRegistrations.filter(
      (reg) => reg.tickets.length > 0,
    );

    // Transform registrations to have a consistent structure
    const transformedRegistrations = activeRegistrations.map((reg) => {
      const isExternalEvent = !!reg.externalEventId;

      // Get overall status from tickets (all tickets must be registered for overall "registered" status)
      const allTicketsRegistered = reg.tickets.every(
        (t) => t.status === "registered",
      );
      const overallStatus = allTicketsRegistered ? "registered" : "reserved";

      // Get decklist from first ticket (for now, assuming all tickets have the same decklist)
      const firstTicket = reg.tickets[0];
      const decklist = firstTicket?.decklist || null;
      const bringingDecklistOnsite =
        firstTicket?.bringingDecklistOnsite || false;

      if (isExternalEvent && reg.externalEvent) {
        const overrides = normalizeOverrideData(reg.externalEvent.overrides);

        // Parse tags from overrides or use default
        const tags = "tags" in overrides
          ? parseEventTags(overrides.tags, "pokemon")
          : { game: "Pokemon" };
        const eventType = tags.type || "custom";

        return {
          id: reg.id,
          entryType: "registration",
          customEventId: reg.customEventId,
          externalEventId: reg.externalEventId,
          playerId: reg.playerId,
          registeredAt: reg.registeredAt,
          status: overallStatus,
          notes: null,
          decklist: decklist,
          bringingDecklistOnsite: bringingDecklistOnsite,
          ticketCount: reg.tickets.length,
          tickets: reg.tickets,
          externalRegistrationUrl: null,
          customEvent: {
            id: reg.externalEvent.id,
            name:
              overrides?.title ||
              overrides?.venue ||
              reg.externalEvent.eventName,
            venue:
              overrides?.venue ||
              reg.externalEvent.eventLocation ||
              reg.externalEvent.eventName,
            eventDate: reg.externalEvent.eventDate,
            maxParticipants: reg.externalEvent.maxParticipants || 0,
            participationFee:
              reg.externalEvent.participationFee?.toString() || null,
            description: reg.externalEvent.description,
            registrationDeadline: reg.externalEvent.registrationDeadline,
            status: "published",
            requiresDecklist: reg.externalEvent.requiresDecklist,
            tags: "tags" in overrides ? overrides.tags : null,
            tagType:
              typeof overrides.tagType === "string"
                ? overrides.tagType
                : "pokemon",
          },
          isExternalEvent: true,
          eventType: eventType,
        };
      }

      // Parse tags from custom event
      const customTags = reg.customEvent?.tags
        ? parseEventTags(
            reg.customEvent.tags,
            (reg.customEvent.tagType as TagType) || "pokemon",
          )
        : { game: "Pokemon" };
      const customEventType = customTags.type || "custom";

      return {
        id: reg.id,
        entryType: "registration",
        customEventId: reg.customEventId,
        externalEventId: reg.externalEventId,
        playerId: reg.playerId,
        registeredAt: reg.registeredAt,
        status: overallStatus,
        notes: null,
        decklist: decklist,
        bringingDecklistOnsite: bringingDecklistOnsite,
        ticketCount: reg.tickets.length,
        tickets: reg.tickets,
        externalRegistrationUrl: null,
        customEvent: reg.customEvent,
        isExternalEvent: false,
        eventType: customEventType,
        tournamentPlacement:
          reg.customEventId && placementByEventId.has(reg.customEventId)
            ? placementByEventId.get(reg.customEventId)
            : null,
        tournamentViewAvailable:
          !!reg.customEventId &&
          tournamentViewAvailableByEventId.get(reg.customEventId) === true,
      };
    });

    const futureBookmarks = bookmarks
      .filter((bookmark) =>
        isUpcomingAdminEvent({ eventDate: bookmark.eventDate }),
      )
      .map((bookmark) => ({
        id: bookmark.id,
        entryType: "bookmark",
        customEventId: null,
        externalEventId: bookmark.externalEventId,
        playerId: bookmark.playerId,
        registeredAt: bookmark.createdAt,
        status: "bookmarked",
        notes: null,
        decklist: null,
        bringingDecklistOnsite: false,
        ticketCount: 0,
        tickets: [],
        externalRegistrationUrl: bookmark.registrationUrl,
        customEvent: {
          id: bookmark.externalEventId,
          name: bookmark.title,
          venue: bookmark.venue,
          eventDate: bookmark.eventDate,
          maxParticipants: 0,
          participationFee: bookmark.cost,
          description: null,
          registrationDeadline: null,
          status: "published",
          requiresDecklist: false,
          tags: null,
          tagType: "pokemon",
        },
        isExternalEvent: true,
        eventType: getExternalCalendarEventType({
          icon: bookmark.icon || undefined,
          type: bookmark.eventType || undefined,
        }),
      }));

    const futureWaitlistEntries = waitlistEntries
      .filter((entry: any) => {
        const eventDate =
          entry.customEvent?.eventDate || entry.externalEvent?.eventDate;
        if (!eventDate) return false;
        return isUpcomingAdminEvent({ eventDate });
      })
      .map((entry: any) => {
        const isExternal = Boolean(entry.externalEventId);
        if (isExternal && entry.externalEvent) {
          const overrides = normalizeOverrideData(entry.externalEvent.overrides);
          return {
            id: `waitlist-${entry.id}`,
            entryType: "waitlist",
            waitlistId: entry.id,
            customEventId: null,
            externalEventId: entry.externalEventId,
            playerId: entry.playerId,
            registeredAt: entry.createdAt,
            status: entry.status === "pending_claim" ? "waitlist_claim" : "waitlist",
            claimExpiresAt: entry.claimExpiresAt,
            notes: null,
            decklist: null,
            bringingDecklistOnsite: false,
            ticketCount: 0,
            tickets: [],
            externalRegistrationUrl: null,
            customEvent: {
              id: entry.externalEvent.id,
              name:
                overrides?.title ||
                overrides?.venue ||
                entry.externalEvent.eventName,
              venue:
                overrides?.venue ||
                entry.externalEvent.eventLocation ||
                entry.externalEvent.eventName,
              eventDate: entry.externalEvent.eventDate,
              maxParticipants: entry.externalEvent.maxParticipants || 0,
              participationFee:
                entry.externalEvent.participationFee?.toString() || null,
              description: entry.externalEvent.description,
              registrationDeadline: entry.externalEvent.registrationDeadline,
              status: "published",
              requiresDecklist: entry.externalEvent.requiresDecklist,
              tags: "tags" in overrides ? overrides.tags : null,
              tagType:
                typeof overrides.tagType === "string"
                  ? overrides.tagType
                  : "pokemon",
            },
            isExternalEvent: true,
            eventType: "custom",
          };
        }

        return {
          id: `waitlist-${entry.id}`,
          entryType: "waitlist",
          waitlistId: entry.id,
          customEventId: entry.customEventId,
          externalEventId: null,
          playerId: entry.playerId,
          registeredAt: entry.createdAt,
          status: entry.status === "pending_claim" ? "waitlist_claim" : "waitlist",
          claimExpiresAt: entry.claimExpiresAt,
          notes: null,
          decklist: null,
          bringingDecklistOnsite: false,
          ticketCount: 0,
          tickets: [],
          externalRegistrationUrl: null,
          customEvent: entry.customEvent,
          isExternalEvent: false,
          eventType: "custom",
        };
      });

    // Sort by event date
    const dashboardEntries = [
      ...transformedRegistrations,
      ...futureBookmarks,
      ...futureWaitlistEntries,
    ];

    dashboardEntries.sort((a, b) => {
      const dateA = new Date(a.customEvent!.eventDate);
      const dateB = new Date(b.customEvent!.eventDate);
      return dateA.getTime() - dateB.getTime();
    });

    return {
      data: dashboardEntries,
      error: null,
    };
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const statusCode = (error as any).statusCode;
      if (statusCode === 401) {
        await logAuthError(
          event,
          error as unknown as Error,
          "dashboard_registrations_unauthorized",
        );
      }
      throw error;
    }

    await logDatabaseError(
      event,
      error as unknown as Error,
      "dashboard_registrations",
    );
    throw createError({
      statusCode: 500,
      statusMessage:
        "Internal server error: " +
        (error instanceof Error ? error.message : String(error)),
    });
  }
});
