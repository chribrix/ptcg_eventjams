type MatchForPublication = {
  roundNumber: number;
  divisionCategory?: string;
};

type TournamentPublication = {
  tournamentReleasedAt?: string;
  tournamentEndedAt?: string;
  pairingsReleasedRound?: number;
  pairingsReleasedRoundsByPod?: Record<string, number>;
};

/** One publication rule for pairing, Bye, history and score projections. */
export function isTournamentMatchPublished(
  match: MatchForPublication,
  publication: TournamentPublication,
): boolean {
  if (publication.tournamentEndedAt) return true;
  if (!publication.tournamentReleasedAt) return false;
  const releasedRound =
    publication.pairingsReleasedRoundsByPod?.[match.divisionCategory || ""] ??
    publication.pairingsReleasedRound ??
    0;
  return match.roundNumber <= releasedRound;
}
