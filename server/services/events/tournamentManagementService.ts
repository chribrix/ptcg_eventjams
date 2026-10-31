import prisma from "~/lib/prisma";

/** Records entry into the manager once; repeat visits preserve the original start time. */
export async function startTournamentManagement(customEventId: string) {
  const event = await prisma.customEvent.findUnique({ where: { id: customEventId }, select: { id: true } });
  if (!event) throw createError({ statusCode: 404, statusMessage: "Event not found" });
  return prisma.tournamentManagementSession.upsert({
    where: { customEventId },
    create: { customEventId },
    update: {},
    select: { customEventId: true, startedAt: true },
  });
}

/** Legacy TOM imports count as managed tournaments even without a start record. */
export async function listManagedTournaments() {
  const events = await prisma.customEvent.findMany({
    where: { OR: [{ tournamentManagement: { isNot: null } }, { tomState: { isNot: null } }] },
    select: {
      id: true, name: true, venue: true, eventDate: true, status: true,
      tournamentManagement: { select: { startedAt: true } },
      tomState: { select: { importedAt: true, metadata: true } },
    },
    orderBy: { eventDate: "desc" },
  });
  return events.map(({ tournamentManagement, tomState, ...event }) => ({
    ...event,
    startedAt: tournamentManagement?.startedAt ?? tomState?.importedAt ?? null,
    ended: Boolean((tomState?.metadata as { tournamentEndedAt?: string } | null)?.tournamentEndedAt) || event.status === "completed",
  }));
}
