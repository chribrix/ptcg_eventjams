// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const createError = (error: {
  statusCode: number;
  statusMessage: string;
}) => {
  const err = new Error(error.statusMessage) as Error & {
    statusCode: number;
    statusMessage: string;
  };
  err.statusCode = error.statusCode;
  err.statusMessage = error.statusMessage;
  return err;
};

describe("event bookmark endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("createError", createError);
    vi.stubGlobal("getRouterParam", vi.fn().mockReturnValue("external-1"));
  });

  it("creates or updates a bookmark for the authenticated player", async () => {
    vi.resetModules();
    vi.doMock("~/lib/prisma", () => ({
      default: {},
    }));
    vi.doMock("~/server/util/authenticatedPlayer", () => ({
      resolveAuthenticatedPlayerFactory: vi.fn(() => vi.fn()),
    }));
    vi.doMock("~/server/util/errorLogger", () => ({
      logAuthError: vi.fn().mockResolvedValue(undefined),
      logDatabaseError: vi.fn().mockResolvedValue(undefined),
      logValidationError: vi.fn().mockResolvedValue(undefined),
    }));

    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        externalEventId: "external-1",
        title: "League Challenge Nürnberg",
        eventType: "challenge",
        venue: "Card House",
        location: "Nürnberg, DE",
        country: "DE",
        eventDate: "2099-05-01T09:00:00.000Z",
        registrationUrl: "https://example.com/event",
        cost: "10€",
        streetAddress: "Teststraße 1",
        icon: "chall",
      }),
    );

    const { createBookmarkCreateHandler } = await import(
      "../../server/api/events/bookmarks.post"
    );

    const upsert = vi.fn().mockResolvedValue({
      id: "bookmark-1",
      externalEventId: "external-1",
    });

    const handler = createBookmarkCreateHandler({
      prismaClient: {
        eventBookmark: {
          upsert,
        },
      } as any,
      resolvePlayer: vi.fn().mockResolvedValue({
        id: "player-1",
      }),
    });

    const result = await handler({} as any);

    expect(upsert).toHaveBeenCalledWith({
      where: {
        playerId_externalEventId: {
          playerId: "player-1",
          externalEventId: "external-1",
        },
      },
      update: expect.objectContaining({
        title: "League Challenge Nürnberg",
        venue: "Card House",
      }),
      create: expect.objectContaining({
        playerId: "player-1",
        externalEventId: "external-1",
      }),
    });
    expect(result).toEqual({
      success: true,
      bookmark: {
        id: "bookmark-1",
        externalEventId: "external-1",
      },
    });
  });

  it("removes a bookmark for the authenticated player", async () => {
    vi.resetModules();
    vi.doMock("~/lib/prisma", () => ({
      default: {},
    }));
    vi.doMock("~/server/util/authenticatedPlayer", () => ({
      resolveAuthenticatedPlayerFactory: vi.fn(() => vi.fn()),
    }));
    vi.doMock("~/server/util/errorLogger", () => ({
      logAuthError: vi.fn().mockResolvedValue(undefined),
      logDatabaseError: vi.fn().mockResolvedValue(undefined),
    }));

    const { createBookmarkDeleteHandler } = await import(
      "../../server/api/events/bookmarks/[externalEventId].delete"
    );

    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });

    const handler = createBookmarkDeleteHandler({
      prismaClient: {
        eventBookmark: {
          deleteMany,
        },
      } as any,
      resolvePlayer: vi.fn().mockResolvedValue({
        id: "player-1",
      }),
    });

    const result = await handler({} as any);

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        playerId: "player-1",
        externalEventId: "external-1",
      },
    });
    expect(result).toEqual({
      success: true,
    });
  });
});
