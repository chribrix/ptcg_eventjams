// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = {
  tenant: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  tenantMembership: { upsert: vi.fn(), deleteMany: vi.fn() },
};
vi.mock("~/lib/prisma", () => ({ default: mockPrisma }));
const mockGetUserById = vi.fn();
vi.mock("~/server/util/supabaseAdminClient", () => ({
  createSupabaseAdminClient: () => ({ auth: { admin: { getUserById: mockGetUserById } } }),
}));

describe("platform tenant administration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("createError", ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) =>
      Object.assign(new Error(statusMessage), { statusCode, statusMessage }),
    );
    mockGetUserById.mockResolvedValue({ data: { user: { id: "11111111-1111-4111-8111-111111111111" } }, error: null });
  });

  it("creates a new tenant only as a draft with a normalized slug", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(null);
    mockPrisma.tenant.create.mockImplementation(async ({ data }) => data);
    const { createDraftTenant } = await import("~/server/services/tenants/tenantAdminService");
    await expect(createDraftTenant({ slug: " Anderer-Laden ", name: "Anderer Laden", status: "active" }))
      .resolves.toMatchObject({ id: "anderer-laden", status: "draft" });
    expect(mockPrisma.tenant.create).toHaveBeenCalledWith({
      data: { id: "anderer-laden", slug: "anderer-laden", name: "Anderer Laden", status: "draft" },
    });
  });

  it("rejects a duplicate slug and does not create a tenant", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: "existing" });
    const { createDraftTenant } = await import("~/server/services/tenants/tenantAdminService");
    await expect(createDraftTenant({ slug: "existing", name: "Existing" })).rejects.toMatchObject({ statusCode: 409 });
    expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
  });

  it("allows membership only for an existing auth user and store role", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: "crows-and-owls" });
    mockPrisma.tenantMembership.upsert.mockResolvedValue({ userId: "11111111-1111-4111-8111-111111111111", role: "staff" });
    const { setTenantMember } = await import("~/server/services/tenants/tenantAdminService");
    await expect(setTenantMember("crows-and-owls", {
      userId: "11111111-1111-4111-8111-111111111111",
      role: "staff",
    })).resolves.toMatchObject({ role: "staff" });
    expect(mockPrisma.tenantMembership.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId_userId: { tenantId: "crows-and-owls", userId: "11111111-1111-4111-8111-111111111111" } },
    }));
    await expect(setTenantMember("crows-and-owls", {
      userId: "11111111-1111-4111-8111-111111111111",
      role: "platform_admin",
    })).rejects.toThrow();
  });

  it("does not allow the edit endpoint to activate a draft", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: "store-2" });
    const { renameTenant } = await import("~/server/services/tenants/tenantAdminService");
    await expect(renameTenant("store-2", { name: "Store Two", status: "active" })).rejects.toThrow();
    expect(mockPrisma.tenant.update).not.toHaveBeenCalled();
  });

  it("rejects a membership when the auth user cannot be resolved", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: "store-2" });
    mockGetUserById.mockResolvedValue({ data: { user: null }, error: null });
    const { setTenantMember } = await import("~/server/services/tenants/tenantAdminService");
    await expect(setTenantMember("store-2", {
      userId: "11111111-1111-4111-8111-111111111111", role: "staff",
    })).rejects.toMatchObject({ statusCode: 404 });
    expect(mockPrisma.tenantMembership.upsert).not.toHaveBeenCalled();
  });
});
