import prisma from "~/lib/prisma";
import type { H3Event } from "h3";
import { requireAuthUser } from "~/server/services/auth/authService";
import { hasAdminRole } from "~/server/util/adminAccess";
import type { TenantContext } from "~/contracts/moduleContracts";

export const DEFAULT_TENANT_ID = "crows-and-owls";

export type TenantPermission = "view" | "manage_events" | "manage_members";
export type TenantRole = TenantContext["role"];

const ROLE_PERMISSIONS: Record<TenantRole, ReadonlySet<TenantPermission>> = {
  owner: new Set(["view", "manage_events", "manage_members"]),
  admin: new Set(["view", "manage_events"]),
  staff: new Set(["view"]),
  platform_admin: new Set(["view", "manage_events", "manage_members"]),
};

type TenantRepository = Pick<typeof prisma, "tenant" | "tenantMembership">;

/** Tenant is resolved from a server-side object or route; a client value is only a lookup hint. */
export async function requireTenantPermission(
  event: H3Event,
  tenantId: string,
  permission: TenantPermission,
  dependencies: {
    repository?: TenantRepository;
    resolveUser?: typeof requireAuthUser;
  } = {},
) {
  const repository = dependencies.repository || prisma;
  const user = await (dependencies.resolveUser || requireAuthUser)(event);
  const tenant = await repository.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, slug: true, status: true },
  });
  if (!tenant) throw createError({ statusCode: 404, statusMessage: "Tenant not found" });
  if (tenant.status !== "active") throw createError({ statusCode: 403, statusMessage: "Tenant is unavailable" });

  const role: TenantRole | null = hasAdminRole(user)
    ? "platform_admin"
    : (await repository.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId, userId: user.id } },
        select: { role: true },
      }))?.role as TenantRole | undefined || null;

  if (!role || !ROLE_PERMISSIONS[role]?.has(permission)) {
    throw createError({ statusCode: 403, statusMessage: "Tenant access denied" });
  }

  return { actorUserId: user.id, tenantId: tenant.id, slug: tenant.slug, role } satisfies TenantContext;
}
