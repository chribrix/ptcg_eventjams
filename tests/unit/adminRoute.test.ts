import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const verifyAdmin = vi.fn();

vi.mock("~/server/util/adminAccess", () => ({
  verifyAdmin,
}));

describe("defineAdminRoute", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal(
      "createError",
      (input: {
        statusCode: number;
        statusMessage: string;
        data?: unknown;
      }) => {
        const error = new Error(input.statusMessage) as Error & {
          statusCode: number;
          statusMessage: string;
          data?: unknown;
        };
        error.statusCode = input.statusCode;
        error.statusMessage = input.statusMessage;
        error.data = input.data;
        return error;
      },
    );
  });

  it("passes the verified admin user into the wrapped handler", async () => {
    verifyAdmin.mockResolvedValue({ id: "admin-user-id" });
    const { defineAdminRoute } =
      await import("~/server/services/admin/adminRoute");
    const handler = defineAdminRoute(async ({ adminUser }) => {
      return { actorId: adminUser.id };
    });

    const result = await handler({ path: "/api/admin/users" } as never);

    expect(verifyAdmin).toHaveBeenCalledOnce();
    expect(result).toEqual({ actorId: "admin-user-id" });
  });

  it("rethrows authorization errors from verifyAdmin", async () => {
    const authError = Object.assign(new Error("Access denied"), {
      statusCode: 403,
      statusMessage: "Access denied",
    });
    verifyAdmin.mockRejectedValue(authError);
    const { defineAdminRoute } =
      await import("~/server/services/admin/adminRoute");
    const handler = defineAdminRoute(async () => ({ ok: true }));

    await expect(handler({} as never)).rejects.toBe(authError);
  });

  it("maps zod validation failures to a 400 response", async () => {
    verifyAdmin.mockResolvedValue({ id: "admin-user-id" });
    const { defineAdminRoute } =
      await import("~/server/services/admin/adminRoute");
    const handler = defineAdminRoute(async () => {
      throw new z.ZodError([
        {
          code: "custom",
          path: ["name"],
          message: "Name is required",
        },
      ]);
    });

    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Name is required",
    });
  });

  it("wraps unexpected failures as 500 errors", async () => {
    verifyAdmin.mockResolvedValue({ id: "admin-user-id" });
    const { defineAdminRoute } =
      await import("~/server/services/admin/adminRoute");
    const handler = defineAdminRoute(async () => {
      throw new Error("boom");
    });

    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: "boom",
    });
  });
});
