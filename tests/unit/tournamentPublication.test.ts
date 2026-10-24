import { describe, expect, it } from "vitest";
import { isTournamentMatchPublished } from "~/server/services/events/tournamentPublication";

describe("tournament publication", () => {
  const bye = { roundNumber: 2, divisionCategory: "masters" };

  it("hides an already decided Bye until its round is released", () => {
    expect(isTournamentMatchPublished(bye, { tournamentReleasedAt: "2026-10-24T10:00:00Z", pairingsReleasedRoundsByPod: { masters: 1 } })).toBe(false);
    expect(isTournamentMatchPublished(bye, { tournamentReleasedAt: "2026-10-24T10:00:00Z", pairingsReleasedRoundsByPod: { masters: 2 } })).toBe(true);
  });

  it("does not expose pairings before tournament release", () => {
    expect(isTournamentMatchPublished({ roundNumber: 1 }, { pairingsReleasedRound: 1 })).toBe(false);
  });

  it("preserves completed tournament history", () => {
    expect(isTournamentMatchPublished(bye, { tournamentEndedAt: "2026-10-24T12:00:00Z" })).toBe(true);
  });
});
