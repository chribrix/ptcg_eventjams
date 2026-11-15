import { Prisma } from "@prisma/client";
import prisma from "~/lib/prisma";

export const ANALYTICS_RETENTION_DAYS = 30;
const BATCH_SIZE = 5000;

/** Delete individual analytics records in bounded batches; aggregate summaries are read on demand. */
export async function deleteExpiredAnalytics(now = new Date()) {
  const cutoff = new Date(now.getTime() - ANALYTICS_RETENTION_DAYS * 86400000);
  let deleted = 0;
  while (true) {
    const count = await prisma.$executeRaw(Prisma.sql`
      DELETE FROM public.analytics_events
      WHERE id IN (
        SELECT id FROM public.analytics_events
        WHERE occurred_at < ${cutoff}
        ORDER BY occurred_at
        LIMIT ${BATCH_SIZE}
      )
    `);
    deleted += count;
    if (count < BATCH_SIZE) break;
  }
  return { deleted, cutoff: cutoff.toISOString() };
}
