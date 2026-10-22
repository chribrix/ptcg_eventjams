export type TomPlayer = {
  userId: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  droppedRound?: number;
};

export type TomMatch = {
  outcome: number;
  tableNumber?: number;
  player1UserId?: string;
  player2UserId?: string;
  timestamp?: string;
  divisionCategory?: string;
};

export type TomRound = {
  number: number;
  type?: number;
  stage?: number;
  timeLeft?: number;
  pairTime?: string;
  startTime?: string;
  matches: TomMatch[];
};

export type TomDivision = {
  category: string;
  stage?: number;
  playerUserIds: string[];
  rounds: TomRound[];
};

export type TomTournamentSnapshot = {
  name?: string;
  city?: string;
  country?: string;
  stage?: number;
  gameType?: string;
  mode?: string;
  startDate?: string;
  players: TomPlayer[];
  rounds: TomRound[];
  divisions: TomDivision[];
};

export type TomResultUpdate = {
  roundNumber: number;
  player1UserId?: string;
  player2UserId?: string;
  tableNumber?: number;
  outcome: number;
  divisionCategory?: string;
};

export type TomStandingEntry = {
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

const getTagValue = (content: string, tag: string): string | undefined => {
  const match = content.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1]?.trim();
};

const parseAttributes = (raw = ""): Record<string, string> => {
  const attributes: Record<string, string> = {};
  const regex = /(\w+)="([^"]*)"/g;
  let match: RegExpExecArray | null = null;

  while (true) {
    match = regex.exec(raw);
    if (!match) {
      break;
    }
    attributes[match[1]] = match[2];
  }

  return attributes;
};

const parseNumber = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const toPercent = (value: number): number => {
  return Math.round(value * 10000) / 100;
};

export const buildTomStandings = (input: {
  playerUserIds: string[];
  matches: Array<{
    outcome: number;
    player1UserId?: string;
    player2UserId?: string;
  }>;
  playerById: Map<string, { displayName: string; droppedRound?: number }>;
}): TomStandingEntry[] => {
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

  const emptyStats = () => ({
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

  for (const userId of input.playerUserIds) {
    stats.set(userId, emptyStats());
  }

  const ensure = (userId?: string) => {
    if (!userId) return null;
    const existing = stats.get(userId);
    if (existing) return existing;
    const next = emptyStats();
    stats.set(userId, next);
    return next;
  };

  for (const match of input.matches) {
    const player1 = ensure(match.player1UserId);
    const player2 = ensure(match.player2UserId);
    if (!player1 && !player2) continue;

    if (match.player1UserId && match.player2UserId) {
      player1?.opponents.add(match.player2UserId);
      player2?.opponents.add(match.player1UserId);
    }

    if (match.outcome === 0) continue;

    if (match.outcome === 5) {
      const byePlayer = player1 || player2;
      if (byePlayer) {
        byePlayer.matchesPlayed += 1;
        byePlayer.matchPoints += 3;
        byePlayer.wins += 1;
      }
      continue;
    }

    if (match.outcome === 3) {
      for (const player of [player1, player2]) {
        if (!player) continue;
        player.matchesPlayed += 1;
        player.matchPoints += 1;
        player.ties += 1;
        player.tiesForWinPct += 1;
        player.roundsForWinPct += 1;
      }
      continue;
    }

    for (const player of [player1, player2]) {
      if (!player) continue;
      player.matchesPlayed += 1;
      player.roundsForWinPct += 1;
    }

    if (match.outcome === 1) {
      if (player1) {
        player1.matchPoints += 3;
        player1.wins += 1;
        player1.winsForWinPct += 1;
      }
      if (player2) player2.losses += 1;
      continue;
    }

    if (match.outcome === 2) {
      if (player2) {
        player2.matchPoints += 3;
        player2.wins += 1;
        player2.winsForWinPct += 1;
      }
      if (player1) player1.losses += 1;
    }
  }

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const winRatioByPlayer = new Map<string, number>();
  for (const [userId, stat] of stats) {
    const baseRatio =
      stat.roundsForWinPct > 0
        ? (stat.winsForWinPct + stat.tiesForWinPct / 2) / stat.roundsForWinPct
        : 0;
    const dropped = typeof input.playerById.get(userId)?.droppedRound === "number";
    winRatioByPlayer.set(userId, clamp(baseRatio, 0.25, dropped ? 0.75 : 1));
  }

  const entries: TomStandingEntry[] = Array.from(stats.entries()).map(([userId, stat]) => {
    const opponents = Array.from(stat.opponents);
    const opponentWinRatio =
      opponents.length > 0
        ? opponents.reduce((sum, opponentId) => sum + (winRatioByPlayer.get(opponentId) || 0), 0) /
          opponents.length
        : 0;
    const opponentOpponentWinRatio =
      opponents.length > 0
        ? opponents.reduce((sum, opponentId) => {
            const opponentStats = stats.get(opponentId);
            if (!opponentStats) return sum;
            const otherOpponents = Array.from(opponentStats.opponents).filter((id) => id !== userId);
            if (otherOpponents.length === 0) return sum;
            return sum + otherOpponents.reduce(
              (inner, otherOpponentId) => inner + (winRatioByPlayer.get(otherOpponentId) || 0),
              0,
            ) / otherOpponents.length;
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
      opponentWinPercent: toPercent(opponentWinRatio),
      opponentOpponentWinPercent: toPercent(opponentOpponentWinRatio),
    };
  });

  entries.sort((left, right) => {
    if (right.matchPoints !== left.matchPoints) return right.matchPoints - left.matchPoints;
    if (right.opponentWinPercent !== left.opponentWinPercent) {
      return right.opponentWinPercent - left.opponentWinPercent;
    }
    if (right.opponentOpponentWinPercent !== left.opponentOpponentWinPercent) {
      return right.opponentOpponentWinPercent - left.opponentOpponentWinPercent;
    }
    return left.displayName.localeCompare(right.displayName);
  });

  return entries;
};

export const parseTomTdf = (xml: string): TomTournamentSnapshot => {
  const tournamentOpen = xml.match(/<tournament\b([^>]*)>/i);
  const tournamentAttrs = parseAttributes(tournamentOpen?.[1]);

  const dataContent = xml.match(/<data>([\s\S]*?)<\/data>/i)?.[1] ?? "";
  const playersSection = xml.match(/<players>([\s\S]*?)<\/players>/i)?.[1] ?? "";

  const players: TomPlayer[] = [];
  const playerRegex = /<player\b([^>]*)>([\s\S]*?)<\/player>/gi;
  let playerMatch: RegExpExecArray | null = null;

  while (true) {
    playerMatch = playerRegex.exec(playersSection);
    if (!playerMatch) {
      break;
    }

    const attrs = parseAttributes(playerMatch[1]);
    const body = playerMatch[2] ?? "";

    if (!getTagValue(body, "firstname") && !getTagValue(body, "lastname")) {
      continue;
    }

    players.push({
      userId: attrs.userid ?? "",
      firstName: getTagValue(body, "firstname") ?? "",
      lastName: getTagValue(body, "lastname") ?? "",
      birthDate: getTagValue(body, "birthdate"),
      droppedRound: parseNumber(getTagValue(body, "round")),
    });
  }

  const parseRoundsFromContent = (content: string): TomRound[] => {
    const rounds: TomRound[] = [];
    const roundRegex = /<round\b([^>]*)>([\s\S]*?)<\/round>/gi;
    let roundMatch: RegExpExecArray | null = null;

    while (true) {
      roundMatch = roundRegex.exec(content);
      if (!roundMatch) {
        break;
      }

      const roundAttrs = parseAttributes(roundMatch[1]);
      const roundBody = roundMatch[2] ?? "";

      const matches: TomMatch[] = [];
      const matchRegex = /<match\b([^>]*)>([\s\S]*?)<\/match>/gi;
      let matchMatch: RegExpExecArray | null = null;

      while (true) {
        matchMatch = matchRegex.exec(roundBody);
        if (!matchMatch) {
          break;
        }

        const matchAttrs = parseAttributes(matchMatch[1]);
        const matchBody = matchMatch[2] ?? "";
        const p1Attrs = parseAttributes(
          matchBody.match(/<player1\b([^>]*)\/?\s*>/i)?.[1],
        );
        const p2Attrs = parseAttributes(
          matchBody.match(/<player2\b([^>]*)\/?\s*>/i)?.[1],
        );
        const byePlayerAttrs = parseAttributes(
          matchBody.match(/<player\b([^>]*)\/?\s*>/i)?.[1],
        );

        // TOM encodes BYE as single <player userid="..."/> with outcome="5".
        // We normalize that player into player1UserId so the rest of the system
        // can treat BYE matches like "one real player, no opponent".
        const normalizedPlayer1UserId = p1Attrs.userid || byePlayerAttrs.userid;

        matches.push({
          outcome: parseNumber(matchAttrs.outcome) ?? 0,
          tableNumber: parseNumber(getTagValue(matchBody, "tablenumber")),
          player1UserId: normalizedPlayer1UserId,
          player2UserId: p2Attrs.userid,
          timestamp: getTagValue(matchBody, "timestamp"),
        });
      }

      rounds.push({
        number: parseNumber(roundAttrs.number) ?? 0,
        type: parseNumber(roundAttrs.type),
        stage: parseNumber(roundAttrs.stage),
        timeLeft: parseNumber(getTagValue(roundBody, "timeleft")),
        pairTime: getTagValue(roundBody, "pairtime"),
        startTime: getTagValue(roundBody, "starttime"),
        matches,
      });
    }

    rounds.sort((a, b) => a.number - b.number);
    return rounds;
  };

  const divisions: TomDivision[] = [];
  const podRegex = /<pod\b([^>]*)>([\s\S]*?)<\/pod>/gi;
  // TOM also writes placement summaries as <pod> elements in <standings>.
  // They are not tournament divisions and must not become pairings.
  const podsContent = xml.match(/<pods>([\s\S]*?)<\/pods>/i)?.[1] ?? "";
  let podMatch: RegExpExecArray | null = null;
  while (true) {
    podMatch = podRegex.exec(podsContent);
    if (!podMatch) {
      break;
    }
    const podAttrs = parseAttributes(podMatch[1]);
    const podBody = podMatch[2] ?? "";
    const roundsSection = podBody.match(/<rounds>([\s\S]*?)<\/rounds>/i)?.[1] ?? "";
    const rounds = parseRoundsFromContent(roundsSection);
    const subgroupPlayersSection =
      podBody.match(/<subgroups>([\s\S]*?)<\/subgroups>/i)?.[1] ?? "";
    const podPlayerUserIds = Array.from(
      subgroupPlayersSection.matchAll(/<player\b[^>]*userid="([^"]+)"[^>]*\/?>/gi),
    ).map((match) => match[1]);
    const category = podAttrs.category ?? "unknown";
    for (const round of rounds) {
      for (const match of round.matches) {
        match.divisionCategory = category;
      }
    }

    divisions.push({
      category,
      stage: parseNumber(podAttrs.stage),
      playerUserIds: Array.from(new Set(podPlayerUserIds)),
      rounds,
    });
  }

  const rounds = divisions.flatMap((division) => division.rounds);
  rounds.sort((a, b) => a.number - b.number);

  return {
    name: getTagValue(dataContent, "name"),
    city: getTagValue(dataContent, "city"),
    country: getTagValue(dataContent, "country"),
    stage: parseNumber(tournamentAttrs.stage),
    gameType: tournamentAttrs.gametype,
    mode: tournamentAttrs.mode,
    startDate: getTagValue(dataContent, "startdate"),
    players,
    rounds,
    divisions,
  };
};

/** Creates a standalone TOM document containing only the selected pod. */
export const exportTomPodTdf = (xml: string, divisionCategory: string): string => {
  const snapshot = parseTomTdf(xml);
  const division = snapshot.divisions.find((entry) => entry.category === divisionCategory);
  if (!division) {
    throw createError({ statusCode: 404, statusMessage: `Pod ${divisionCategory} was not found in this TOM file` });
  }

  const podsContent = xml.match(/<pods>([\s\S]*?)<\/pods>/i)?.[1] ?? "";
  const podXml = Array.from(podsContent.matchAll(/<pod\b([^>]*)>[\s\S]*?<\/pod>/gi))
    .find((match) => parseAttributes(match[1]).category === divisionCategory && /<rounds>/i.test(match[0]))?.[0];
  if (!podXml) {
    throw createError({ statusCode: 422, statusMessage: "Selected TOM pod could not be exported" });
  }

  const playerIds = new Set(division.playerUserIds);
  for (const match of division.rounds.flatMap((round) => round.matches)) {
    if (match.player1UserId) playerIds.add(match.player1UserId);
    if (match.player2UserId) playerIds.add(match.player2UserId);
  }
  const playersSection = xml.match(/<players>([\s\S]*?)<\/players>/i);
  if (!playersSection) {
    throw createError({ statusCode: 422, statusMessage: "TOM player list is missing" });
  }
  const selectedPlayers = Array.from(playersSection[1].matchAll(/<player\b([^>]*)>[\s\S]*?<\/player>/gi))
    .filter((match) => playerIds.has(parseAttributes(match[1]).userid || ""))
    .map((match) => match[0]);

  let podExport = xml.replace(/<players>[\s\S]*?<\/players>/i, `<players>\n${selectedPlayers.join("\n")}\n</players>`);
  podExport = podExport.replace(/<pods>[\s\S]*?<\/pods>/i, `<pods>\n${podXml}\n</pods>`);
  return podExport;
};

export const getCurrentRound = (snapshot: TomTournamentSnapshot): TomRound | null => {
  if (!snapshot.rounds.length) {
    return null;
  }
  return snapshot.rounds.reduce((latest, current) => {
    return current.number > latest.number ? current : latest;
  });
};

export const getPlayerPairings = (
  snapshot: TomTournamentSnapshot,
  playerUserId: string,
): { currentRound: number | null; matches: TomMatch[] } => {
  const currentRound = getCurrentRound(snapshot);
  if (!currentRound) {
    return { currentRound: null, matches: [] };
  }

  const matches = currentRound.matches.filter((match) => {
    return match.player1UserId === playerUserId || match.player2UserId === playerUserId;
  });

  return {
    currentRound: currentRound.number,
    matches,
  };
};

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const applyUpdateToRound = (roundXml: string, update: TomResultUpdate): { roundXml: string; updated: boolean } => {
  const matchRegex = /<match\b([^>]*)>([\s\S]*?)<\/match>/gi;
  let updated = false;

  const replaced = roundXml.replace(matchRegex, (full, rawAttrs, body) => {
    if (updated) {
      return full;
    }

    const p1Attrs = parseAttributes(body.match(/<player1\b([^>]*)\/?\s*>/i)?.[1]);
    const p2Attrs = parseAttributes(body.match(/<player2\b([^>]*)\/?\s*>/i)?.[1]);
    const table = parseNumber(getTagValue(body, "tablenumber"));

    const samePlayers =
      (!update.player1UserId || p1Attrs.userid === update.player1UserId) &&
      (!update.player2UserId || p2Attrs.userid === update.player2UserId);

    const sameTable = update.tableNumber === undefined || table === update.tableNumber;

    if (!samePlayers || !sameTable) {
      return full;
    }

    const attrText = String(rawAttrs || "");
    let nextAttrs = attrText;

    if (/\boutcome="[^"]*"/i.test(nextAttrs)) {
      nextAttrs = nextAttrs.replace(/\boutcome="[^"]*"/i, `outcome="${update.outcome}"`);
    } else {
      nextAttrs = `${nextAttrs} outcome="${update.outcome}"`;
    }

    updated = true;
    return `<match${nextAttrs}>${body}</match>`;
  });

  return { roundXml: replaced, updated };
};

export const applyTomResultUpdates = (xml: string, updates: TomResultUpdate[]): string => {
  let output = xml;

  for (const update of updates) {
    if (update.divisionCategory) {
      const podRegex = new RegExp(
        `(<pod\\b[^>]*category="${escapeRegExp(update.divisionCategory)}"[^>]*>[\\s\\S]*?<\\/pod>)`,
        "i",
      );
      const podMatch = output.match(podRegex);
      if (!podMatch?.[1]) {
        continue;
      }

      const roundRegex = new RegExp(
        `(<round\\b[^>]*number="${escapeRegExp(String(update.roundNumber))}"[^>]*>[\\s\\S]*?<\\/round>)`,
        "i",
      );
      const roundMatch = podMatch[1].match(roundRegex);
      if (!roundMatch?.[1]) {
        continue;
      }

      const changed = applyUpdateToRound(roundMatch[1], update);
      if (!changed.updated) {
        continue;
      }

      const nextPod = podMatch[1].replace(roundMatch[1], changed.roundXml);
      output = output.replace(podMatch[1], nextPod);
      continue;
    }

    const roundRegex = new RegExp(
      `(<round\\b[^>]*number="${escapeRegExp(String(update.roundNumber))}"[^>]*>[\\s\\S]*?<\\/round>)`,
      "i",
    );
    const roundMatch = output.match(roundRegex);
    if (!roundMatch?.[1]) {
      continue;
    }

    const changed = applyUpdateToRound(roundMatch[1], update);
    if (!changed.updated) {
      continue;
    }

    output = output.replace(roundMatch[1], changed.roundXml);
  }

  return output;
};

export const tomOutcomeLabel = (outcome: number): string => {
  const map: Record<number, string> = {
    0: "pending",
    1: "player1_win",
    2: "player2_win",
    3: "draw_or_split",
    5: "bye",
    8: "double_loss_or_no_result",
  };

  return map[outcome] ?? "unknown";
};
