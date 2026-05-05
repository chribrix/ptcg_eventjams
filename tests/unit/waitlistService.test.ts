// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

type WaitlistEntry = {
  id: string;
  eventKey: string;
  customEventId: string | null;
  externalEventId: string | null;
  playerId: string;
  status: "waiting" | "pending_claim" | "confirmed" | "expired" | "cancelled";
  priority: number;
  queuePositionAt: Date;
  notifiedAt: Date | null;
  claimExpiresAt: Date | null;
  confirmedAt: Date | null;
  createdAt: Date;
  player?: { email: string | null; name: string };
};

const createError = (error: { statusCode: number; statusMessage: string }) => {
  const err = new Error(error.statusMessage) as Error & {
    statusCode: number;
    statusMessage: string;
  };
  err.statusCode = error.statusCode;
  err.statusMessage = error.statusMessage;
  return err;
};

function sortQueue(entries: WaitlistEntry[]) {
  return [...entries].sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.queuePositionAt.getTime() - b.queuePositionAt.getTime();
  });
}

describe("waitlist service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal("createError", createError);
  });

  it("requeues expired claim to end and assigns next prioritized waiting user", async () => {
    vi.setSystemTime(new Date("2026-05-05T12:00:00.000Z"));

    const mails: any[] = [];
    const entries: WaitlistEntry[] = [
      {
        id: "a",
        eventKey: "custom:event-1",
        customEventId: "event-1",
        externalEventId: null,
        playerId: "p-a",
        status: "pending_claim",
        priority: 0,
        queuePositionAt: new Date("2026-05-05T09:00:00.000Z"),
        notifiedAt: new Date("2026-05-05T09:00:00.000Z"),
        claimExpiresAt: new Date("2026-05-05T11:00:00.000Z"),
        confirmedAt: null,
        createdAt: new Date("2026-05-05T08:00:00.000Z"),
        player: { email: "a@example.com", name: "A" },
      },
      {
        id: "b",
        eventKey: "custom:event-1",
        customEventId: "event-1",
        externalEventId: null,
        playerId: "p-b",
        status: "waiting",
        priority: 5,
        queuePositionAt: new Date("2026-05-05T09:10:00.000Z"),
        notifiedAt: null,
        claimExpiresAt: null,
        confirmedAt: null,
        createdAt: new Date("2026-05-05T08:10:00.000Z"),
        player: { email: "b@example.com", name: "B" },
      },
      {
        id: "c",
        eventKey: "custom:event-1",
        customEventId: "event-1",
        externalEventId: null,
        playerId: "p-c",
        status: "waiting",
        priority: 0,
        queuePositionAt: new Date("2026-05-05T09:20:00.000Z"),
        notifiedAt: null,
        claimExpiresAt: null,
        confirmedAt: null,
        createdAt: new Date("2026-05-05T08:20:00.000Z"),
        player: { email: "c@example.com", name: "C" },
      },
    ];

    const tx = {
      $queryRaw: vi.fn(),
      customEvent: {
        findUnique: vi.fn().mockResolvedValue({
          id: "event-1",
          name: "League Cup",
          eventDate: new Date("2026-05-06T18:00:00.000Z"),
          maxParticipants: 10,
          requiresDecklist: false,
          tagType: "pokemon",
          tags: { game: "Pokemon", type: "league_cup" },
        }),
      },
      externalEventOverride: { findUnique: vi.fn().mockResolvedValue(null) },
      registrationTicket: { count: vi.fn().mockResolvedValue(9) },
      waitlistEntry: {
        findMany: vi.fn().mockImplementation(async (args: any) => {
          let out = entries.filter((e) => e.eventKey === args.where.eventKey);
          if (args.where.status) {
            if (args.where.status.in) out = out.filter((e) => args.where.status.in.includes(e.status));
            if (typeof args.where.status === "string") out = out.filter((e) => e.status === args.where.status);
          }
          if (args.where.OR) {
            out = out.filter((e) => {
              return args.where.OR.some((clause: any) => {
                if (clause.claimExpiresAt?.lte) {
                  return e.claimExpiresAt && e.claimExpiresAt <= clause.claimExpiresAt.lte;
                }
                if (Object.prototype.hasOwnProperty.call(clause, "claimExpiresAt") && clause.claimExpiresAt === null) {
                  return e.claimExpiresAt === null;
                }
                if (clause.id?.not !== undefined) {
                  return e.id !== clause.id.not;
                }
                return false;
              });
            });
          }
          if (args.orderBy) {
            if (Array.isArray(args.orderBy)) {
              out = sortQueue(out);
            } else if (args.orderBy.queuePositionAt === "asc") {
              out = [...out].sort((a, b) => a.queuePositionAt.getTime() - b.queuePositionAt.getTime());
            }
          }
          if (args.take) out = out.slice(0, args.take);
          if (args.select?.id) return out.map((e) => ({ id: e.id }));
          if (args.include?.player) return out;
          return out;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const idx = entries.findIndex((e) => e.id === where.id);
          entries[idx] = { ...entries[idx], ...data };
          return entries[idx];
        }),
        updateMany: vi.fn(),
      },
    };

    const prismaMock = {
      $transaction: vi.fn().mockImplementation(async (fn: any) => fn(tx)),
    };

    vi.doMock("~/lib/prisma", () => ({ default: prismaMock }));
    vi.doMock("~/server/util/waitlistMailer", () => ({
      sendWaitlistSpotAvailableEmail: vi.fn(async (payload: any) => {
        mails.push(payload);
      }),
    }));

    const { promoteWaitlistForEvent } = await import("../../server/services/events/waitlistService");

    await promoteWaitlistForEvent({ customEventId: "event-1" }, 1);

    const a = entries.find((e) => e.id === "a")!;
    const b = entries.find((e) => e.id === "b")!;

    expect(a.status).toBe("waiting");
    expect(a.queuePositionAt.toISOString()).toBe("2026-05-05T12:00:00.000Z");
    expect(b.status).toBe("pending_claim");
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe("b@example.com");
  });

  it("does not send claim emails after cutoff (event start -1h)", async () => {
    vi.setSystemTime(new Date("2026-05-05T17:10:00.000Z"));

    const entries: WaitlistEntry[] = [
      {
        id: "x",
        eventKey: "custom:event-1",
        customEventId: "event-1",
        externalEventId: null,
        playerId: "p-x",
        status: "waiting",
        priority: 10,
        queuePositionAt: new Date("2026-05-05T10:00:00.000Z"),
        notifiedAt: null,
        claimExpiresAt: null,
        confirmedAt: null,
        createdAt: new Date("2026-05-05T09:00:00.000Z"),
        player: { email: "x@example.com", name: "X" },
      },
    ];

    const sendMail = vi.fn();
    const tx = {
      $queryRaw: vi.fn(),
      customEvent: {
        findUnique: vi.fn().mockResolvedValue({
          id: "event-1",
          name: "League Cup",
          eventDate: new Date("2026-05-05T18:00:00.000Z"),
          maxParticipants: 10,
          requiresDecklist: false,
          tagType: "pokemon",
          tags: { game: "Pokemon", type: "league_cup" },
        }),
      },
      externalEventOverride: { findUnique: vi.fn().mockResolvedValue(null) },
      registrationTicket: { count: vi.fn().mockResolvedValue(9) },
      waitlistEntry: {
        findMany: vi.fn().mockResolvedValue(entries),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    vi.doMock("~/lib/prisma", () => ({
      default: { $transaction: vi.fn().mockImplementation(async (fn: any) => fn(tx)) },
    }));
    vi.doMock("~/server/util/waitlistMailer", () => ({
      sendWaitlistSpotAvailableEmail: sendMail,
    }));

    const { promoteWaitlistForEvent } = await import("../../server/services/events/waitlistService");
    await promoteWaitlistForEvent({ customEventId: "event-1" }, 1);

    expect(sendMail).not.toHaveBeenCalled();
  });

  it("rejects joining waitlist for unsanctioned tournaments", async () => {
    vi.setSystemTime(new Date("2026-05-05T12:00:00.000Z"));

    const tx = {
      $queryRaw: vi.fn(),
      customEvent: {
        findUnique: vi.fn().mockResolvedValue({
          id: "event-1",
          name: "Local Casual",
          eventDate: new Date("2026-05-06T18:00:00.000Z"),
          maxParticipants: 10,
          requiresDecklist: false,
          tagType: "pokemon",
          tags: { game: "Pokemon", type: "local" },
        }),
      },
      externalEventOverride: { findUnique: vi.fn().mockResolvedValue(null) },
    } as any;

    vi.doMock("~/lib/prisma", () => ({
      default: { $transaction: vi.fn().mockImplementation(async (fn: any) => fn(tx)) },
    }));
    vi.doMock("~/server/util/waitlistMailer", () => ({
      sendWaitlistSpotAvailableEmail: vi.fn(),
    }));

    const { joinEventWaitlist } = await import("../../server/services/events/waitlistService");

    await expect(
      joinEventWaitlist("event-1", {
        id: "player-1",
        name: "Tester",
        playerId: "123",
        email: "test@example.com",
        supabaseId: "sup-1",
      } as any),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Waitlist is only available for sanctioned tournaments",
    });
  });

  it("drops own waitlist claim and promotes next user", async () => {
    vi.setSystemTime(new Date("2026-05-05T12:00:00.000Z"));

    const mails: any[] = [];
    const entries: WaitlistEntry[] = [
      {
        id: "claiming-player",
        eventKey: "custom:event-1",
        customEventId: "event-1",
        externalEventId: null,
        playerId: "p-a",
        status: "pending_claim",
        priority: 0,
        queuePositionAt: new Date("2026-05-05T09:00:00.000Z"),
        notifiedAt: new Date("2026-05-05T09:00:00.000Z"),
        claimExpiresAt: new Date("2026-05-05T20:00:00.000Z"),
        confirmedAt: null,
        createdAt: new Date("2026-05-05T08:00:00.000Z"),
        player: { email: "a@example.com", name: "A" },
      },
      {
        id: "next-player",
        eventKey: "custom:event-1",
        customEventId: "event-1",
        externalEventId: null,
        playerId: "p-b",
        status: "waiting",
        priority: 2,
        queuePositionAt: new Date("2026-05-05T09:10:00.000Z"),
        notifiedAt: null,
        claimExpiresAt: null,
        confirmedAt: null,
        createdAt: new Date("2026-05-05T08:10:00.000Z"),
        player: { email: "b@example.com", name: "B" },
      },
    ];

    const tx = {
      $queryRaw: vi.fn(),
      customEvent: {
        findUnique: vi.fn().mockResolvedValue({
          id: "event-1",
          name: "League Cup",
          eventDate: new Date("2026-05-06T18:00:00.000Z"),
          maxParticipants: 10,
          requiresDecklist: false,
          tagType: "pokemon",
          tags: { game: "Pokemon", type: "league_cup" },
        }),
      },
      externalEventOverride: { findUnique: vi.fn().mockResolvedValue(null) },
      registrationTicket: { count: vi.fn().mockResolvedValue(9) },
      waitlistEntry: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          return (
            entries.find(
              (e) =>
                e.eventKey === where.eventKey_playerId.eventKey &&
                e.playerId === where.eventKey_playerId.playerId,
            ) || null
          );
        }),
        findMany: vi.fn().mockImplementation(async (args: any) => {
          let out = entries.filter((e) => e.eventKey === args.where.eventKey);
          if (args.where.status?.in) {
            out = out.filter((e) => args.where.status.in.includes(e.status));
          }
          if (Array.isArray(args.orderBy)) {
            out = sortQueue(out);
          }
          if (args.take) out = out.slice(0, args.take);
          if (args.select?.id) return out.map((e) => ({ id: e.id }));
          if (args.include?.player) return out;
          return out;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const idx = entries.findIndex((e) => e.id === where.id);
          entries[idx] = { ...entries[idx], ...data };
          return entries[idx];
        }),
      },
    } as any;

    vi.doMock("~/lib/prisma", () => ({
      default: { $transaction: vi.fn().mockImplementation(async (fn: any) => fn(tx)) },
    }));
    vi.doMock("~/server/util/waitlistMailer", () => ({
      sendWaitlistSpotAvailableEmail: vi.fn(async (payload: any) => mails.push(payload)),
    }));

    const { dropEventWaitlist } = await import("../../server/services/events/waitlistService");

    await dropEventWaitlist("event-1", {
      id: "p-a",
      name: "A",
      playerId: "123",
      email: "a@example.com",
      supabaseId: "sup-1",
    } as any);

    const dropped = entries.find((e) => e.id === "claiming-player");
    const promoted = entries.find((e) => e.id === "next-player");

    expect(dropped?.status).toBe("cancelled");
    expect(dropped?.claimExpiresAt).toBeNull();
    expect(promoted?.status).toBe("pending_claim");
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe("b@example.com");
  });
});
