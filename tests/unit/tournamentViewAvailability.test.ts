import { describe, expect, it } from "vitest";
import { isTournamentViewAvailable } from "../../utils/tournamentViewAvailability";

describe("isTournamentViewAvailable", () => {
  it("is unavailable when no TOM round has been released", () => {
    expect(isTournamentViewAvailable(null)).toBe(false);
    expect(isTournamentViewAvailable({})).toBe(false);
    expect(isTournamentViewAvailable({ pairingsReleasedRound: 0 })).toBe(false);
  });

  it("is available after the first round was released for players", () => {
    expect(isTournamentViewAvailable({ pairingsReleasedRound: 1 })).toBe(true);
    expect(isTournamentViewAvailable({ pairingsReleasedRound: "2" })).toBe(true);
  });
});
