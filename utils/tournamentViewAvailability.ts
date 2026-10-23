type TournamentMetadataLike = {
  pairingsReleasedRound?: unknown;
  tournamentReleasedAt?: unknown;
} | null | undefined;

export function isTournamentViewAvailable(
  metadata: TournamentMetadataLike,
): boolean {
  if (typeof metadata?.tournamentReleasedAt === "string" && metadata.tournamentReleasedAt) {
    return true;
  }

  const releasedRound = metadata?.pairingsReleasedRound;

  if (typeof releasedRound === "number") {
    return releasedRound > 0;
  }

  if (typeof releasedRound === "string") {
    const parsedRound = Number.parseInt(releasedRound, 10);
    return parsedRound > 0;
  }

  return false;
}
