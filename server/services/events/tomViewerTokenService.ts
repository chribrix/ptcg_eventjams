import { createHash } from "node:crypto";
import { getTournamentTomState } from "~/server/services/events/tournamentTomStateService";

const getSecret = () =>
  process.env.TOM_VIEWER_TOKEN_SECRET ||
  process.env.NUXT_TOM_VIEWER_TOKEN_SECRET ||
  process.env.NUXT_SESSION_PASSWORD ||
  "dev-tom-viewer-secret";

export const buildTomViewerToken = (eventId: string, playerUserId: string): string => {
  return createHash("sha256")
    .update(`${eventId}:${playerUserId}:${getSecret()}`)
    .digest("hex");
};

export const resolveTomViewerToken = async (
  eventId: string,
  viewerToken: string,
): Promise<string | null> => {
  const state = await getTournamentTomState(eventId);
  if (!state) {
    return null;
  }

  for (const player of state.stateView.players || []) {
    const token = buildTomViewerToken(eventId, player.userId);
    if (token === viewerToken) {
      return player.userId;
    }
  }

  return null;
};
