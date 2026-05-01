import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "~/lib/prisma";
import { z } from "zod";

type VenueDirectoryRow = {
  id: string;
  organizationName: string;
  venueName: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const venueDirectoryInputSchema = z.object({
  organizationName: z.string().trim().min(1, "Organization name is required"),
  venueName: z.string().trim().min(1, "Venue name is required"),
});

const venueDirectoryUpdateInputSchema = venueDirectoryInputSchema.partial();
let venueDirectoryTableReady: Promise<void> | null = null;

async function ensureVenueDirectoryTable() {
  if (!venueDirectoryTableReady) {
    venueDirectoryTableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public.venue_directory_entries (
          id TEXT PRIMARY KEY,
          organization_name TEXT NOT NULL,
          venue_name TEXT NOT NULL,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS venue_directory_entries_organization_name_venue_name_key
        ON public.venue_directory_entries (organization_name, venue_name)
      `);
    })().catch((error) => {
      venueDirectoryTableReady = null;
      throw error;
    });
  }

  await venueDirectoryTableReady;
}

function mapVenueRow(row: VenueDirectoryRow) {
  return {
    id: row.id,
    organizationName: row.organizationName,
    venueName: row.venueName,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function listAdminVenueDirectory(search?: string) {
  await ensureVenueDirectoryTable();
  const trimmedSearch = search?.trim();

  const rows = trimmedSearch
    ? await prisma.$queryRaw<VenueDirectoryRow[]>(Prisma.sql`
        SELECT
          id,
          organization_name AS "organizationName",
          venue_name AS "venueName",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM public.venue_directory_entries
        WHERE organization_name ILIKE ${`%${trimmedSearch}%`}
           OR venue_name ILIKE ${`%${trimmedSearch}%`}
        ORDER BY organization_name ASC, venue_name ASC
      `)
    : await prisma.$queryRaw<VenueDirectoryRow[]>(Prisma.sql`
        SELECT
          id,
          organization_name AS "organizationName",
          venue_name AS "venueName",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM public.venue_directory_entries
        ORDER BY organization_name ASC, venue_name ASC
      `);

  return rows.map(mapVenueRow);
}

export async function createAdminVenueDirectoryEntry(rawInput: unknown) {
  await ensureVenueDirectoryTable();
  const input = venueDirectoryInputSchema.parse(rawInput);

  const rows = await prisma.$queryRaw<VenueDirectoryRow[]>(Prisma.sql`
    INSERT INTO public.venue_directory_entries (
      id,
      organization_name,
      venue_name,
      created_at,
      updated_at
    )
    VALUES (
      ${randomUUID()},
      ${input.organizationName},
      ${input.venueName},
      NOW(),
      NOW()
    )
    ON CONFLICT (organization_name, venue_name)
    DO UPDATE SET
      organization_name = EXCLUDED.organization_name,
      venue_name = EXCLUDED.venue_name,
      updated_at = NOW()
    RETURNING
      id,
      organization_name AS "organizationName",
      venue_name AS "venueName",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `);

  return mapVenueRow(rows[0]);
}

export async function updateAdminVenueDirectoryEntry(
  venueEntryId: string,
  rawInput: unknown,
) {
  await ensureVenueDirectoryTable();
  const input = venueDirectoryUpdateInputSchema.parse(rawInput);

  const existingRows = await prisma.$queryRaw<VenueDirectoryRow[]>(Prisma.sql`
    SELECT
      id,
      organization_name AS "organizationName",
      venue_name AS "venueName",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM public.venue_directory_entries
    WHERE id = ${venueEntryId}
    LIMIT 1
  `);

  const existingEntry = existingRows[0];

  if (!existingEntry) {
    throw createError({
      statusCode: 404,
      statusMessage: "Venue entry not found",
    });
  }

  const rows = await prisma.$queryRaw<VenueDirectoryRow[]>(Prisma.sql`
    UPDATE public.venue_directory_entries
    SET
      organization_name = ${input.organizationName ?? existingEntry.organizationName},
      venue_name = ${input.venueName ?? existingEntry.venueName},
      updated_at = NOW()
    WHERE id = ${venueEntryId}
    RETURNING
      id,
      organization_name AS "organizationName",
      venue_name AS "venueName",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `);

  return mapVenueRow(rows[0]);
}

export async function deleteAdminVenueDirectoryEntry(venueEntryId: string) {
  await ensureVenueDirectoryTable();
  const rows = await prisma.$queryRaw<VenueDirectoryRow[]>(Prisma.sql`
    DELETE FROM public.venue_directory_entries
    WHERE id = ${venueEntryId}
    RETURNING
      id,
      organization_name AS "organizationName",
      venue_name AS "venueName",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `);

  if (rows.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "Venue entry not found",
    });
  }

  return {
    success: true,
    message: "Venue entry deleted successfully",
  };
}

export async function rememberVenueDirectoryEntry(
  organizationName?: string | null,
  venueName?: string | null,
) {
  await ensureVenueDirectoryTable();
  const normalizedOrganization = organizationName?.trim();
  const normalizedVenue = venueName?.trim();

  if (!normalizedOrganization || !normalizedVenue) {
    return null;
  }

  const rows = await prisma.$queryRaw<VenueDirectoryRow[]>(Prisma.sql`
    INSERT INTO public.venue_directory_entries (
      id,
      organization_name,
      venue_name,
      created_at,
      updated_at
    )
    VALUES (
      ${randomUUID()},
      ${normalizedOrganization},
      ${normalizedVenue},
      NOW(),
      NOW()
    )
    ON CONFLICT (organization_name, venue_name)
    DO UPDATE SET
      updated_at = NOW()
    RETURNING
      id,
      organization_name AS "organizationName",
      venue_name AS "venueName",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `);

  return mapVenueRow(rows[0]);
}
