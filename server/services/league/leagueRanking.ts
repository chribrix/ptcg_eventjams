export type LeagueRankingEvent = { id: string; eventDate: Date | string };
export type LeagueRankingParticipation = {
  eventId: string;
  placement: number | null;
  points: number;
};
export type LeagueRankingPlayer = {
  id: string;
  displayName: string;
  canonicalId: string | null;
  participations: LeagueRankingParticipation[];
};

export type LeagueStanding = {
  rank: number;
  playerId: string;
  displayName: string;
  pokemonPlayerId: string | null;
  points: number;
  topTwoFinishes: number;
  scoringParticipations: number;
  totalParticipations: number;
  longestStreak: number;
};

export const calculateLeagueStandings = (
  events: LeagueRankingEvent[],
  players: LeagueRankingPlayer[],
): LeagueStanding[] => {
  const eventIds = [...events]
    .sort((left, right) => {
      const dateDifference = new Date(left.eventDate).getTime() - new Date(right.eventDate).getTime();
      return dateDifference || left.id.localeCompare(right.id);
    })
    .map((event) => event.id);

  const standings = players
    .map((player) => {
      const pointsByEvent = new Map(player.participations.map((entry) => [entry.eventId, entry.points]));
      let currentStreak = 0;
      let longestStreak = 0;
      for (const eventId of eventIds) {
        if ((pointsByEvent.get(eventId) || 0) > 0) {
          currentStreak += 1;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }
      return {
        rank: 0,
        playerId: player.id,
        displayName: player.displayName,
        pokemonPlayerId: player.canonicalId,
        points: player.participations.reduce((sum, entry) => sum + entry.points, 0),
        topTwoFinishes: player.participations.filter((entry) => entry.placement === 1 || entry.placement === 2).length,
        scoringParticipations: player.participations.filter((entry) => entry.points > 0).length,
        totalParticipations: player.participations.length,
        longestStreak,
      };
    })
    .filter((player) => player.points > 0)
    .sort(
      (left, right) =>
        right.points - left.points ||
        right.topTwoFinishes - left.topTwoFinishes ||
        right.scoringParticipations - left.scoringParticipations ||
        right.longestStreak - left.longestStreak ||
        left.displayName.localeCompare(right.displayName, "de", { sensitivity: "base" }),
    );

  let previousKey = "";
  standings.forEach((standing, index) => {
    const key = [standing.points, standing.topTwoFinishes, standing.scoringParticipations, standing.longestStreak].join(":");
    if (key !== previousKey) standing.rank = index + 1;
    else standing.rank = standings[index - 1].rank;
    previousKey = key;
  });
  return standings;
};