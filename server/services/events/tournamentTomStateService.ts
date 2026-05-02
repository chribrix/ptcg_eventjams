import prisma from "~/lib/prisma";
import {
  applyTomResultUpdates,
  parseTomTdf,
  tomOutcomeLabel,
  type TomResultUpdate,
} from "~/server/services/events/tomTdfService";

const REPORT_DISPUTE_WINDOW_MS = 30_000;
const SNAPSHOT_ARCHIVE_LIMIT = 30;

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
  importHistory?: Array<{
    importedAt: string;
    importedByAdminId: string;
    fileName?: string;
    snapshotKind: "root" | "round_start" | "round_begin" | "round_end" | "unknown";
    roundNumber?: number;
  }>;
  reports?: MatchReport[];
  pairingsReleasedRound?: number;
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
  const now = Date.now();
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

    const ageMs = now - new Date(report.createdAt).getTime();
    if (ageMs >= REPORT_DISPUTE_WINDOW_MS) {
      report.status = "finalized";
      changed = true;
      currentXml = applyOutcomeToXmlForReport(currentXml, report);
    }
  }

  return {
    metadata: input.metadata,
    currentXml,
    changed,
  };
};

type DivisionStandingEntry = {
  userId: string;
  displayName: string;
  matchPoints: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  opponentWinPercent: number;
  opponentOpponentWinPercent: number;
};

const toPercent = (value: number): number => {
  return Math.round(value * 10000) / 100;
};

const buildDivisionStandings = (input: {
  playerUserIds: string[];
  matches: Array<{
    outcome: number;
    player1UserId?: string;
    player2UserId?: string;
  }>;
  playerById: Map<string, { displayName: string; droppedRound?: number }>;
}): DivisionStandingEntry[] => {
  const stats = new Map<
    string,
    {
      matchPoints: number;
      matchesPlayed: number;
      wins: number;
      losses: number;
      ties: number;
      winsForWinPct: number;
      tiesForWinPct: number;
      roundsForWinPct: number;
      opponents: Set<string>;
    }
  >();

  for (const userId of input.playerUserIds) {
    stats.set(userId, {
      matchPoints: 0,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      winsForWinPct: 0,
      tiesForWinPct: 0,
      roundsForWinPct: 0,
      opponents: new Set<string>(),
    });
  }

  const ensure = (userId?: string) => {
    if (!userId) return null;
    const existing = stats.get(userId);
    if (existing) return existing;
    const next = {
      matchPoints: 0,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      winsForWinPct: 0,
      tiesForWinPct: 0,
      roundsForWinPct: 0,
      opponents: new Set<string>(),
    };
    stats.set(userId, next);
    return next;
  };

  for (const match of input.matches) {
    const p1 = ensure(match.player1UserId);
    const p2 = ensure(match.player2UserId);
    if (!p1 && !p2) continue;

    if (match.player1UserId && match.player2UserId) {
      p1?.opponents.add(match.player2UserId);
      p2?.opponents.add(match.player1UserId);
    }

    if (match.outcome === 0) continue;

    if (match.outcome === 5) {
      if (p1) {
        p1.matchesPlayed += 1;
        p1.matchPoints += 3;
        p1.wins += 1;
      } else if (p2) {
        p2.matchesPlayed += 1;
        p2.matchPoints += 3;
        p2.wins += 1;
      }
      continue;
    }

    if (match.outcome === 3) {
      if (p1) {
        p1.matchesPlayed += 1;
        p1.matchPoints += 1;
        p1.ties += 1;
        p1.tiesForWinPct += 1;
        p1.roundsForWinPct += 1;
      }
      if (p2) {
        p2.matchesPlayed += 1;
        p2.matchPoints += 1;
        p2.ties += 1;
        p2.tiesForWinPct += 1;
        p2.roundsForWinPct += 1;
      }
      continue;
    }

    if (p1) {
      p1.matchesPlayed += 1;
      p1.roundsForWinPct += 1;
    }
    if (p2) {
      p2.matchesPlayed += 1;
      p2.roundsForWinPct += 1;
    }

    if (match.outcome === 1) {
      if (p1) {
        p1.matchPoints += 3;
        p1.wins += 1;
        p1.winsForWinPct += 1;
      }
      if (p2) p2.losses += 1;
      continue;
    }

    if (match.outcome === 2) {
      if (p2) {
        p2.matchPoints += 3;
        p2.wins += 1;
        p2.winsForWinPct += 1;
      }
      if (p1) p1.losses += 1;
    }
  }

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const winRatioByPlayer = new Map<string, number>();
  for (const [userId, stat] of stats) {
    const baseRatio =
      stat.roundsForWinPct > 0
        ? (stat.winsForWinPct + stat.tiesForWinPct / 2) / stat.roundsForWinPct
        : 0;
    const playerMeta = input.playerById.get(userId);
    const dropped = typeof playerMeta?.droppedRound === "number";
    const ratio = clamp(baseRatio, 0.25, dropped ? 0.75 : 1);
    winRatioByPlayer.set(userId, ratio);
  }

  const entries: DivisionStandingEntry[] = Array.from(stats.entries()).map(([userId, stat]) => {
    const opponents = Array.from(stat.opponents);
    const omwRaw =
      opponents.length > 0
        ? opponents.reduce((sum, opponentUserId) => sum + (winRatioByPlayer.get(opponentUserId) || 0), 0) /
          opponents.length
        : 0;

    const oowRaw = opponents.length > 0
      ? opponents.reduce((sum, opponentUserId) => {
          const oppStat = stats.get(opponentUserId);
          if (!oppStat) return sum;
          const oppOpponents = Array.from(oppStat.opponents).filter((id) => id !== userId);
          if (oppOpponents.length === 0) return sum;
          const oppOppAvg =
            oppOpponents.reduce((inner, oppOppId) => inner + (winRatioByPlayer.get(oppOppId) || 0), 0) /
            oppOpponents.length;
          return sum + oppOppAvg;
        }, 0) / opponents.length
      : 0;

    return {
      userId,
      displayName: input.playerById.get(userId)?.displayName || userId,
      matchPoints: stat.matchPoints,
      matchesPlayed: stat.matchesPlayed,
      wins: stat.wins,
      losses: stat.losses,
      ties: stat.ties,
      opponentWinPercent: toPercent(omwRaw),
      opponentOpponentWinPercent: toPercent(oowRaw),
    };
  });

  entries.sort((a, b) => {
    if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
    if (b.opponentWinPercent !== a.opponentWinPercent) return b.opponentWinPercent - a.opponentWinPercent;
    if (b.opponentOpponentWinPercent !== a.opponentOpponentWinPercent) return b.opponentOpponentWinPercent - a.opponentOpponentWinPercent;
    return a.displayName.localeCompare(b.displayName);
  });

  return entries;
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
      standings: buildDivisionStandings({
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
      metadata: {
        importedByAdminId: input.importedByAdminId,
        importedAt: new Date().toISOString(),
      },
    },
  });

  const updateMetadata = getMetadata(record);
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

  const updatedRecord = await tomState.update({
    where: {
      customEventId: input.customEventId,
    },
    data: {
      currentXml: updatedXml,
      updatedAt: new Date(),
      metadata: {
        ...(record.metadata as Record<string, unknown> | null),
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

export const releaseCurrentRoundForPlayers = async (customEventId: string) => {
  const state = await getTournamentTomState(customEventId);
  if (!state) {
    throw createError({
      statusCode: 404,
      statusMessage: "No TOM state imported for this tournament",
    });
  }

  const currentRoundNumber = state.stateView.currentRound?.number;
  if (!currentRoundNumber) {
    throw createError({
      statusCode: 400,
      statusMessage: "No current round available to release",
    });
  }

  const metadata = getMetadata(state.record);
  metadata.pairingsReleasedRound = currentRoundNumber;

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
  const releasedRound = metadata.pairingsReleasedRound || 0;

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
    currentMatchCandidate && currentMatchCandidate.roundNumber <= releasedRound
      ? currentMatchCandidate
      : null;

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

  return {
    stateView: state.stateView,
    playerMatches,
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
      disputeWindowSeconds: 30,
    },
    release: {
      pairingsReleasedRound: releasedRound,
      isCurrentRoundReleased:
        !!currentMatchCandidate && currentMatchCandidate.roundNumber <= releasedRound,
    },
  };
};
