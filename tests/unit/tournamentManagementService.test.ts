import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, upsert, findMany } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("~/lib/prisma", () => ({
  default: {
    customEvent: { findUnique, findMany },
    tournamentManagementSession: { upsert },
  },
}));

import { listManagedTournaments, startTournamentManagement } from "~/server/services/events/tournamentManagementService";

describe("tournament management listing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records a started event idempotently", async () => {
    findUnique.mockResolvedValue({ id: "event-1" });
    upsert.mockResolvedValue({ customEventId: "event-1", startedAt: new Date("2026-10-31T10:00:00Z") });
    await startTournamentManagement("event-1");
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { customEventId: "event-1" },
      create: { customEventId: "event-1" },
      update: {},
    }));
  });

  it("lists every managed event including legacy TOM imports and groups by tournament completion", async () => {
    findMany.mockResolvedValue([
      { id: "started", name: "Started", venue: "A", eventDate: new Date(), status: "upcoming", tournamentManagement: { startedAt: new Date("2026-10-31T10:00:00Z") }, tomState: null },
      { id: "legacy", name: "Legacy", venue: "B", eventDate: new Date(), status: "upcoming", tournamentManagement: null, tomState: { importedAt: new Date("2026-10-30T10:00:00Z"), metadata: { tournamentEndedAt: "2026-10-31T12:00:00Z" } } },
    ]);
    const result = await listManagedTournaments();
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ tournamentManagement: { isNot: null } }, { tomState: { isNot: null } }] },
    }));
    expect(result.map(({ id, ended }) => ({ id, ended }))).toEqual([
      { id: "started", ended: false }, { id: "legacy", ended: true },
    ]);
    expect(JSON.stringify(result)).not.toContain("tournamentEndedAt");
  });
});
