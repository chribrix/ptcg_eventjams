import { describe, expect, it } from "vitest";
import { calculateLeagueStandings } from "../../server/services/league/leagueRanking";
import { parseLeagueTdf } from "../../server/services/league/leagueTdfService";

const tournamentXml = `<?xml version="1.0"?>
<tournament><data><id>event-1</id><name>August Locals</name><startdate>08/21/2026</startdate></data>
<players>
  <player userid="100"><firstname>Ada</firstname><lastname>Lovelace</lastname><starter>true</starter></player>
  <player userid="200"><firstname>Grace</firstname><lastname>Hopper</lastname><starter>true</starter></player>
</players>
<standings>
  <pod category="2" type="finished"><player id="100" place="1" /></pod>
  <pod category="2" type="dnf"><player id="200" /></pod>
</standings></tournament>`;

describe("league TDF import", () => {
  it("parses placements, DNF entries, metadata and warnings", () => {
    const result = parseLeagueTdf(tournamentXml);
    expect(result).toMatchObject({
      officialTournamentId: "event-1",
      name: "August Locals",
      eventDate: "2026-08-21",
      participantCount: 2,
    });
    expect(result.players).toEqual([
      { pokemonPlayerId: "100", displayName: "Ada Lovelace", placement: 1, status: "confirmed" },
      { pokemonPlayerId: "200", displayName: "Grace Hopper", placement: null, status: "dnf" },
    ]);
    expect(result.warnings).toHaveLength(1);
  });

  it("ignores the volatile tournament id when hashing", () => {
    expect(parseLeagueTdf(tournamentXml).contentHash).toBe(
      parseLeagueTdf(tournamentXml.replace("event-1", "event-2")).contentHash,
    );
  });
});

describe("league standings", () => {
  it("uses the approved tie breakers and shared ranks", () => {
    const events = [
      { id: "event-1", eventDate: "2026-08-01" },
      { id: "event-2", eventDate: "2026-08-08" },
      { id: "event-3", eventDate: "2026-08-15" },
    ];
    const standings = calculateLeagueStandings(events, [
      {
        id: "ada",
        displayName: "Ada",
        canonicalId: "100",
        participations: [
          { eventId: "event-1", placement: 1, points: 10 },
          { eventId: "event-2", placement: 5, points: 2 },
        ],
      },
      {
        id: "grace",
        displayName: "Grace",
        canonicalId: "200",
        participations: [
          { eventId: "event-1", placement: 3, points: 4 },
          { eventId: "event-2", placement: 3, points: 4 },
          { eventId: "event-3", placement: 3, points: 4 },
        ],
      },
      {
        id: "linus",
        displayName: "Linus",
        canonicalId: "300",
        participations: [
          { eventId: "event-1", placement: 3, points: 4 },
          { eventId: "event-2", placement: 3, points: 4 },
          { eventId: "event-3", placement: 3, points: 4 },
        ],
      },
    ]);
    expect(standings.map(({ displayName, rank }) => [displayName, rank])).toEqual([
      ["Ada", 1],
      ["Grace", 2],
      ["Linus", 2],
    ]);
  });
});