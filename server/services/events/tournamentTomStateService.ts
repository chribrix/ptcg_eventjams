import prisma from "~/lib/prisma";
import {
  applyTomResultUpdates,
  buildTomStandings,
  parseTomTdf,
  tomOutcomeLabel,
  type TomResultUpdate,
} from "~/server/services/events/tomTdfService";

const SNAPSHOT_ARCHIVE_LIMIT = 30;
const PLAYER_REPORT_AUTO_FINALIZE_AFTER_MS = 60_000;
const TOURNAMENT_HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;

type PlayerReportedResult = "win" | "loss" | "tie";

type MatchReport = {
  id: string;
  roundNumber: number;
  divisionCategory?: string;
  tableNumber?: number;
  player1UserId?: string;
  player2UserId?: string;
  reporterUserId: string;
  reporterResult: PlayerReportedResult;
  mappedOutcome: number;
  createdAt: string;
  status: "pending" | "conflicted" | "finalized" | "admin_overridden";
  conflictNote?: string;
};

type TomMetadata = {
  importedByAdminId?: string;
  importedAt?: string;
  lastResultUpdateAt?: string;
  lastImportedFileName?: string;
  sourceFileStem?: string;
  importHistory?: Array<{
    importedAt: string;
    importedByAdminId: string;
    fileName?: string;
    snapshotKind: "root" | "round_start" | "round_begin" | "round_end" | "unknown";
    roundNumber?: number;
  }>;
  reports?: MatchReport[];
  pairingsReleasedRound?: number;
  pairingsReleasedRoundsByPod?: Record<string, number>;
  tournamentReleasedAt?: string;
  tournamentEndedAt?: string;
  playerAccessedUserIds?: string[];
  snapshotArchive?: Array<{
    id: string;
    fileName: string;
    importedAt: string;
    importedByAdminId: string;
    snapshotKind: "root" | "round_start" | "round_begin" | "round_end" | "unknown";
    roundNumber?: number;
    xml: string;
  }>;
};

const getStableSourceFileStem = (fileName?: string) => fileName
  ?.replace(/\.(?:tdf|xml)$/i, "")
  // TOM adds _rN-begin/end; Chrispyjams adds _cj_rN_end. Strip an entire
  // suffix chain so importing a TOM-generated follow-up file never changes
  // the stable filename prefix of subsequent exports.
  .replace(/(?:_cj_r\d+_end|_r\d+-(?:start|begin|end))+$/i, "")
  .trim();

export const recordTournamentPlayerAccess = async (customEventId: string, playerUserId: string) => {
  const tomState = getTomStateDelegate();
  const record = await tomState.findUnique({ where: { customEventId } });
  if (!record) return;
  const metadata = getMetadata(record);
  metadata.playerAccessedUserIds = Array.from(new Set([...(metadata.playerAccessedUserIds || []), playerUserId]));
  await tomState.update({ where: { customEventId }, data: { metadata, updatedAt: new Date() } });
};

export const releaseTournamentForPlayers = async (customEventId: string) => {
  const tomState = getTomStateDelegate();
  const record = await tomState.findUnique({ where: { customEventId } });
  if (!record) throw createError({ statusCode: 404, statusMessage: "No TOM state imported for this tournament" });
  const metadata = getMetadata(record);
  if (metadata.tournamentEndedAt) {
    throw createError({ statusCode: 409, statusMessage: "Das Turnier wurde bereits beendet." });
  }
  metadata.tournamentReleasedAt = new Date().toISOString();
  const updated = await tomState.update({
    where: { customEventId },
    data: { metadata, updatedAt: new Date() },
  });
  return { record: updated, stateView: buildTomStateView(updated.currentXml) };
};

export const endTournamentForPlayers = async (customEventId: string) => {
  const tomState = getTomStateDelegate();
  const record = await tomState.findUnique({ where: { customEventId } });
  if (!record) throw createError({ statusCode: 404, statusMessage: "No TOM state imported for this tournament" });

  const metadata = getMetadata(record);
  if (!metadata.tournamentReleasedAt) {
    throw createError({ statusCode: 409, statusMessage: "Gib zuerst das Turnier für Spieler frei." });
  }
  if (metadata.tournamentEndedAt) {
    throw createError({ statusCode: 409, statusMessage: "Das Turnier wurde bereits beendet." });
  }

  const snapshot = parseTomTdf(record.currentXml);
  if (snapshot.rounds.some((round) => round.matches.some((match) => match.outcome === 0))) {
    throw createError({
      statusCode: 409,
      statusMessage: "Alle Ergebnisse müssen gesetzt sein, bevor das Turnier beendet werden kann.",
    });
  }

  metadata.tournamentEndedAt = new Date().toISOString();
  const updated = await tomState.update({
    where: { customEventId },
    data: { metadata, updatedAt: new Date() },
  });
  return { record: updated, stateView: buildTomStateView(updated.currentXml) };
};

const parseTomSnapshotHint = (fileName?: string): {
  snapshotKind: "root" | "round_start" | "round_begin" | "round_end" | "unknown";
  roundNumber?: number;
} => {
  if (!fileName) {
    return { snapshotKind: "unknown" };
  }

  const lower = fileName.toLowerCase();
  const roundMatch = lower.match(/_r(\d+)-(start|begin|end)\.tdf$/);
  if (roundMatch) {
    const roundNumber = Number.parseInt(roundMatch[1], 10);
    const marker = roundMatch[2];
    if (marker === "start") {
      return { snapshotKind: "round_start", roundNumber };
    }
    if (marker === "begin") {
      return { snapshotKind: "round_begin", roundNumber };
    }
    return { snapshotKind: "round_end", roundNumber };
  }

  if (lower.endsWith(".tdf")) {
    return { snapshotKind: "root" };
  }

  return { snapshotKind: "unknown" };
};

const getTomStateDelegate = () => {
  const delegate = (prisma as any).tournamentTomState;

  if (!delegate) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Tournament TOM state model is not available in Prisma client. Run `npx prisma generate` and restart the dev server.",
    });
  }

  return delegate as {
    upsert: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
};

const getMetadata = (record: { metadata: unknown }): TomMetadata => {
  const meta = (record.metadata || {}) as TomMetadata;
  if (!Array.isArray(meta.reports)) {
    meta.reports = [];
  }
  return meta;
};

const sameMatchKey = (
  a: Pick<
    MatchReport,
    "roundNumber" | "divisionCategory" | "tableNumber" | "player1UserId" | "player2UserId"
  >,
  b: Pick<
    MatchReport,
    "roundNumber" | "divisionCategory" | "tableNumber" | "player1UserId" | "player2UserId"
  >,
) =>
  a.roundNumber === b.roundNumber &&
  (a.divisionCategory || "") === (b.divisionCategory || "") &&
  (a.tableNumber ?? null) === (b.tableNumber ?? null) &&
  (a.player1UserId || "") === (b.player1UserId || "") &&
  (a.player2UserId || "") === (b.player2UserId || "");

const mapPlayerResultToOutcome = (
  reporterUserId: string,
  player1UserId: string | undefined,
  player2UserId: string | undefined,
  result: PlayerReportedResult,
): number => {
  if (result === "tie") {
    return 3;
  }

  const reporterIsP1 = reporterUserId === player1UserId;
  const reporterIsP2 = reporterUserId === player2UserId;
  if (!reporterIsP1 && !reporterIsP2) {
    throw createError({
      statusCode: 400,
      statusMessage: "Reporter is not part of this match",
    });
  }

  if (reporterIsP1) {
    return result === "win" ? 1 : 2;
  }
  return result === "win" ? 2 : 1;
};

const applyOutcomeToXmlForReport = (
  xml: string,
  report: Pick<
    MatchReport,
    "roundNumber" | "divisionCategory" | "tableNumber" | "player1UserId" | "player2UserId" | "mappedOutcome"
  >,
) => {
  const updates: TomResultUpdate[] = [
    {
      roundNumber: report.roundNumber,
      divisionCategory: report.divisionCategory,
      tableNumber: report.tableNumber,
      player1UserId: report.player1UserId,
      player2UserId: report.player2UserId,
      outcome: report.mappedOutcome,
    },
  ];

  return applyTomResultUpdates(xml, updates);
};

const finalizePendingReports = (input: {
  metadata: TomMetadata;
  currentXml: string;
}): { metadata: TomMetadata; currentXml: string; changed: boolean } => {
  let changed = false;
  let currentXml = input.currentXml;
  const reports = input.metadata.reports || [];

  for (const report of reports) {
    if (report.status !== "pending") {
      continue;
    }

    const related = reports.filter((candidate) => sameMatchKey(report, candidate));
    const distinctReporters = Array.from(new Set(related.map((candidate) => candidate.reporterUserId)));

    if (distinctReporters.length > 1) {
      const outcomes = Array.from(new Set(related.map((candidate) => candidate.mappedOutcome)));
      if (outcomes.length === 1) {
        for (const item of related) {
          if (item.status !== "finalized") {
            item.status = "finalized";
            changed = true;
          }
        }
        currentXml = applyOutcomeToXmlForReport(currentXml, related[0]);
      } else {
        for (const item of related) {
          if (item.status !== "conflicted") {
            item.status = "conflicted";
            item.conflictNote = "Conflicting player reports";
            changed = true;
          }
        }
      }
      continue;
    }

    // If the opponent does not contradict the first report within one minute,
    // accept it. A later correction remains possible for an admin.
    const firstReport = related
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    const firstReportAge = firstReport ? Date.now() - new Date(firstReport.createdAt).getTime() : 0;
    if (firstReport && Number.isFinite(firstReportAge) && firstReportAge >= PLAYER_REPORT_AUTO_FINALIZE_AFTER_MS) {
      for (const item of related) {
        if (item.status !== "finalized") {
          item.status = "finalized";
          item.conflictNote = "Accepted after one minute without contradiction";
          changed = true;
        }
      }
      currentXml = applyOutcomeToXmlForReport(currentXml, firstReport);
    }
  }

  return {
    metadata: input.metadata,
    currentXml,
    changed,
  };
};

export const buildTomStateView = (xml: string) => {
  const snapshot = parseTomTdf(xml);
  const playerById = new Map(
    snapshot.players.map((player) => [
      player.userId,
      {
        displayName: `${player.firstName} ${player.lastName}`.trim(),
        droppedRound: player.droppedRound,
      },
    ]),
  );
  const playerDivisionMap = new Map<string, string[]>();
  const roundsByNumber = new Map<
    number,
    {
      number: number;
      type?: number;
      stage?: number;
      matches: Array<{
        tableNumber?: number;
        player1UserId?: string;
        player2UserId?: string;
        outcome: number;
        outcomeLabel: string;
        timestamp?: string;
        divisionCategory?: string;
      }>;
    }
  >();

  const divisions = snapshot.divisions.map((division) => {
    for (const userId of division.playerUserIds) {
      const existing = playerDivisionMap.get(userId) || [];
      if (!existing.includes(division.category)) {
        existing.push(division.category);
      }
      playerDivisionMap.set(userId, existing);
    }

    const currentDivisionRound =
      division.rounds.length > 0
        ? division.rounds.reduce((latest, current) =>
            current.number > latest.number ? current : latest,
          )
        : null;

    return {
      category: division.category,
      stage: division.stage,
      standings: buildTomStandings({
        playerUserIds: division.playerUserIds,
        matches: division.rounds.flatMap((round) => round.matches),
        playerById,
      }),
      rounds: division.rounds.map((round) => ({
        number: round.number,
        stage: round.stage,
        type: round.type,
        matchCount: round.matches.length,
        pairTime: round.pairTime,
        startTime: round.startTime,
      })),
      currentRound: currentDivisionRound
        ? {
            number: currentDivisionRound.number,
            stage: currentDivisionRound.stage,
            pairTime: currentDivisionRound.pairTime,
            startTime: currentDivisionRound.startTime,
            matches: currentDivisionRound.matches.map((match) => ({
              tableNumber: match.tableNumber,
              player1UserId: match.player1UserId,
              player2UserId: match.player2UserId,
              outcome: match.outcome,
              outcomeLabel: tomOutcomeLabel(match.outcome),
              timestamp: match.timestamp,
              divisionCategory: match.divisionCategory,
            })),
          }
        : null,
    };
  });

  for (const round of snapshot.rounds) {
    const existing = roundsByNumber.get(round.number) || {
      number: round.number,
      type: round.type,
      stage: round.stage,
      matches: [],
    };

    if (existing.type === undefined && round.type !== undefined) {
      existing.type = round.type;
    }
    if (existing.stage === undefined && round.stage !== undefined) {
      existing.stage = round.stage;
    }

    existing.matches.push(
      ...round.matches.map((match) => ({
        tableNumber: match.tableNumber,
        player1UserId: match.player1UserId,
        player2UserId: match.player2UserId,
        outcome: match.outcome,
        outcomeLabel: tomOutcomeLabel(match.outcome),
        timestamp: match.timestamp,
        divisionCategory: match.divisionCategory,
      })),
    );

    roundsByNumber.set(round.number, existing);
  }

  const roundsDetailed = Array.from(roundsByNumber.values()).sort(
    (a, b) => a.number - b.number,
  );

  const currentRound =
    roundsDetailed
      .slice()
      .reverse()
      .find((round) => round.matches.some((match) => match.outcome === 0)) ||
    roundsDetailed[roundsDetailed.length - 1] ||
    null;

  return {
    tournament: {
      name: snapshot.name,
      city: snapshot.city,
      country: snapshot.country,
      stage: snapshot.stage,
      gameType: snapshot.gameType,
      mode: snapshot.mode,
      startDate: snapshot.startDate,
    },
    playerCount: snapshot.players.length,
    players: snapshot.players.map((player) => ({
      userId: player.userId,
      firstName: player.firstName,
      lastName: player.lastName,
      birthDate: player.birthDate,
      displayName: `${player.firstName} ${player.lastName}`.trim(),
      divisions: playerDivisionMap.get(player.userId) || [],
    })),
    rounds: snapshot.rounds.map((round) => ({
      number: round.number,
      stage: round.stage,
      type: round.type,
      matchCount: round.matches.length,
      pairTime: round.pairTime,
      startTime: round.startTime,
    })),
    roundsDetailed,
    divisions,
    currentRound: currentRound
      ? {
          number: currentRound.number,
          stage:
            snapshot.rounds.find((round) => round.number === currentRound.number)
              ?.stage,
          pairTime:
            snapshot.rounds.find((round) => round.number === currentRound.number)
              ?.pairTime,
          startTime:
            snapshot.rounds.find((round) => round.number === currentRound.number)
              ?.startTime,
          matches: currentRound.matches,
        }
      : null,
  };
};

export const upsertTournamentTomState = async (input: {
  customEventId: string;
  xml: string;
  importedByAdminId: string;
  sourceFileName?: string;
}) => {
  const tomState = getTomStateDelegate();
  const existingRecord = await tomState.findUnique({ where: { customEventId: input.customEventId } });
  if (existingRecord && getMetadata(existingRecord).tournamentEndedAt) {
    throw createError({ statusCode: 409, statusMessage: "Ein beendetes Turnier kann nicht mehr aktualisiert werden." });
  }
  const stateView = buildTomStateView(input.xml);

  const snapshotHint = parseTomSnapshotHint(input.sourceFileName);
  const importHistoryEntry = {
    importedAt: new Date().toISOString(),
    importedByAdminId: input.importedByAdminId,
    fileName: input.sourceFileName,
    snapshotKind: snapshotHint.snapshotKind,
    roundNumber: snapshotHint.roundNumber,
  };

  const record = await tomState.upsert({
    where: {
      customEventId: input.customEventId,
    },
    create: {
      customEventId: input.customEventId,
      sourceXml: input.xml,
      currentXml: input.xml,
      importedByAdminId: input.importedByAdminId,
      importedAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        importedByAdminId: input.importedByAdminId,
        importedAt: new Date().toISOString(),
        lastImportedFileName: input.sourceFileName,
        sourceFileStem: getStableSourceFileStem(input.sourceFileName) || stateView.tournament.name,
        importHistory: [importHistoryEntry],
        pairingsReleasedRound: 0,
      },
    },
    update: {
      sourceXml: input.xml,
      currentXml: input.xml,
      importedByAdminId: input.importedByAdminId,
      importedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const updateMetadata = getMetadata(record);
  updateMetadata.sourceFileStem = updateMetadata.sourceFileStem || getStableSourceFileStem(input.sourceFileName) || stateView.tournament.name;
  updateMetadata.lastImportedFileName = input.sourceFileName;
  updateMetadata.importedByAdminId = input.importedByAdminId;
  updateMetadata.importedAt = new Date().toISOString();
  updateMetadata.importHistory = updateMetadata.importHistory || [];
  updateMetadata.importHistory.push(importHistoryEntry);
  if (input.sourceFileName) {
    updateMetadata.snapshotArchive = updateMetadata.snapshotArchive || [];
    updateMetadata.snapshotArchive.push({
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fileName: input.sourceFileName,
      importedAt: importHistoryEntry.importedAt,
      importedByAdminId: input.importedByAdminId,
      snapshotKind: snapshotHint.snapshotKind,
      roundNumber: snapshotHint.roundNumber,
      xml: input.xml,
    });
    if (updateMetadata.snapshotArchive.length > SNAPSHOT_ARCHIVE_LIMIT) {
      updateMetadata.snapshotArchive = updateMetadata.snapshotArchive.slice(
        updateMetadata.snapshotArchive.length - SNAPSHOT_ARCHIVE_LIMIT,
      );
    }
  }

  const updatedRecord = await tomState.update({
    where: { customEventId: input.customEventId },
    data: {
      metadata: updateMetadata,
      updatedAt: new Date(),
    },
  });

  return {
    record: updatedRecord,
    stateView,
  };
};

export const getTournamentTomState = async (customEventId: string) => {
  const tomState = getTomStateDelegate();
  const record = await tomState.findUnique({
    where: {
      customEventId,
    },
  });

  if (!record) {
    return null;
  }

  const metadata = getMetadata(record);
  const finalized = finalizePendingReports({
    metadata,
    currentXml: record.currentXml,
  });

  let effectiveRecord = record;
  if (finalized.changed) {
    effectiveRecord = await tomState.update({
      where: { customEventId },
      data: {
        currentXml: finalized.currentXml,
        metadata: finalized.metadata,
        updatedAt: new Date(),
      },
    });
  }

  const stateView = buildTomStateView(effectiveRecord.currentXml);

  return {
    record: effectiveRecord,
    stateView,
  };
};

export const applyTournamentTomResultUpdates = async (input: {
  customEventId: string;
  updates: TomResultUpdate[];
}) => {
  const tomState = getTomStateDelegate();
  const record = await tomState.findUnique({
    where: {
      customEventId: input.customEventId,
    },
  });

  if (!record) {
    throw createError({
      statusCode: 404,
      statusMessage: "No TOM state imported for this tournament",
    });
  }

  const updatedXml = applyTomResultUpdates(record.currentXml, input.updates);
  const metadata = getMetadata(record);

  // Undo means the table is open again. Old player reports must not be allowed
  // to immediately finalize the newly reset result.
  const resetUpdates = input.updates.filter((update) => update.outcome === 0);
  if (resetUpdates.length) {
    metadata.reports = (metadata.reports || []).filter(
      (report) => !resetUpdates.some((update) => sameMatchKey(report, update)),
    );
  }

  const updatedRecord = await tomState.update({
    where: {
      customEventId: input.customEventId,
    },
    data: {
      currentXml: updatedXml,
      updatedAt: new Date(),
      metadata: {
        ...metadata,
        lastResultUpdateAt: new Date().toISOString(),
      },
    },
  });

  const stateView = buildTomStateView(updatedRecord.currentXml);

  return {
    record: updatedRecord,
    stateView,
  };
};

export const releaseCurrentRoundForPlayers = async (customEventId: string, divisionCategory?: string) => {
  const state = await getTournamentTomState(customEventId);
  if (!state) {
    throw createError({
      statusCode: 404,
      statusMessage: "No TOM state imported for this tournament",
    });
  }

  const snapshot = parseTomTdf(state.record.currentXml);
  const currentRoundNumber = divisionCategory
    ? snapshot.rounds.slice().reverse().find((round) => round.matches.some((match) => match.divisionCategory === divisionCategory && match.outcome === 0))?.number
    : state.stateView.currentRound?.number;
  if (!currentRoundNumber) {
    throw createError({
      statusCode: 400,
      statusMessage: "No current round available to release",
    });
  }

  const metadata = getMetadata(state.record);
  if (!metadata.tournamentReleasedAt) {
    throw createError({ statusCode: 409, statusMessage: "Gib zuerst das Turnier für Spieler frei." });
  }
  if (metadata.tournamentEndedAt) {
    throw createError({ statusCode: 409, statusMessage: "Das Turnier wurde bereits beendet." });
  }
  if (divisionCategory) {
    metadata.pairingsReleasedRoundsByPod = { ...(metadata.pairingsReleasedRoundsByPod || {}), [divisionCategory]: currentRoundNumber };
  } else {
    metadata.pairingsReleasedRound = currentRoundNumber;
  }

  const tomState = getTomStateDelegate();
  const updated = await tomState.update({
    where: { customEventId },
    data: {
      metadata,
      updatedAt: new Date(),
    },
  });

  return {
    record: updated,
    releasedRound: currentRoundNumber,
    stateView: buildTomStateView(updated.currentXml),
  };
};

export const resolveTournamentTomConflict = async (input: {
  customEventId: string;
  update: TomResultUpdate;
}) => {
  const tomState = getTomStateDelegate();
  const record = await tomState.findUnique({
    where: { customEventId: input.customEventId },
  });

  if (!record) {
    throw createError({
      statusCode: 404,
      statusMessage: "No TOM state imported for this tournament",
    });
  }

  const updatedXml = applyTomResultUpdates(record.currentXml, [input.update]);
  const metadata = getMetadata(record);
  metadata.reports = (metadata.reports || []).map((report) => {
    const same =
      report.roundNumber === input.update.roundNumber &&
      (report.divisionCategory || "") === (input.update.divisionCategory || "") &&
      (report.tableNumber ?? null) === (input.update.tableNumber ?? null) &&
      (report.player1UserId || "") === (input.update.player1UserId || "") &&
      (report.player2UserId || "") === (input.update.player2UserId || "");
    if (!same) return report;
    return {
      ...report,
      status: "admin_overridden",
      conflictNote: "Resolved by admin",
    };
  });

  const updatedRecord = await tomState.update({
    where: { customEventId: input.customEventId },
    data: {
      currentXml: updatedXml,
      metadata,
      updatedAt: new Date(),
    },
  });

  return {
    record: updatedRecord,
    stateView: buildTomStateView(updatedRecord.currentXml),
  };
};

export const submitPlayerMatchReport = async (input: {
  customEventId: string;
  reporterUserId: string;
  roundNumber: number;
  divisionCategory?: string;
  tableNumber?: number;
  player1UserId?: string;
  player2UserId?: string;
  result: PlayerReportedResult;
}) => {
  const tomState = getTomStateDelegate();
  const record = await tomState.findUnique({
    where: { customEventId: input.customEventId },
  });

  if (!record) {
    throw createError({
      statusCode: 404,
      statusMessage: "No TOM state imported for this tournament",
    });
  }

  const playerRun = await getPlayerTournamentRun({
    customEventId: input.customEventId,
    playerUserId: input.reporterUserId,
  });

  if (!playerRun.currentMatch) {
    throw createError({
      statusCode: 403,
      statusMessage: "No active released match available for result submission",
    });
  }

  const isCurrentMatch =
    playerRun.currentMatch.roundNumber === input.roundNumber &&
    (playerRun.currentMatch.divisionCategory || "") === (input.divisionCategory || "") &&
    (playerRun.currentMatch.tableNumber ?? null) === (input.tableNumber ?? null) &&
    (playerRun.currentMatch.player1UserId || "") === (input.player1UserId || "") &&
    (playerRun.currentMatch.player2UserId || "") === (input.player2UserId || "");

  if (!isCurrentMatch) {
    throw createError({
      statusCode: 400,
      statusMessage: "Submitted match does not match your current released pairing",
    });
  }

  const metadata = getMetadata(record);
  const mappedOutcome = mapPlayerResultToOutcome(
    input.reporterUserId,
    input.player1UserId,
    input.player2UserId,
    input.result,
  );

  const report: MatchReport = {
    id: `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    roundNumber: input.roundNumber,
    divisionCategory: input.divisionCategory,
    tableNumber: input.tableNumber,
    player1UserId: input.player1UserId,
    player2UserId: input.player2UserId,
    reporterUserId: input.reporterUserId,
    reporterResult: input.result,
    mappedOutcome,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  metadata.reports = metadata.reports || [];
  // Let a player correct a pending/conflicting entry without accumulating
  // stale statements for the same pairing.
  metadata.reports = metadata.reports.filter(
    (existing) =>
      !(
        existing.reporterUserId === input.reporterUserId &&
        existing.status !== "finalized" &&
        existing.status !== "admin_overridden" &&
        sameMatchKey(existing, report)
      ),
  );
  metadata.reports.push(report);

  const finalized = finalizePendingReports({
    metadata,
    currentXml: record.currentXml,
  });

  const updated = await tomState.update({
    where: { customEventId: input.customEventId },
    data: {
      metadata: finalized.metadata,
      currentXml: finalized.currentXml,
      updatedAt: new Date(),
    },
  });

  return {
    report,
    record: updated,
    stateView: buildTomStateView(updated.currentXml),
  };
};

export const getPlayerTournamentRun = async (input: {
  customEventId: string;
  playerUserId: string;
}) => {
  const state = await getTournamentTomState(input.customEventId);
  if (!state) {
    throw createError({
      statusCode: 404,
      statusMessage: "No TOM state imported for this tournament",
    });
  }

  const snapshot = parseTomTdf(state.record.currentXml);
  const metadata = getMetadata(state.record);
  const reports = metadata.reports || [];
  const releasedRoundsByPod = metadata.pairingsReleasedRoundsByPod || {};
  const tournamentEndedAt = metadata.tournamentEndedAt;
  const historyAvailableUntil = tournamentEndedAt
    ? new Date(new Date(tournamentEndedAt).getTime() + TOURNAMENT_HISTORY_WINDOW_MS).toISOString()
    : undefined;
  const historyExpired = !!historyAvailableUntil && new Date(historyAvailableUntil).getTime() <= Date.now();

  const playerMatches = snapshot.rounds
    .flatMap((round) =>
      round.matches
        .filter(
          (match) =>
            match.player1UserId === input.playerUserId ||
            match.player2UserId === input.playerUserId,
        )
        .map((match) => ({
          roundNumber: round.number,
          divisionCategory: match.divisionCategory,
          tableNumber: match.tableNumber,
          opponentUserId:
            match.player1UserId === input.playerUserId
              ? match.player2UserId
              : match.player1UserId,
          isPlayer1: match.player1UserId === input.playerUserId,
          outcome: match.outcome,
          outcomeLabel: tomOutcomeLabel(match.outcome),
          pairTime: round.pairTime,
          startTime: round.startTime,
          player1UserId: match.player1UserId,
          player2UserId: match.player2UserId,
        })),
    )
    .sort((a, b) => a.roundNumber - b.roundNumber);

  let wins = 0;
  let losses = 0;
  let ties = 0;
  for (const match of playerMatches) {
    if (match.outcome === 0) {
      continue;
    }
    if (match.outcome === 3) {
      ties += 1;
      continue;
    }
    if (match.outcome === 5) {
      wins += 1;
      continue;
    }
    const isWin =
      (match.isPlayer1 && match.outcome === 1) ||
      (!match.isPlayer1 && match.outcome === 2);
    if (isWin) {
      wins += 1;
    } else {
      losses += 1;
    }
  }

  const currentMatchCandidate =
    playerMatches.slice().reverse().find((match) => match.outcome === 0) || null;
  const currentMatch =
    !tournamentEndedAt && currentMatchCandidate && currentMatchCandidate.roundNumber <= (releasedRoundsByPod[currentMatchCandidate.divisionCategory || ""] || metadata.pairingsReleasedRound || 0)
      ? currentMatchCandidate
      : null;

  // Pairings may already be uploaded to Chrispyjams before the organizer
  // releases the round. Do not leak an unreleased pending pairing through the
  // round history; only the live match is published after release.
  const publishedPlayerMatches = historyExpired ? [] : playerMatches.filter((match) => {
    if (tournamentEndedAt) return true;
    if (match.outcome !== 0) return true;
    const releasedRound =
      releasedRoundsByPod[match.divisionCategory || ""] ||
      metadata.pairingsReleasedRound ||
      0;
    return match.roundNumber <= releasedRound;
  });

  const matchReports = currentMatch
    ? reports.filter((report) =>
        sameMatchKey(report, {
          roundNumber: currentMatch.roundNumber,
          divisionCategory: currentMatch.divisionCategory,
          tableNumber: currentMatch.tableNumber,
          player1UserId: currentMatch.player1UserId,
          player2UserId: currentMatch.player2UserId,
        }),
      )
    : [];

  const opponentReported = matchReports.some(
    (report) => report.reporterUserId !== input.playerUserId,
  );
  const opponentReport = matchReports.find(
    (report) => report.reporterUserId !== input.playerUserId,
  );
  const ownReport = matchReports.find(
    (report) => report.reporterUserId === input.playerUserId,
  );

  return {
    stateView: state.stateView,
    playerUserId: input.playerUserId,
    playerMatches: publishedPlayerMatches,
    score: {
      wins,
      losses,
      ties,
      points: wins * 3 + ties,
    },
    currentMatch,
    reports: {
      currentMatchReports: matchReports,
      opponentReported,
      opponentResult: opponentReport?.reporterResult,
      ownResult: ownReport?.reporterResult,
      hasConflict: matchReports.some((report) => report.status === "conflicted"),
      awaitingBothConfirmations: currentMatch?.outcome === 0,
    },
    release: {
      pairingsReleasedRound: metadata.pairingsReleasedRound || 0,
      pairingsReleasedRoundsByPod: releasedRoundsByPod,
      tournamentEndedAt,
      historyAvailableUntil,
      historyExpired,
      isCurrentRoundReleased:
        !!currentMatchCandidate && currentMatchCandidate.roundNumber <= (releasedRoundsByPod[currentMatchCandidate.divisionCategory || ""] || metadata.pairingsReleasedRound || 0),
    },
  };
};
