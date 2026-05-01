import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/server/services/admin/adminRoute", () => ({
  defineAdminRoute: (handler: unknown) => handler,
}));

describe("Admin controller routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal(
      "createError",
      (input: { statusCode: number; statusMessage: string }) => {
        const error = new Error(input.statusMessage) as Error & {
          statusCode: number;
          statusMessage: string;
        };
        error.statusCode = input.statusCode;
        error.statusMessage = input.statusMessage;
        return error;
      },
    );
  });

  it("lists admin users from the query object", async () => {
    const listUsers = vi
      .fn()
      .mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 1 },
      });
    const { createAdminUsersListHandler } =
      await import("~/server/api/admin/users.get");
    const handler = createAdminUsersListHandler({
      listUsers,
      readQuery: () => ({ search: "ash", page: 2 }),
    });

    const result = await handler({ event: {} as never });

    expect(listUsers).toHaveBeenCalledWith({ search: "ash", page: 2 });
    expect(result).toEqual({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 1 },
    });
  });

  it("patches admin user role with the authenticated actor id", async () => {
    const updateRole = vi.fn().mockResolvedValue({ ok: true });
    const { createAdminUserRolePatchHandler } =
      await import("~/server/api/admin/users/[id]/role.patch");
    const handler = createAdminUserRolePatchHandler({
      getUserId: () => "target-user-id",
      readRequestBody: async () => ({ isAdmin: true }),
      updateRole,
    });

    await handler({ event: {} as never, adminUser: { id: "actor-user-id" } });

    expect(updateRole).toHaveBeenCalledWith({
      actorUserId: "actor-user-id",
      targetUserId: "target-user-id",
      isAdmin: true,
    });
  });

  it("rejects role patch requests without a user id", async () => {
    const { createAdminUserRolePatchHandler } =
      await import("~/server/api/admin/users/[id]/role.patch");
    const handler = createAdminUserRolePatchHandler({
      getUserId: () => undefined,
      readRequestBody: async () => ({ isAdmin: true }),
    });

    await expect(
      handler({ event: {} as never, adminUser: { id: "actor-user-id" } }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "User ID is required",
    });
  });

  it("loads the admin banner through the banner reader", async () => {
    const getBanner = vi.fn().mockResolvedValue({ banner: { enabled: false } });
    const { createAdminBannerGetHandler } =
      await import("~/server/api/admin/settings/banner.get");
    const handler = createAdminBannerGetHandler({ getBanner });

    const result = await handler();

    expect(getBanner).toHaveBeenCalledOnce();
    expect(result).toEqual({ banner: { enabled: false } });
  });

  it("updates the admin banner with the authenticated actor id", async () => {
    const updateBanner = vi
      .fn()
      .mockResolvedValue({ banner: { enabled: true } });
    const { createAdminBannerPatchHandler } =
      await import("~/server/api/admin/settings/banner.patch");
    const handler = createAdminBannerPatchHandler({
      readRequestBody: async () => ({ enabled: true, severity: "info" }),
      updateBanner,
    });

    const result = await handler({
      event: {} as never,
      adminUser: { id: "actor-user-id" },
    });

    expect(updateBanner).toHaveBeenCalledWith("actor-user-id", {
      enabled: true,
      severity: "info",
    });
    expect(result).toEqual({ banner: { enabled: true } });
  });

  it("loads the admin dashboard through the dashboard view service", async () => {
    const getDashboard = vi.fn().mockResolvedValue({
      stats: {
        customEvents: 1,
        totalPlayers: 2,
        upcomingEvents: 3,
        completedEvents: 4,
      },
      recentActivity: [],
    });
    const { createAdminDashboardHandler } =
      await import("~/server/api/admin/dashboard.get");
    const handler = createAdminDashboardHandler({ getDashboard });

    const result = await handler();

    expect(getDashboard).toHaveBeenCalledOnce();
    expect(result.stats.totalPlayers).toBe(2);
  });

  it("lists custom events from parsed pagination params", async () => {
    const listEvents = vi
      .fn()
      .mockResolvedValue({
        items: [],
        pagination: { page: 3, limit: 25, total: 0, pages: 0 },
      });
    const { createAdminCustomEventsHandler } =
      await import("~/server/api/admin/custom-events");
    const handler = createAdminCustomEventsHandler({
      getRequestMethod: () => "GET",
      readQuery: () => ({ page: "3", limit: "25" }),
      listEvents,
    });

    const result = await handler({
      event: {} as never,
      adminUser: { id: "actor-user-id" },
    });

    expect(listEvents).toHaveBeenCalledWith({ page: 3, limit: 25 });
    expect(result.pagination.limit).toBe(25);
  });

  it("loads a single custom event when an id is present", async () => {
    const getEvent = vi
      .fn()
      .mockResolvedValue({ id: "event-1", name: "League Cup" });
    const { createAdminCustomEventsHandler } =
      await import("~/server/api/admin/custom-events");
    const handler = createAdminCustomEventsHandler({
      getRequestMethod: () => "GET",
      readQuery: () => ({ id: "event-1" }),
      getEvent,
    });

    const result = await handler({
      event: {} as never,
      adminUser: { id: "actor-user-id" },
    });

    expect(getEvent).toHaveBeenCalledWith("event-1");
    expect(result).toEqual({ id: "event-1", name: "League Cup" });
  });

  it("creates a custom event with the authenticated actor id", async () => {
    const createEvent = vi.fn().mockResolvedValue({ ok: true });
    const { createAdminCustomEventsHandler } =
      await import("~/server/api/admin/custom-events");
    const handler = createAdminCustomEventsHandler({
      getRequestMethod: () => "POST",
      readQuery: () => ({}),
      readRequestBody: async () => ({ name: "Friday Challenge" }),
      createEvent,
    });

    await handler({ event: {} as never, adminUser: { id: "actor-user-id" } });

    expect(createEvent).toHaveBeenCalledWith(
      { name: "Friday Challenge" },
      "actor-user-id",
    );
  });

  it("rejects custom event updates without an id", async () => {
    const { createAdminCustomEventsHandler } =
      await import("~/server/api/admin/custom-events");
    const handler = createAdminCustomEventsHandler({
      getRequestMethod: () => "PUT",
      readQuery: () => ({}),
      readRequestBody: async () => ({ name: "Friday Challenge" }),
    });

    await expect(
      handler({ event: {} as never, adminUser: { id: "actor-user-id" } }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  });

  it("updates and deletes custom events by query id", async () => {
    const updateEvent = vi
      .fn()
      .mockResolvedValue({ id: "event-1", name: "Updated Event" });
    const deleteEvent = vi.fn().mockResolvedValue({ success: true });
    const { createAdminCustomEventsHandler } =
      await import("~/server/api/admin/custom-events");

    const updateHandler = createAdminCustomEventsHandler({
      getRequestMethod: () => "PUT",
      readQuery: () => ({ id: "event-1" }),
      readRequestBody: async () => ({ name: "Updated Event" }),
      updateEvent,
    });
    const deleteHandler = createAdminCustomEventsHandler({
      getRequestMethod: () => "DELETE",
      readQuery: () => ({ id: "event-1" }),
      deleteEvent,
    });

    const updateResult = await updateHandler({
      event: {} as never,
      adminUser: { id: "actor-user-id" },
    });
    const deleteResult = await deleteHandler({
      event: {} as never,
      adminUser: { id: "actor-user-id" },
    });

    expect(updateEvent).toHaveBeenCalledWith("event-1", {
      name: "Updated Event",
    });
    expect(deleteEvent).toHaveBeenCalledWith("event-1");
    expect(updateResult.name).toBe("Updated Event");
    expect(deleteResult).toEqual({ success: true });
  });

  it("loads the combined admin event feed through the shared event reader", async () => {
    const listCombinedEvents = vi
      .fn()
      .mockResolvedValue({ events: [{ id: "event-1" }] });
    const { createAdminCombinedEventsHandler } =
      await import("~/server/api/admin/events/combined");
    const handler = createAdminCombinedEventsHandler({ listCombinedEvents });

    const result = await handler();

    expect(listCombinedEvents).toHaveBeenCalledOnce();
    expect(result).toEqual({ events: [{ id: "event-1" }] });
  });

  it("loads admin event details and rejects missing ids", async () => {
    const getEventDetail = vi
      .fn()
      .mockResolvedValue({ id: "event-1", registrations: [] });
    const { createAdminEventDetailsHandler } =
      await import("~/server/api/admin/events/[id]/details.get");
    const okHandler = createAdminEventDetailsHandler({
      getEventId: () => "event-1",
      getEventDetail,
    });
    const missingHandler = createAdminEventDetailsHandler({
      getEventId: () => undefined,
    });

    const result = await okHandler({ event: {} as never });

    expect(getEventDetail).toHaveBeenCalledWith("event-1");
    expect(result).toEqual({ id: "event-1", registrations: [] });
    await expect(missingHandler({ event: {} as never })).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  });

  it("lists admin error logs from parsed query filters", async () => {
    const count = vi.fn().mockResolvedValue(2);
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "log-1",
        errorType: "magic_login_failed",
        errorMessage: "Bad token",
        userId: "user-1",
        userEmail: "misty@example.com",
        url: "/magic-login",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ]);
    const disconnect = vi.fn().mockResolvedValue(undefined);
    const { createAdminErrorLogsHandler } =
      await import("~/server/api/admin/error-logs/index.get");
    const handler = createAdminErrorLogsHandler({
      createPrismaClient: () => ({
        errorLog: { count, findMany },
        $disconnect: disconnect,
      }),
      readQuery: () => ({
        page: "2",
        limit: "25",
        errorType: "magic_login*",
        userId: "user-1",
        search: "token",
      }),
    });

    const result = await handler({ event: {} as never });

    expect(count).toHaveBeenCalledWith({
      where: {
        errorType: { contains: "magic_login", mode: "insensitive" },
        userId: "user-1",
        OR: [
          { errorMessage: { contains: "token", mode: "insensitive" } },
          { userEmail: { contains: "token", mode: "insensitive" } },
          { errorType: { contains: "token", mode: "insensitive" } },
          { userId: { contains: "token", mode: "insensitive" } },
          { url: { contains: "token", mode: "insensitive" } },
        ],
      },
    });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        errorType: { contains: "magic_login", mode: "insensitive" },
        userId: "user-1",
        OR: [
          { errorMessage: { contains: "token", mode: "insensitive" } },
          { userEmail: { contains: "token", mode: "insensitive" } },
          { errorType: { contains: "token", mode: "insensitive" } },
          { userId: { contains: "token", mode: "insensitive" } },
          { url: { contains: "token", mode: "insensitive" } },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: 25,
      take: 25,
    });
    expect(disconnect).toHaveBeenCalledOnce();
    expect(result.pagination).toEqual({
      page: 2,
      limit: 25,
      total: 2,
      totalPages: 1,
    });
  });

  it("maps admin event history rows for the frontend", async () => {
    const findPastEvents = vi.fn().mockResolvedValue([
      {
        id: "event-1",
        name: "League Cup",
        venue: "Pallet Town",
        eventDate: new Date("2026-04-01T18:00:00.000Z"),
        participationFee: { toString: () => "15" },
        description: "Championship prep",
        status: "COMPLETED",
        requiresDecklist: true,
        _count: { registrations: 1 },
        registrations: [
          {
            id: "registration-1",
            status: "confirmed",
            playerId: "player-1",
            registeredAt: new Date("2026-03-28T18:00:00.000Z"),
            player: {
              id: "player-1",
              name: "Ash",
              playerId: "ash-123",
            },
          },
        ],
        customParticipants: [
          {
            playerId: "player-1",
            placement: 1,
            points: 12,
          },
        ],
      },
    ]);
    const { createAdminEventHistoryHandler } =
      await import("~/server/api/admin/events/history.get");
    const handler = createAdminEventHistoryHandler({
      getRequestMethod: () => "GET",
      findPastEvents,
    });

    const result = await handler({ event: {} as never });

    expect(findPastEvents).toHaveBeenCalledOnce();
    expect(result).toEqual({
      data: [
        {
          id: "event-1",
          name: "League Cup",
          venue: "Pallet Town",
          eventDate: "2026-04-01T18:00:00.000Z",
          participationFee: "15",
          description: "Championship prep",
          status: "COMPLETED",
          requiresDecklist: true,
          totalParticipants: 1,
          participants: [
            {
              id: "registration-1",
              status: "confirmed",
              placement: 1,
              points: 12,
              registeredAt: "2026-03-28T18:00:00.000Z",
              player: {
                id: "player-1",
                name: "Ash",
                playerId: "ash-123",
              },
            },
          ],
        },
      ],
    });
  });
});
