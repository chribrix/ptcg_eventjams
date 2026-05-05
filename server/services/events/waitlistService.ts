import type { Prisma } from "@prisma/client";
import prisma from "~/lib/prisma";
import type { AuthenticatedPlayer } from "~/server/util/authenticatedPlayer";
import { sendWaitlistSpotAvailableEmail } from "~/server/util/waitlistMailer";

const WAITLIST_CLAIM_HOURS = Number(process.env.WAITLIST_CLAIM_HOURS || "12");
const WAITLIST_CUTOFF_HOURS_BEFORE_EVENT = 1;

type EventContext = {
  eventId: string;
  eventName: string;
  eventDate: Date;
  maxParticipants: number;
  requiresDecklist: boolean;
  isExternalEvent: boolean;
  eventKey: string;
  isSanctioned: boolean;
  claimCutoffAt: Date;
};

function getWaitlistDelegate(tx: Prisma.TransactionClient) {
  return (tx as any).waitlistEntry;
}

function getClaimDeadline(now: Date, claimCutoffAt: Date): Date {
  const byHours = new Date(now.getTime() + WAITLIST_CLAIM_HOURS * 60 * 60 * 1000);
  return byHours.getTime() < claimCutoffAt.getTime() ? byHours : claimCutoffAt;
}

function ensureWaitlistActive(context: EventContext, now = new Date()): void {
  if (!context.isSanctioned) {
    throw createError({
      statusCode: 400,
      statusMessage: "Waitlist is only available for sanctioned tournaments",
    });
  }

  if (now.getTime() >= context.eventDate.getTime()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Cannot use waitlist for past events",
    });
  }

  if (now.getTime() >= context.claimCutoffAt.getTime()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Waitlist claims are closed for this tournament",
    });
  }
}

async function lockEventRow(
  tx: Prisma.TransactionClient,
  context: EventContext,
): Promise<void> {
  if (context.isExternalEvent) {
    await tx.$queryRaw`SELECT id FROM public.external_event_overrides WHERE id = ${context.eventId} FOR UPDATE`;
  } else {
    await tx.$queryRaw`SELECT id FROM public.custom_events WHERE id = ${context.eventId} FOR UPDATE`;
  }
}

async function resolveEventContextById(
  tx: Prisma.TransactionClient,
  eventId: string,
): Promise<EventContext> {
  const customEvent = await tx.customEvent.findUnique({ where: { id: eventId } });
  if (customEvent) {
    const tags = customEvent.tags as
      | { type?: string; sanctioned?: boolean }
      | null
      | undefined;
    const claimCutoffAt = new Date(
      customEvent.eventDate.getTime() -
        WAITLIST_CUTOFF_HOURS_BEFORE_EVENT * 60 * 60 * 1000,
    );

    return {
      eventId,
      eventName: customEvent.name,
      eventDate: customEvent.eventDate,
      maxParticipants: customEvent.maxParticipants,
      requiresDecklist: customEvent.requiresDecklist,
      isExternalEvent: false,
      eventKey: `custom:${eventId}`,
      isSanctioned:
        tags?.sanctioned === true ||
        ["league_cup", "league_challenge"].includes(String(tags?.type || "")),
      claimCutoffAt,
    };
  }

  const externalEvent = await tx.externalEventOverride.findUnique({
    where: { id: eventId },
  });

  if (!externalEvent || !externalEvent.handleRegistrationLocally) {
    throw createError({ statusCode: 404, statusMessage: "Event not found" });
  }

  const claimCutoffAt = new Date(
    externalEvent.eventDate.getTime() -
      WAITLIST_CUTOFF_HOURS_BEFORE_EVENT * 60 * 60 * 1000,
  );

  return {
    eventId,
    eventName: externalEvent.eventName,
    eventDate: externalEvent.eventDate,
    maxParticipants: externalEvent.maxParticipants || 0,
    requiresDecklist: externalEvent.requiresDecklist,
    isExternalEvent: true,
    eventKey: `external:${eventId}`,
    isSanctioned: true,
    claimCutoffAt,
  };
}

async function countActiveTicketsForEvent(
  tx: Prisma.TransactionClient,
  context: EventContext,
): Promise<number> {
  return tx.registrationTicket.count({
    where: context.isExternalEvent
      ? {
          registration: { externalEventId: context.eventId },
          status: { not: "cancelled" },
        }
      : {
          registration: { customEventId: context.eventId },
          status: { not: "cancelled" },
        },
  });
}

function normalizeWaitlistStatus(row: {
  status: string;
  claimExpiresAt: Date | null;
}) {
  if (
    row.status === "pending_claim" &&
    row.claimExpiresAt &&
    row.claimExpiresAt.getTime() < Date.now()
  ) {
    return "expired";
  }
  return row.status;
}

async function getOrderedQueue(
  tx: Prisma.TransactionClient,
  eventKey: string,
): Promise<Array<{ id: string }>> {
  const waitlist = getWaitlistDelegate(tx);
  return waitlist.findMany({
    where: {
      eventKey,
      status: { in: ["waiting", "pending_claim"] },
    },
    orderBy: [{ priority: "desc" }, { queuePositionAt: "asc" }],
    select: { id: true },
  });
}

async function recycleExpiredClaims(
  tx: Prisma.TransactionClient,
  context: EventContext,
  now: Date,
): Promise<void> {
  const waitlist = getWaitlistDelegate(tx);
  const cutoffReached = now.getTime() >= context.claimCutoffAt.getTime();
  const expiredClaims = await waitlist.findMany({
    where: {
      eventKey: context.eventKey,
      status: { in: ["pending_claim"] },
      OR: cutoffReached
        ? [{ id: { not: "" } }]
        : [{ claimExpiresAt: { lte: now } }, { claimExpiresAt: null }],
    },
    orderBy: { queuePositionAt: "asc" },
    select: { id: true },
  });

  if (expiredClaims.length === 0) return;

  for (const claim of expiredClaims) {
    await waitlist.update({
      where: { id: claim.id },
      data: {
        status: "waiting",
        notifiedAt: null,
        claimExpiresAt: null,
        queuePositionAt: now,
      },
    });
  }
}

export async function joinEventWaitlist(eventId: string, player: AuthenticatedPlayer) {
  return prisma.$transaction(async (tx) => {
    const context = await resolveEventContextById(tx, eventId);
    ensureWaitlistActive(context);

    const waitlist = getWaitlistDelegate(tx);
    if (!waitlist) {
      throw createError({
        statusCode: 503,
        statusMessage: "Waitlist is temporarily unavailable",
      });
    }

    await lockEventRow(tx, context);

    const activeRegistration = context.isExternalEvent
      ? await tx.eventRegistration.findUnique({
          where: {
            externalEventId_playerId: {
              externalEventId: context.eventId,
              playerId: player.id,
            },
          },
          include: { tickets: { where: { status: { not: "cancelled" } } } },
        })
      : await tx.eventRegistration.findUnique({
          where: {
            customEventId_playerId: {
              customEventId: context.eventId,
              playerId: player.id,
            },
          },
          include: { tickets: { where: { status: { not: "cancelled" } } } },
        });

    if (activeRegistration && activeRegistration.tickets.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: "Already registered for this event",
      });
    }

    const activeTickets = await countActiveTicketsForEvent(tx, context);
    if (context.maxParticipants > 0 && activeTickets < context.maxParticipants) {
      throw createError({
        statusCode: 409,
        statusMessage: "Event currently has free spots",
      });
    }

    const existing = await waitlist.findUnique({
      where: {
        eventKey_playerId: {
          eventKey: context.eventKey,
          playerId: player.id,
        },
      },
    });

    if (existing && ["waiting", "pending_claim"].includes(existing.status)) {
      return {
        success: true,
        alreadyJoined: true,
        status: normalizeWaitlistStatus(existing),
        claimExpiresAt: existing.claimExpiresAt,
      };
    }

    const now = new Date();
    const saved = existing
      ? await waitlist.update({
          where: { id: existing.id },
          data: {
            status: "waiting",
            queuePositionAt: now,
            notifiedAt: null,
            claimExpiresAt: null,
            confirmedAt: null,
          },
        })
      : await waitlist.create({
          data: {
            eventKey: context.eventKey,
            customEventId: context.isExternalEvent ? null : context.eventId,
            externalEventId: context.isExternalEvent ? context.eventId : null,
            playerId: player.id,
            status: "waiting",
            queuePositionAt: now,
          },
        });

    return {
      success: true,
      alreadyJoined: false,
      status: "waiting",
      claimExpiresAt: null,
    };
  });
}

export async function getMyWaitlistStatus(eventId: string, playerId: string) {
  return prisma.$transaction(async (tx) => {
    const waitlist = getWaitlistDelegate(tx);
    if (!waitlist) {
      return { status: "none" as const };
    }

    const context = await resolveEventContextById(tx, eventId);

    const entry = await waitlist.findUnique({
      where: {
        eventKey_playerId: {
          eventKey: context.eventKey,
          playerId,
        },
      },
    });

    if (!entry) {
      return { status: "none" as const };
    }

    const now = new Date();
    if (
      entry.status === "pending_claim" &&
      entry.claimExpiresAt &&
      entry.claimExpiresAt.getTime() <= now.getTime()
    ) {
      await waitlist.update({
        where: { id: entry.id },
        data: {
          status: "waiting",
          notifiedAt: null,
          claimExpiresAt: null,
          queuePositionAt: now,
        },
      });
      return { status: "waiting" as const };
    }

    return {
      status: entry.status,
      claimExpiresAt: entry.claimExpiresAt,
    };
  });
}

export async function confirmWaitlistClaim(eventId: string, player: AuthenticatedPlayer) {
  return prisma.$transaction(async (tx) => {
    const waitlist = getWaitlistDelegate(tx);
    if (!waitlist) {
      throw createError({
        statusCode: 503,
        statusMessage: "Waitlist is temporarily unavailable",
      });
    }

    const context = await resolveEventContextById(tx, eventId);
    ensureWaitlistActive(context);
    await lockEventRow(tx, context);

    const entry = await waitlist.findUnique({
      where: {
        eventKey_playerId: {
          eventKey: context.eventKey,
          playerId: player.id,
        },
      },
    });

    if (!entry || entry.status !== "pending_claim") {
      throw createError({
        statusCode: 404,
        statusMessage: "No pending waitlist claim found",
      });
    }

    if (!entry.claimExpiresAt || entry.claimExpiresAt.getTime() < Date.now()) {
      await waitlist.update({
        where: { id: entry.id },
        data: {
          status: "waiting",
          notifiedAt: null,
          claimExpiresAt: null,
          queuePositionAt: new Date(),
        },
      });

      throw createError({
        statusCode: 410,
        statusMessage: "Waitlist claim has expired",
      });
    }

    const activeTickets = await countActiveTicketsForEvent(tx, context);
    if (context.maxParticipants > 0 && activeTickets >= context.maxParticipants) {
      throw createError({
        statusCode: 409,
        statusMessage: "No free spots available right now",
      });
    }

    const registration = context.isExternalEvent
      ? await tx.eventRegistration.upsert({
          where: {
            externalEventId_playerId: {
              externalEventId: context.eventId,
              playerId: player.id,
            },
          },
          update: {},
          create: {
            externalEventId: context.eventId,
            playerId: player.id,
          },
        })
      : await tx.eventRegistration.upsert({
          where: {
            customEventId_playerId: {
              customEventId: context.eventId,
              playerId: player.id,
            },
          },
          update: {},
          create: {
            customEventId: context.eventId,
            playerId: player.id,
          },
        });

    const ticket = await tx.registrationTicket.create({
      data: {
        registrationId: registration.id,
        participantName: player.name,
        participantPlayerId: player.playerId || null,
        status: context.requiresDecklist ? "reserved" : "registered",
        isAnonymous: false,
        bringingDecklistOnsite: false,
      },
    });

    await waitlist.update({
      where: { id: entry.id },
      data: {
        status: "confirmed",
        confirmedAt: new Date(),
      },
    });

    return {
      success: true,
      registrationId: registration.id,
      ticketId: ticket.id,
    };
  });
}

export async function dropEventWaitlist(eventId: string, player: AuthenticatedPlayer) {
  let shouldPromoteNext = false;
  let contextEventId: string | null = null;
  let isExternalEvent = false;

  const result = await prisma.$transaction(async (tx) => {
    const waitlist = getWaitlistDelegate(tx);
    if (!waitlist) {
      throw createError({
        statusCode: 503,
        statusMessage: "Waitlist is temporarily unavailable",
      });
    }

    const context = await resolveEventContextById(tx, eventId);
    contextEventId = context.eventId;
    isExternalEvent = context.isExternalEvent;
    await lockEventRow(tx, context);

    const entry = await waitlist.findUnique({
      where: {
        eventKey_playerId: {
          eventKey: context.eventKey,
          playerId: player.id,
        },
      },
    });

    if (!entry || !["waiting", "pending_claim"].includes(entry.status)) {
      return { success: true, dropped: false as const };
    }

    shouldPromoteNext = entry.status === "pending_claim";

    await waitlist.update({
      where: { id: entry.id },
      data: {
        status: "cancelled",
        notifiedAt: null,
        claimExpiresAt: null,
        confirmedAt: null,
      },
    });

    return { success: true, dropped: true as const };
  });

  if (shouldPromoteNext && contextEventId) {
    await promoteWaitlistForEvent(
      isExternalEvent
        ? { externalEventId: contextEventId }
        : { customEventId: contextEventId },
      1,
    );
  }

  return result;
}

export async function promoteWaitlistForEvent(
  eventRef: { customEventId?: string | null; externalEventId?: string | null },
  slotsFreed: number,
): Promise<void> {
  void slotsFreed;
  const eventId = eventRef.customEventId || eventRef.externalEventId;
  if (!eventId) return;

  let recipients: Array<{
    email: string;
    playerName: string;
    claimExpiresAt: Date;
    eventName: string;
    eventId: string;
  }> = [];

  await prisma.$transaction(async (tx) => {
    const waitlist = getWaitlistDelegate(tx);
    if (!waitlist) return;

    const context = await resolveEventContextById(tx, eventId);
    if (!context || context.maxParticipants <= 0) return;

    await lockEventRow(tx, context);

    const now = new Date();
    await recycleExpiredClaims(tx, context, now);

    if (
      !context.isSanctioned ||
      now.getTime() >= context.eventDate.getTime() ||
      now.getTime() >= context.claimCutoffAt.getTime()
    ) {
      return;
    }

    const activeTickets = await countActiveTicketsForEvent(tx, context);
    const currentlyFree = Math.max(0, context.maxParticipants - activeTickets);
    const claimCount = currentlyFree;
    if (claimCount <= 0) return;

    const candidates = await waitlist.findMany({
      where: { eventKey: context.eventKey, status: "waiting" },
      include: { player: { select: { email: true, name: true } } },
      orderBy: [{ priority: "desc" }, { queuePositionAt: "asc" }],
      take: claimCount,
    });

    for (const candidate of candidates) {
      const claimExpiresAt = getClaimDeadline(now, context.claimCutoffAt);
      await waitlist.update({
        where: { id: candidate.id },
        data: { status: "pending_claim", notifiedAt: now, claimExpiresAt },
      });
      if (candidate.player.email) {
        recipients.push({
          email: candidate.player.email,
          playerName: candidate.player.name,
          claimExpiresAt,
          eventName: context.eventName,
          eventId: context.eventId,
        });
      }
    }
  });

  await Promise.all(
    recipients.map(async (recipient) => {
      await sendWaitlistSpotAvailableEmail({
        to: recipient.email,
        playerName: recipient.playerName,
        eventName: recipient.eventName,
        eventId: recipient.eventId,
        claimExpiresAt: recipient.claimExpiresAt,
        claimWindowHours: WAITLIST_CLAIM_HOURS,
      });
    }),
  );
}
