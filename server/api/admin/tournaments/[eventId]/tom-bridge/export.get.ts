import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { getTournamentTomState } from "~/server/services/events/tournamentTomStateService";
import { exportTomPodTdf, parseTomTdf } from "~/server/services/events/tomTdfService";

export default defineAdminRoute(async ({ event }) => {
  const eventId = getRouterParam(event, "eventId");

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  }

  const state = await getTournamentTomState(eventId);

  if (!state) {
    throw createError({
      statusCode: 404,
      statusMessage: "No TOM state imported for this tournament",
    });
  }

  const query = getQuery(event);
  const mode = String(query.mode || "current");
  const snapshotId = String(query.snapshotId || "").trim();
  const pod = String(query.pod || "").trim();

  const currentRound = state.stateView.currentRound;
  const podDivision = pod
    ? parseTomTdf(state.record.currentXml).divisions.find((division) => division.category === pod)
    : undefined;
  const latestPodRound = podDivision?.rounds.reduce(
    (latest, round) => (!latest || round.number > latest.number ? round : latest),
    undefined as (typeof podDivision.rounds)[number] | undefined,
  );
  if (mode === "current" && (pod ? latestPodRound?.matches.some((match) => match.outcome === 0) : currentRound?.matches?.some((match) => match.outcome === 0))) {
    throw createError({
      statusCode: 409,
      statusMessage:
        "Current round still has pending results. Finish the round before export.",
    });
  }

  let xmlToExport = state.record.currentXml;
  let exportLabel = "current";

  if (mode === "source") {
    xmlToExport = state.record.sourceXml;
    exportLabel = "source";
  }

  if (mode === "snapshot") {
    const metadata = (state.record.metadata || {}) as any;
    const archive = Array.isArray(metadata.snapshotArchive) ? metadata.snapshotArchive : [];
    const snapshot = archive.find((entry: any) => entry?.id === snapshotId);
    if (!snapshot?.xml) {
      throw createError({
        statusCode: 404,
        statusMessage: "Snapshot export entry not found",
      });
    }
    xmlToExport = snapshot.xml;
    exportLabel = snapshot.fileName || snapshot.id || "snapshot";
  }

  if (pod) {
    xmlToExport = exportTomPodTdf(xmlToExport, pod);
    exportLabel = `${exportLabel}_pod_${pod}`;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeName = (state.stateView.tournament.name || `event_${eventId}`)
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const safeLabel = exportLabel.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  const fileName = `${safeName || `event_${eventId}`}_${safeLabel || "results"}_${timestamp}.tdf`;

  setHeader(event, "Content-Type", "application/xml; charset=utf-8");
  setHeader(event, "Content-Disposition", `attachment; filename="${fileName}"`);

  return xmlToExport;
});
