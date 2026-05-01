// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const createError = (error: {
  statusCode: number;
  statusMessage: string;
  data?: unknown;
}) => {
  const err = new Error(error.statusMessage) as Error & {
    statusCode: number;
    statusMessage: string;
    data?: unknown;
  };
  err.statusCode = error.statusCode;
  err.statusMessage = error.statusMessage;
  err.data = error.data;
  return err;
};

const createEvent = () =>
  ({
    context: {},
    node: {
      req: { method: "POST", url: "/api/events/event-1/register" },
      res: {},
    },
  }) as any;

describe("event registration endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("createError", createError);
    vi.stubGlobal("getMethod", vi.fn().mockReturnValue("POST"));
    vi.stubGlobal("getRouterParam", vi.fn().mockReturnValue("event-1"));
  });

  it("uses the authenticated linked player as the registration owner and keeps guests as ticket data", async () => {
    vi.resetModules();
    vi.doMock("~/server/util/authenticatedPlayer", () => ({
      resolveAuthenticatedPlayerFactory: vi.fn(() => vi.fn()),
    }));
    vi.doMock("~/lib/prisma", () => ({
      default: {},
    }));
    vi.doMock("~/server/util/errorLogger", () => ({
      logError: vi.fn().mockResolvedValue(undefined),
      logValidationError: vi.fn().mockResolvedValue(undefined),
      logDatabaseError: vi.fn().mockResolvedValue(undefined),
    }));

    const { createRegistrationHandler } = await import(
      "../../server/api/events/[id]/register.post"
    );

    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        bookerPlayerId: "9999",
        bookerName: "Forged Booker",
        bookerEmail: "forged@example.com",
        tickets: [
          { name: "Parent User", playerId: "1001" },
          { name: "Child User", playerId: "2002", isAnonymous: true },
        ],
        allAnonymous: false,
      }),
    );

    const mockPrisma = {
      customEvent: {
        findUnique: vi.fn().mockResolvedValue({
          id: "event-1",
          name: "League Cup",
          eventDate: new Date("2099-05-01T10:00:00.000Z"),
          maxParticipants: 64,
          requiresDecklist: false,
        }),
      },
      externalEventOverride: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      registrationTicket: {
        count: vi.fn().mockResolvedValue(8),
        create: vi
          .fn()
          .mockResolvedValueOnce({
            id: "ticket-1",
            participantName: "Parent User",
            status: "registered",
          })
          .mockResolvedValueOnce({
            id: "ticket-2",
            participantName: "Child User",
            status: "registered",
          }),
      },
      eventRegistration: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: "reg-1",
        }),
      },
      errorLog: {
        create: vi.fn().mockResolvedValue(undefined),
      },
    };

    const resolvePlayer = vi.fn().mockResolvedValue({
      id: "player-db-1",
      playerId: "1001",
      supabaseId: "supabase-user-1",
      name: "Parent User",
      email: "parent@example.com",
    });

    const handler = createRegistrationHandler({
      prismaClient: mockPrisma as any,
      resolvePlayer,
    });

    await expect(handler(createEvent())).resolves.toEqual({
      success: true,
      message: "Registration successful",
      registration: {
        id: "reg-1",
        bookerName: "Parent User",
        bookerPlayerId: "1001",
        bookerEmail: "parent@example.com",
        eventName: "League Cup",
        ticketCount: 2,
        tickets: [
          { id: "ticket-1", participantName: "Parent User", status: "registered" },
          { id: "ticket-2", participantName: "Child User", status: "registered" },
        ],
      },
    });

    expect(resolvePlayer).toHaveBeenCalledWith(expect.any(Object));
    expect(mockPrisma.eventRegistration.create).toHaveBeenCalledWith({
      data: {
        customEventId: "event-1",
        playerId: "player-db-1",
      },
    });
    expect(mockPrisma.registrationTicket.create).toHaveBeenNthCalledWith(2, {
      data: {
        registrationId: "reg-1",
        participantName: "Child User",
        participantPlayerId: "2002",
        status: "registered",
        isAnonymous: true,
        bringingDecklistOnsite: false,
      },
    });
  });

  it("rejects registration when the authenticated user has no linked canonical player", async () => {
    vi.resetModules();
    vi.doMock("~/server/util/authenticatedPlayer", () => ({
      resolveAuthenticatedPlayerFactory: vi.fn(() => vi.fn()),
    }));
    vi.doMock("~/lib/prisma", () => ({
      default: {},
    }));
    vi.doMock("~/server/util/errorLogger", () => ({
      logError: vi.fn().mockResolvedValue(undefined),
      logValidationError: vi.fn().mockResolvedValue(undefined),
      logDatabaseError: vi.fn().mockResolvedValue(undefined),
    }));

    const { createRegistrationHandler } = await import(
      "../../server/api/events/[id]/register.post"
    );

    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        bookerPlayerId: "1001",
        bookerName: "Parent User",
        bookerEmail: "parent@example.com",
        tickets: [{ name: "Parent User", playerId: "1001" }],
        allAnonymous: false,
      }),
    );

    const handler = createRegistrationHandler({
      prismaClient: {
        customEvent: { findUnique: vi.fn() },
        externalEventOverride: { findUnique: vi.fn() },
        registrationTicket: { count: vi.fn(), create: vi.fn() },
        eventRegistration: { findUnique: vi.fn(), create: vi.fn() },
        errorLog: { create: vi.fn() },
      } as any,
      resolvePlayer: vi.fn().mockRejectedValue(
        createError({ statusCode: 404, statusMessage: "Player not found" }),
      ),
    });

    await expect(handler(createEvent())).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: "Player not found",
    });
  });
});