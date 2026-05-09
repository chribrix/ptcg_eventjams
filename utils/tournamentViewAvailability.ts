type TournamentMetadataLike = {
  pairingsReleasedRound?: unknown;
} | null | undefined;

export function isTournamentViewAvailable(
  metadata: TournamentMetadataLike,
): boolean {
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
