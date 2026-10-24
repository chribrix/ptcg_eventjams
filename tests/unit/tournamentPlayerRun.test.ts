// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseTomTdf } from "~/server/services/events/tomTdfService";

const sampleXml = readFileSync(resolve(process.cwd(), "TOM/250711 CO Go Challenge/250711 CO Go Challenge_r1-begin.tdf"), "utf8");
const byeXml = readFileSync(resolve(process.cwd(), "TOM/250606_Locals/250606_Locals_r1-begin.tdf"), "utf8");

describe("player tournament run", () => {
  let stored: { customEventId: string; currentXml: string; updatedAt: Date; metadata: Record<string, unknown> };
  let updateCount: number;

  beforeEach(() => {
    vi.resetModules();
    updateCount = 0;
    stored = {
      customEventId: "event-1",
      currentXml: sampleXml,
      updatedAt: new Date("2026-10-24T10:00:00Z"),
      metadata: { tournamentReleasedAt: "2026-10-24T10:00:00Z", pairingsReleasedRound: 1, reports: [] },
    };
    vi.doMock("~/lib/prisma", () => ({
      default: {
        tournamentTomState: {
          findUnique: vi.fn(async () => structuredClone(stored)),
          updateMany: vi.fn(async ({ where, data }) => {
            if (new Date(where.updatedAt).getTime() !== stored.updatedAt.getTime()) return { count: 0 };
            stored = { ...stored, ...structuredClone(data) };
            updateCount += 1;
            return { count: 1 };
          }),
          update: vi.fn(async ({ data }) => {
            stored = { ...stored, ...structuredClone(data) };
            return structuredClone(stored);
          }),
        },
      },
    }));
  });

  it("hides a Bye and its points until the pairing round is released", async () => {
    stored.currentXml = byeXml;
    stored.metadata.pairingsReleasedRound = 0;
    const bye = parseTomTdf(byeXml).rounds[0].matches.find((match) => match.outcome === 5)!;
    const { getPlayerTournamentRun } = await import("~/server/services/events/tournamentTomStateService");

    const before = await getPlayerTournamentRun({ customEventId: "event-1", playerUserId: bye.player1UserId! });
    expect(before.playerMatches).toEqual([]);
    expect(before.score).toEqual({ wins: 0, losses: 0, ties: 0, points: 0 });
    expect(JSON.stringify(before)).not.toContain("roundsDetailed");
    expect(JSON.stringify(before)).not.toContain("birthDate");

    stored.metadata.pairingsReleasedRound = 1;
    const after = await getPlayerTournamentRun({ customEventId: "event-1", playerUserId: bye.player1UserId! });
    expect(after.playerMatches.some((match) => match.outcome === 5)).toBe(true);
    expect(after.score.wins).toBe(1);
  });

  it("returns the same persisted receipt when a result request is repeated", async () => {
    const match = parseTomTdf(sampleXml).rounds[0].matches[0];
    const { submitPlayerMatchReport } = await import("~/server/services/events/tournamentTomStateService");
    const input = {
      customEventId: "event-1",
      reporterUserId: match.player1UserId!,
      requestId: "d34e911c-bff8-4e90-ac13-633bfbafed35",
      roundNumber: 1,
      divisionCategory: match.divisionCategory,
      tableNumber: match.tableNumber,
      player1UserId: match.player1UserId,
      player2UserId: match.player2UserId,
      result: "win" as const,
    };

    const first = await submitPlayerMatchReport(input);
    const second = await submitPlayerMatchReport(input);
    expect(second.report.id).toBe(first.report.id);
    expect(updateCount).toBe(1);
  });

  it("keeps both reports when opponents submit concurrently", async () => {
    const match = parseTomTdf(sampleXml).rounds[0].matches[0];
    const { submitPlayerMatchReport } = await import("~/server/services/events/tournamentTomStateService");
    const common = {
      customEventId: "event-1",
      roundNumber: 1,
      divisionCategory: match.divisionCategory,
      tableNumber: match.tableNumber,
      player1UserId: match.player1UserId,
      player2UserId: match.player2UserId,
    };

    await Promise.all([
      submitPlayerMatchReport({ ...common, reporterUserId: match.player1UserId!, requestId: "a34e911c-bff8-4e90-ac13-633bfbafed35", result: "win" }),
      submitPlayerMatchReport({ ...common, reporterUserId: match.player2UserId!, requestId: "b34e911c-bff8-4e90-ac13-633bfbafed35", result: "loss" }),
    ]);

    const reports = stored.metadata.reports as Array<{ reporterUserId: string }>;
    expect(reports.map((report) => report.reporterUserId).sort()).toEqual([match.player1UserId, match.player2UserId].sort());
    expect(updateCount).toBe(2);
  });
});
