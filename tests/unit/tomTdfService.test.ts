import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  applyTomResultUpdates,
  getPlayerPairings,
  parseTomTdf,
} from "~/server/services/events/tomTdfService";

describe("tomTdfService", () => {
  const samplePath = resolve(
    process.cwd(),
    "TOM/250711 CO Go Challenge/250711 CO Go Challenge_r1-begin.tdf",
  );
  const sampleXml = readFileSync(samplePath, "utf8");
  const byeSamplePath = resolve(
    process.cwd(),
    "TOM/250606_Locals/250606_Locals_r1-begin.tdf",
  );
  const byeSampleXml = readFileSync(byeSamplePath, "utf8");

  it("parses tournament and round pairings", () => {
    const parsed = parseTomTdf(sampleXml);

    expect(parsed.name).toBe("250711 CO Go Challenge");
    expect(parsed.players.length).toBe(4);
    expect(parsed.rounds.length).toBe(1);
    expect(parsed.rounds[0].number).toBe(1);
    expect(parsed.rounds[0].matches.length).toBe(2);
    expect(parsed.rounds[0].matches[0].outcome).toBe(0);
  });

  it("finds player pairings in current round", () => {
    const parsed = parseTomTdf(sampleXml);
    const pairings = getPlayerPairings(parsed, "3619413");

    expect(pairings.currentRound).toBe(1);
    expect(pairings.matches.length).toBe(1);
    expect(pairings.matches[0].tableNumber).toBe(1);
  });

  it("applies result updates into xml", () => {
    const updated = applyTomResultUpdates(sampleXml, [
      {
        roundNumber: 1,
        tableNumber: 1,
        player1UserId: "3619413",
        player2UserId: "2445026",
        outcome: 1,
      },
    ]);

    const reparsed = parseTomTdf(updated);
    expect(reparsed.rounds[0].matches[0].outcome).toBe(1);
  });

  it("parses TOM BYE match with single <player> node", () => {
    const parsed = parseTomTdf(byeSampleXml);
    const byeMatch = parsed.rounds[0].matches.find((match) => match.outcome === 5);

    expect(byeMatch).toBeDefined();
    expect(byeMatch?.player1UserId).toBeTruthy();
    expect(byeMatch?.player2UserId).toBeUndefined();

    const pairings = getPlayerPairings(parsed, String(byeMatch?.player1UserId));
    expect(pairings.matches.some((match) => match.outcome === 5)).toBe(true);
  });
});
