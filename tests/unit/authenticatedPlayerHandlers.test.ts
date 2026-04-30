// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const createEvent = (method: string, context: Record<string, unknown> = {}) =>
  ({
    context,
    node: {
      req: { method, url: "/test" },
      res: {},
    },
  }) as any;

const setupHandlerTest = async <TPrisma extends Record<string, any>>(
  modulePath: string,
  mockPrisma: TPrisma,
  options: {
    supabaseUser?: { id: string; email?: string | null } | null;
    readBodyResult?: unknown;
    routerParam?: string;
  } = {},
) => {
  vi.resetModules();
  vi.unstubAllGlobals();

  vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
  vi.stubGlobal("createError", createError);
  vi.stubGlobal(
    "readBody",
    vi.fn().mockResolvedValue(options.readBodyResult ?? {}),
  );
  vi.stubGlobal(
    "getRouterParam",
    vi.fn().mockReturnValue(options.routerParam ?? null),
  );

  const serverSupabaseUser = vi
    .fn()
    .mockResolvedValue(options.supabaseUser ?? null);
  const logError = vi.fn().mockResolvedValue(undefined);
  const logValidationError = vi.fn().mockResolvedValue(undefined);
  const logDatabaseError = vi.fn().mockResolvedValue(undefined);
  const logAuthError = vi.fn().mockResolvedValue(undefined);

  vi.doMock("@prisma/client", () => ({
    PrismaClient: vi.fn(() => mockPrisma),
  }));
  vi.doMock("#supabase/server", () => ({
    serverSupabaseUser,
  }));
  vi.doMock("~/server/util/errorLogger", () => ({
    logError,
    logValidationError,
    logDatabaseError,
    logAuthError,
  }));

  const mod = await import(modulePath);

  return {
    handler: mod.default as (event: any) => Promise<any>,
    serverSupabaseUser,
    logError,
    logValidationError,
    logDatabaseError,
    logAuthError,
  };
};

describe("authenticated player handler integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves /api/players/me by supabaseId even when the auth email has changed", async () => {
    const mockPrisma = {
      player: {
        findUnique: vi.fn().mockResolvedValue({
          id: "player-db-id",
          playerId: "PLAYER-123",
          supabaseId: "supabase-user-1",
          name: "Linked Player",
          email: "old-email@example.com",
        }),
      },
      $disconnect: vi.fn().mockResolvedValue(undefined),
    };

    const { handler } = await setupHandlerTest(
      "../../server/api/players/me.get",
      mockPrisma,
      {
        supabaseUser: {
          id: "supabase-user-1",
          email: "new-email@example.com",
        },
      },
    );

    await expect(handler(createEvent("GET"))).resolves.toEqual({
      playerId: "PLAYER-123",
      name: "Linked Player",
      email: "old-email@example.com",
    });

    expect(mockPrisma.player.findUnique).toHaveBeenCalledWith({
      where: { supabaseId: "supabase-user-1" },
      select: expect.any(Object),
    });
  });

  it("returns an empty registrations list when the authenticated user has no linked player", async () => {
    const mockPrisma = {
      player: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      eventRegistration: {
        findMany: vi.fn(),
      },
    };

    const { handler } = await setupHandlerTest(
      "../../server/api/dashboard/registrations.get",
      mockPrisma,
      {
        supabaseUser: {
          id: "supabase-user-1",
          email: "legacy@example.com",
        },
      },
    );

    await expect(handler(createEvent("GET"))).resolves.toEqual({
      data: [],
      error: null,
    });

    expect(mockPrisma.player.findUnique).toHaveBeenCalledWith({
      where: { supabaseId: "supabase-user-1" },
      select: expect.any(Object),
    });
    expect(mockPrisma.eventRegistration.findMany).not.toHaveBeenCalled();
  });

  it("returns an empty event history when the authenticated user has no linked player", async () => {
    const mockPrisma = {
      player: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      eventRegistration: {
        findMany: vi.fn(),
      },
    };

    const { handler } = await setupHandlerTest(
      "../../server/api/dashboard/event-history.get",
      mockPrisma,
      {
        supabaseUser: {
          id: "supabase-user-1",
          email: "legacy@example.com",
        },
      },
    );

    await expect(handler(createEvent("GET"))).resolves.toEqual({
      data: [],
    });

    expect(mockPrisma.player.findUnique).toHaveBeenCalledWith({
      where: { supabaseId: "supabase-user-1" },
      select: expect.any(Object),
    });
    expect(mockPrisma.eventRegistration.findMany).not.toHaveBeenCalled();
  });

  it("updates decklists for impersonated players by resolving the impersonation header as a playerId", async () => {
    const mockPrisma = {
      player: {
        findUnique: vi.fn().mockResolvedValue({
          id: "player-db-id",
          playerId: "PLAYER-123",
          supabaseId: "supabase-user-1",
          name: "Linked Player",
          email: "player@example.com",
        }),
      },
      eventRegistration: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: "reg-1",
            playerId: "player-db-id",
            customEvent: { requiresDecklist: true },
            externalEvent: null,
            tickets: [{ id: "ticket-1" }],
          })
          .mockResolvedValueOnce({
            id: "reg-1",
            playerId: "player-db-id",
            tickets: [{ id: "ticket-1", decklist: "4 Pikachu" }],
            customEvent: { requiresDecklist: true },
            externalEvent: null,
          }),
      },
      registrationTicket: {
        update: vi.fn().mockResolvedValue(undefined),
      },
    };

    const { handler, serverSupabaseUser } = await setupHandlerTest(
      "../../server/api/dashboard/decklist.put",
      mockPrisma,
      {
        readBodyResult: {
          registrationId: "reg-1",
          ticketId: "ticket-1",
          decklist: " 4 Pikachu ",
        },
      },
    );

    await expect(
      handler(
        createEvent("PUT", {
          impersonatedUserId: "PLAYER-123",
        }),
      ),
    ).resolves.toEqual({
      data: {
        id: "reg-1",
        playerId: "player-db-id",
        tickets: [{ id: "ticket-1", decklist: "4 Pikachu" }],
        customEvent: { requiresDecklist: true },
        externalEvent: null,
      },
      error: null,
    });

    expect(serverSupabaseUser).not.toHaveBeenCalled();
    expect(mockPrisma.player.findUnique).toHaveBeenCalledWith({
      where: { playerId: "PLAYER-123" },
      select: expect.any(Object),
    });
    expect(mockPrisma.registrationTicket.update).toHaveBeenCalledWith({
      where: { id: "ticket-1" },
      data: {
        decklist: "4 Pikachu",
        bringingDecklistOnsite: false,
        status: "registered",
      },
    });
  });

  it("cancels registrations by local player ownership and logs the linked supabaseId", async () => {
    const mockPrisma = {
      player: {
        findUnique: vi.fn().mockResolvedValue({
          id: "player-db-id",
          playerId: "PLAYER-123",
          supabaseId: "supabase-user-1",
          name: "Linked Player",
          email: "player@example.com",
        }),
      },
      eventRegistration: {
        findFirst: vi.fn().mockResolvedValue({
          id: "reg-1",
          player: {
            id: "player-db-id",
            playerId: "PLAYER-123",
            name: "Linked Player",
            email: "player@example.com",
          },
          tickets: [{ id: "ticket-1", participantName: "Linked Player", status: "registered" }],
          customEvent: {
            id: "event-1",
            name: "League Cup",
            eventDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            registrationDeadline: null,
            status: "published",
          },
          externalEvent: null,
        }),
      },
      registrationTicket: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      errorLog: {
        create: vi.fn().mockResolvedValue(undefined),
      },
    };

    const { handler } = await setupHandlerTest(
      "../../server/api/dashboard/registrations/[id]/cancel.post",
      mockPrisma,
      {
        supabaseUser: {
          id: "supabase-user-1",
          email: "player@example.com",
        },
        routerParam: "reg-1",
      },
    );

    const result = await handler(createEvent("POST"));

    expect(mockPrisma.eventRegistration.findFirst).toHaveBeenCalledWith({
      where: {
        id: "reg-1",
        playerId: "player-db-id",
      },
      include: expect.any(Object),
    });
    expect(mockPrisma.errorLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "supabase-user-1",
        userEmail: "player@example.com",
      }),
    });
    expect(result.success).toBe(true);
  });

  it("resolves /api/players/profile by supabaseId before loading the full player profile", async () => {
    const mockPrisma = {
      player: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: "player-db-id",
            playerId: "PLAYER-123",
            supabaseId: "supabase-user-1",
            name: "Linked Player",
            email: "old-email@example.com",
          })
          .mockResolvedValueOnce({
            id: "player-db-id",
            playerId: "PLAYER-123",
            supabaseId: "supabase-user-1",
            name: "Linked Player",
            email: "old-email@example.com",
            birthDate: new Date("2000-01-01T00:00:00.000Z"),
            preferredLoginMethod: "password",
          }),
      },
      $disconnect: vi.fn().mockResolvedValue(undefined),
    };

    const { handler } = await setupHandlerTest(
      "../../server/api/players/profile.get",
      mockPrisma,
      {
        supabaseUser: {
          id: "supabase-user-1",
          email: "new-email@example.com",
        },
      },
    );

    const result = await handler(createEvent("GET"));

    expect(mockPrisma.player.findUnique).toHaveBeenNthCalledWith(1, {
      where: { supabaseId: "supabase-user-1" },
      select: expect.any(Object),
    });
    expect(mockPrisma.player.findUnique).toHaveBeenNthCalledWith(2, {
      where: { id: "player-db-id" },
    });
    expect(result.player.playerId).toBe("PLAYER-123");
  });

  it("updates preferred login method through the resolved player id instead of auth email", async () => {
    const mockPrisma = {
      player: {
        findUnique: vi.fn().mockResolvedValue({
          id: "player-db-id",
          playerId: "PLAYER-123",
          supabaseId: "supabase-user-1",
          name: "Linked Player",
          email: "player@example.com",
        }),
        update: vi.fn().mockResolvedValue({
          id: "player-db-id",
          preferredLoginMethod: "magiclink",
        }),
      },
    };

    const { handler } = await setupHandlerTest(
      "../../server/api/players/preferred-login-method.post",
      mockPrisma,
      {
        supabaseUser: {
          id: "supabase-user-1",
          email: "changed@example.com",
        },
        readBodyResult: {
          method: "magiclink",
        },
      },
    );

    await expect(handler(createEvent("POST"))).resolves.toEqual({
      success: true,
      method: "magiclink",
    });

    expect(mockPrisma.player.update).toHaveBeenCalledWith({
      where: { id: "player-db-id" },
      data: { preferredLoginMethod: "magiclink" },
    });
  });

  it("updates /api/players/profile using the resolved player instead of the auth email", async () => {
    const mockPrisma = {
      player: {
        findUnique: vi.fn().mockResolvedValue({
          id: "player-db-id",
          playerId: "12345",
          supabaseId: "supabase-user-1",
          name: "Linked Player",
          email: "old-email@example.com",
        }),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({
          id: "player-db-id",
          playerId: "12345",
          supabaseId: "supabase-user-1",
          name: "Updated Player",
          email: "updated@example.com",
          birthDate: new Date("2000-01-01T00:00:00.000Z"),
          phone: null,
          emergencyContact: null,
          emergencyPhone: null,
        }),
      },
      errorLog: {
        create: vi.fn().mockResolvedValue(undefined),
      },
      $disconnect: vi.fn().mockResolvedValue(undefined),
    };

    const { handler } = await setupHandlerTest(
      "../../server/api/players/profile.put",
      mockPrisma,
      {
        supabaseUser: {
          id: "supabase-user-1",
          email: "new-session-email@example.com",
        },
        readBodyResult: {
          playerId: "12345",
          name: "Updated Player",
          email: "updated@example.com",
          birthDate: "2000-01-01T00:00:00.000Z",
        },
      },
    );

    const result = await handler(createEvent("PUT"));

    expect(mockPrisma.player.findUnique).toHaveBeenCalledWith({
      where: { supabaseId: "supabase-user-1" },
      select: expect.any(Object),
    });
    expect(mockPrisma.player.update).toHaveBeenCalledWith({
      where: { id: "player-db-id" },
      data: {
        playerId: "12345",
        name: "Updated Player",
        email: "updated@example.com",
        birthDate: new Date("2000-01-01T00:00:00.000Z"),
      },
    });
    expect(mockPrisma.errorLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "supabase-user-1",
        userEmail: "updated@example.com",
      }),
    });
    expect(result.success).toBe(true);
  });
});