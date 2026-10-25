import prisma from "~/lib/prisma";
import { z } from "zod";
import { createSupabaseAdminClient } from "~/server/util/supabaseAdminClient";

const slugSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Ungültiger Slug").max(64);
const tenantInputSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(120),
});
const tenantUpdateSchema = z.object({ name: z.string().trim().min(2).max(120) }).strict();
const memberInputSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["owner", "admin", "staff"]),
}).strict();

export async function listPlatformTenants() {
  return prisma.tenant.findMany({
    orderBy: { name: "asc" },
    include: {
      memberships: { orderBy: { createdAt: "asc" }, select: { userId: true, role: true, createdAt: true } },
      _count: { select: { customEvents: true, eventTemplates: true, venueDirectoryEntries: true, leagueSeasons: true } },
    },
  });
}

/** New stores stay draft until every route and query has a verified tenant boundary. */
export async function createDraftTenant(rawInput: unknown) {
  const input = tenantInputSchema.parse(rawInput);
  const existing = await prisma.tenant.findUnique({ where: { slug: input.slug }, select: { id: true } });
  if (existing) throw createError({ statusCode: 409, statusMessage: "Mandant existiert bereits" });

  try {
    return await prisma.tenant.create({
      data: { id: input.slug, slug: input.slug, name: input.name, status: "draft" },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw createError({ statusCode: 409, statusMessage: "Mandant existiert bereits" });
    }
    throw error;
  }
}

export async function renameTenant(tenantId: string, rawInput: unknown) {
  const input = tenantUpdateSchema.parse(rawInput);
  const existing = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!existing) throw createError({ statusCode: 404, statusMessage: "Mandant nicht gefunden" });
  return prisma.tenant.update({ where: { id: tenantId }, data: { name: input.name } });
}

export async function setTenantMember(tenantId: string, rawInput: unknown) {
  const input = memberInputSchema.parse(rawInput);
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) throw createError({ statusCode: 404, statusMessage: "Mandant nicht gefunden" });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(input.userId);
  if (error || !data?.user) throw createError({ statusCode: 404, statusMessage: "Benutzer nicht gefunden" });

  return prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId, userId: input.userId } },
    update: { role: input.role },
    create: { tenantId, userId: input.userId, role: input.role },
    select: { userId: true, role: true, createdAt: true },
  });
}

export async function removeTenantMember(tenantId: string, userId: string) {
  const validUserId = z.string().uuid().parse(userId);
  const removed = await prisma.tenantMembership.deleteMany({ where: { tenantId, userId: validUserId } });
  if (!removed.count) throw createError({ statusCode: 404, statusMessage: "Mitgliedschaft nicht gefunden" });
  return { success: true };
}
