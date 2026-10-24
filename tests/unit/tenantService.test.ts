// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("~/server/services/auth/authService", () => ({ requireAuthUser: vi.fn() }));
import { requireTenantPermission } from "~/server/services/tenants/tenantService";

describe("tenant permission", () => {
  beforeEach(() => {
    vi.stubGlobal("createError", ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) =>
      Object.assign(new Error(statusMessage), { statusCode, statusMessage }),
    );
  });

  const repository = (role: string | null, status = "active") => ({
    tenant: { findUnique: vi.fn().mockResolvedValue({ id: "store-2", slug: "store-2", status }) },
    tenantMembership: { findUnique: vi.fn().mockResolvedValue(role ? { role } : null) },
  });
  const user = (id = "user-1", appMetadata: Record<string, unknown> = {}) =>
    vi.fn().mockResolvedValue({ id, app_metadata: appMetadata });

  it("allows a store admin to manage only their tenant", async () => {
    const own = repository("admin");
    const context = await requireTenantPermission({} as never, "store-2", "manage_events", {
      repository: own as never,
      resolveUser: user() as never,
    });
    expect(context).toMatchObject({ tenantId: "store-2", actorUserId: "user-1", role: "admin" });
    expect(own.tenantMembership.findUnique).toHaveBeenCalledWith({
      where: { tenantId_userId: { tenantId: "store-2", userId: "user-1" } },
      select: { role: true },
    });
  });

  it("denies a user without membership even when they name the tenant", async () => {
    await expect(requireTenantPermission({} as never, "store-2", "view", {
      repository: repository(null) as never,
      resolveUser: user() as never,
    })).rejects.toMatchObject({ statusCode: 403 });
  });

  it("keeps staff read-only and reserves membership changes for owners", async () => {
    await expect(requireTenantPermission({} as never, "store-2", "manage_events", {
      repository: repository("staff") as never,
      resolveUser: user() as never,
    })).rejects.toMatchObject({ statusCode: 403 });
    await expect(requireTenantPermission({} as never, "store-2", "manage_members", {
      repository: repository("admin") as never,
      resolveUser: user() as never,
    })).rejects.toMatchObject({ statusCode: 403 });
  });

  it("recognizes a server-verified platform admin and rejects a suspended tenant", async () => {
    const platformUser = user("platform-1", { role: "admin" });
    await expect(requireTenantPermission({} as never, "store-2", "manage_members", {
      repository: repository(null) as never,
      resolveUser: platformUser as never,
    })).resolves.toMatchObject({ role: "platform_admin" });
    await expect(requireTenantPermission({} as never, "store-2", "view", {
      repository: repository("owner", "suspended") as never,
      resolveUser: user() as never,
    })).rejects.toMatchObject({ statusCode: 403 });
  });
});
