import prisma from "~/lib/prisma";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";

const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

export default defineEventHandler(async (event) => {
  const player = await resolveAuthenticatedPlayer(event, { allowMissing: true });
  if (!player) {
    return { statuses: {} as Record<string, "waitlist" | "waitlist_claim"> };
  }

  const waitlistDelegate = (prisma as any).waitlistEntry;
  if (!waitlistDelegate) {
    return { statuses: {} as Record<string, "waitlist" | "waitlist_claim"> };
  }

  const entries = await waitlistDelegate.findMany({
    where: {
      playerId: player.id,
      status: { in: ["waiting", "pending_claim"] },
    },
    select: {
      customEventId: true,
      externalEventId: true,
      status: true,
    },
  });

  const statuses: Record<string, "waitlist" | "waitlist_claim"> = {};
  for (const entry of entries) {
    const id = entry.customEventId || entry.externalEventId;
    if (!id) continue;
    statuses[id] = entry.status === "pending_claim" ? "waitlist_claim" : "waitlist";
  }

  return { statuses };
});
