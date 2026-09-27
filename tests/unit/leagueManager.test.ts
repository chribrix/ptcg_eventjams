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

const mixedAgeTournamentXml = `<?xml version="1.0"?>
<tournament><data><name>Mixed Ages</name><startdate>09/11/2026</startdate></data>
<players>
  <player userid="merle"><firstname>Merle</firstname><lastname>Knecht</lastname><starter>true</starter></player>
  <player userid="andi"><firstname>Andreas</firstname><lastname>Oberloher</lastname><starter>true</starter></player>
  <player userid="one"><firstname>Player</firstname><lastname>One</lastname><starter>true</starter></player>
  <player userid="two"><firstname>Player</firstname><lastname>Two</lastname><starter>true</starter></player>
</players>
<pods><pod category="10"><subgroups><subgroup><players>
  <player userid="merle"/><player userid="andi"/><player userid="one"/><player userid="two"/>
</players></subgroup></subgroups><rounds>
  <round number="1"><matches>
    <match outcome="1"><player1 userid="merle"/><player2 userid="one"/></match>
    <match outcome="1"><player1 userid="andi"/><player2 userid="two"/></match>
  </matches></round>
  <round number="2"><matches>
    <match outcome="1"><player1 userid="merle"/><player2 userid="two"/></match>
    <match outcome="1"><player1 userid="andi"/><player2 userid="one"/></match>
  </matches></round>
  <round number="3"><matches>
    <match outcome="1"><player1 userid="merle"/><player2 userid="one"/></match>
    <match outcome="3"><player1 userid="andi"/><player2 userid="two"/></match>
  </matches></round>
</rounds></pod></pods>
<standings>
  <pod category="2" type="finished"><player id="andi" place="1"/><player id="one" place="2"/></pod>
  <pod category="1" type="finished"><player id="merle" place="1"/><player id="two" place="2"/></pod>
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
      { pokemonPlayerId: "100", displayName: "Ada Lovelace", division: "master", placement: 1, status: "confirmed" },
      { pokemonPlayerId: "200", displayName: "Grace Hopper", division: "master", placement: null, status: "dnf" },
    ]);
    expect(result.warnings).toHaveLength(1);
  });

  it("ignores the volatile tournament id when hashing", () => {
    expect(parseLeagueTdf(tournamentXml).contentHash).toBe(
      parseLeagueTdf(tournamentXml.replace("event-1", "event-2")).contentHash,
    );
  });

  it("imports a single non-Master division without requiring a Masters pod", () => {
    const juniorTournament = tournamentXml
      .replace('category="2" type="finished"', 'category="0" type="finished"')
      .replace('category="2" type="dnf"', 'category="0" type="dnf"');
    const result = parseLeagueTdf(juniorTournament);

    expect(result.players.map((player) => player.division)).toEqual(["junior", "junior"]);
    expect(result.players[0]).toMatchObject({ placement: 1, status: "confirmed" });
  });

  it("ranks all age categories together from the shared Swiss rounds", () => {
    const result = parseLeagueTdf(mixedAgeTournamentXml);
    expect(result.players.find((player) => player.pokemonPlayerId === "merle")?.placement).toBe(1);
    expect(result.players.find((player) => player.pokemonPlayerId === "andi")?.placement).toBe(2);
    expect(result.players.find((player) => player.pokemonPlayerId === "merle")?.division).toBe("senior");
    expect(result.players.find((player) => player.pokemonPlayerId === "andi")?.division).toBe("master");
    expect(result.players.every((player) => player.status === "confirmed")).toBe(true);
  });

  it("rejects mixed age standings when no shared round results are available", () => {
    const withoutRounds = mixedAgeTournamentXml.replace(
      /<pods>[\s\S]*?<\/pods>/,
      "<pods></pods>",
    );
    expect(() => parseLeagueTdf(withoutRounds)).toThrow(
      "Die Altersklassen können ohne abgeschlossene Runden nicht gemeinsam gewertet werden.",
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
          { eventId: "event-1", division: "senior", placement: 1, points: 10 },
          { eventId: "event-2", division: "master", placement: 5, points: 2 },
        ],
      },
      {
        id: "grace",
        displayName: "Grace",
        canonicalId: "200",
        participations: [
          { eventId: "event-1", division: "master", placement: 3, points: 4 },
          { eventId: "event-2", division: "master", placement: 3, points: 4 },
          { eventId: "event-3", division: "master", placement: 3, points: 4 },
        ],
      },
      {
        id: "linus",
        displayName: "Linus",
        canonicalId: "300",
        participations: [
          { eventId: "event-1", division: "master", placement: 3, points: 4 },
          { eventId: "event-2", division: "master", placement: 3, points: 4 },
          { eventId: "event-3", division: "master", placement: 3, points: 4 },
        ],
      },
    ]);
    expect(standings.map(({ displayName, rank }) => [displayName, rank])).toEqual([
      ["Ada", 1],
      ["Grace", 2],
      ["Linus", 2],
    ]);
  });

  it("filters points by the division recorded for each event", () => {
    const events = [
      { id: "junior-event", eventDate: "2025-08-01" },
      { id: "master-event", eventDate: "2026-08-01" },
    ];
    const players = [{
      id: "ada",
      displayName: "Ada",
      canonicalId: "100",
      participations: [
        { eventId: "junior-event", division: "junior", placement: 1, points: 10 },
        { eventId: "master-event", division: "master", placement: 2, points: 6 },
      ],
    }];

    expect(calculateLeagueStandings(events, players)[0]).toMatchObject({ points: 16, division: "master" });
    expect(calculateLeagueStandings(events, players, "junior")[0]).toMatchObject({ points: 10, division: "junior" });
    expect(calculateLeagueStandings(events, players, "master")[0]).toMatchObject({ points: 6, division: "master" });
  });
});