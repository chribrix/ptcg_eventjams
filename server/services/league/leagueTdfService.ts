import { createHash } from "node:crypto";
import { buildTomStandings, parseTomTdf } from "../events/tomTdfService";

export type LeagueDivision = "junior" | "senior" | "master";

export type LeagueImportPlayer = {
  pokemonPlayerId: string;
  displayName: string;
  division: LeagueDivision | null;
  placement: number | null;
  status: "confirmed" | "dnf" | "unranked";
};

export type LeagueTournamentImport = {
  officialTournamentId: string | null;
  contentHash: string;
  name: string;
  eventDate: string;
  participantCount: number;
  players: LeagueImportPlayer[];
  warnings: string[];
};

const parseAttributes = (raw = ""): Record<string, string> => {
  const attributes: Record<string, string> = {};
  for (const match of raw.matchAll(/([\w:-]+)="([^"]*)"/g)) {
    attributes[match[1]] = match[2];
  }
  return attributes;
};

const tagValue = (content: string, tag: string): string =>
  content.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"))?.[1]?.trim() || "";

const parseUsDate = (value: string): string => {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    throw new Error("Das Turnierdatum hat ein unbekanntes Format.");
  }
  const [, month, day, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    throw new Error("Das Turnierdatum ist ungültig.");
  }
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const playersInPod = (xml: string, predicate: (attributes: Record<string, string>) => boolean) => {
  const result = new Map<string, number | null>();
  for (const podMatch of xml.matchAll(/<pod\b([^>]*)>([\s\S]*?)<\/pod>/gi)) {
    const podAttributes = parseAttributes(podMatch[1]);
    if (!predicate(podAttributes)) continue;
    for (const playerMatch of podMatch[2].matchAll(/<player\b([^>]*)\/?\s*>/gi)) {
      const attributes = parseAttributes(playerMatch[1]);
      const playerId = attributes.id?.trim();
      if (!playerId) continue;
      const placement = /^\d+$/.test(attributes.place || "")
        ? Number(attributes.place)
        : null;
      result.set(playerId, placement);
    }
  }
  return result;
};

const DIVISION_BY_CATEGORY: Record<string, LeagueDivision> = {
  "0": "junior",
  "1": "senior",
  "2": "master",
};

const divisionsByPlayer = (xml: string) => {
  const result = new Map<string, LeagueDivision>();
  for (const podMatch of xml.matchAll(/<pod\b([^>]*)>([\s\S]*?)<\/pod>/gi)) {
    const podAttributes = parseAttributes(podMatch[1]);
    const division = DIVISION_BY_CATEGORY[podAttributes.category];
    if (!division || !["finished", "dnf"].includes(podAttributes.type)) continue;
    for (const playerMatch of podMatch[2].matchAll(/<player\b([^>]*)\/?\s*>/gi)) {
      const playerId = parseAttributes(playerMatch[1]).id?.trim();
      if (playerId) result.set(playerId, division);
    }
  }
  return result;
};

export const parseLeagueTdf = (xml: string): LeagueTournamentImport => {
  if (Buffer.byteLength(xml, "utf8") > 5 * 1024 * 1024) {
    throw new Error("Die XML-Datei ist größer als 5 MB.");
  }
  if (!/^\s*(?:<\?xml[\s\S]*?\?>\s*)?<tournament\b/i.test(xml)) {
    throw new Error("Die Datei enthält keine gültige Turnier-XML.");
  }

  const data = xml.match(/<data>([\s\S]*?)<\/data>/i)?.[1] || "";
  const name = tagValue(data, "name") || "Unbenanntes Turnier";
  const rawDate = tagValue(data, "startdate");
  if (!rawDate) throw new Error("Die Turnierdatei enthält kein Startdatum.");

  const roster = new Map<string, { displayName: string; starter: boolean }>();
  const playersSection = xml.match(/<players>([\s\S]*?)<\/players>/i)?.[1] || "";
  for (const playerMatch of playersSection.matchAll(/<player\b([^>]*)>([\s\S]*?)<\/player>/gi)) {
    const attributes = parseAttributes(playerMatch[1]);
    const pokemonPlayerId = attributes.userid?.trim();
    const displayName = [tagValue(playerMatch[2], "firstname"), tagValue(playerMatch[2], "lastname")]
      .filter(Boolean)
      .join(" ");
    if (pokemonPlayerId && displayName && !roster.has(pokemonPlayerId)) {
      roster.set(pokemonPlayerId, {
        displayName,
        starter: tagValue(playerMatch[2], "starter").toLowerCase() === "true",
      });
    }
  }
  if (roster.size === 0) {
    throw new Error("In der XML-Datei wurden keine Spieler mit ID und Name gefunden.");
  }

  const dnf = playersInPod(xml, (attributes) => attributes.type === "dnf");
  const allFinished = playersInPod(
    xml,
    (attributes) => attributes.type === "finished",
  );
  let placements = allFinished;
  const playerDivisions = divisionsByPlayer(xml);
  const finishedCategories = new Set<string>();
  for (const podMatch of xml.matchAll(/<pod\b([^>]*)>[\s\S]*?<\/pod>/gi)) {
    const attributes = parseAttributes(podMatch[1]);
    if (attributes.type === "finished" && attributes.category !== undefined) {
      finishedCategories.add(attributes.category);
    }
  }
  if (finishedCategories.size > 1) {
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
    const rankedPlayerIds = new Set(allFinished.keys());
    const overallStandings = buildTomStandings({
      playerUserIds: [...rankedPlayerIds],
      matches: snapshot.rounds.flatMap((round) => round.matches),
      playerById,
    }).filter((standing) => rankedPlayerIds.has(standing.userId));
    if (!overallStandings.some((standing) => standing.matchesPlayed > 0)) {
      throw new Error(
        "Die Altersklassen können ohne abgeschlossene Runden nicht gemeinsam gewertet werden.",
      );
    }
    placements = new Map(
      overallStandings.map((standing, index) => [standing.userId, index + 1]),
    );
  }
  if (placements.size === 0) {
    throw new Error("Die Turnierdatei enthält keine abgeschlossene Wertung.");
  }
  const warnings: string[] = [];
  if (dnf.size > 0) {
    warnings.push(`${dnf.size} Spieler sind als DNF gemeldet; sie werden mit 0 Punkten gespeichert.`);
  }
  const unrankedStarters = [...roster.entries()].filter(
    ([id, player]) => player.starter && !placements.has(id) && !dnf.has(id) && !allFinished.has(id),
  );
  if (unrankedStarters.length > 0) {
    warnings.push(`${unrankedStarters.length} gestartete Spieler haben keine erkennbare Endplatzierung.`);
  }

  const normalizedXml = xml.replace(
    /(<data>[\s\S]*?<id>)[\s\S]*?(<\/id>)/i,
    "$1$2",
  );
  const players: LeagueImportPlayer[] = [...roster.entries()].map(([pokemonPlayerId, player]) => ({
    pokemonPlayerId,
    displayName: player.displayName,
    division: playerDivisions.get(pokemonPlayerId) ?? null,
    placement: placements.get(pokemonPlayerId) ?? null,
    status: placements.has(pokemonPlayerId)
      ? "confirmed"
      : dnf.has(pokemonPlayerId)
        ? "dnf"
        : "unranked",
  }));

  return {
    officialTournamentId: tagValue(data, "id") || null,
    contentHash: createHash("sha256").update(normalizedXml).digest("hex"),
    name,
    eventDate: parseUsDate(rawDate),
    participantCount: [...roster.values()].filter((player) => player.starter).length || roster.size,
    players,
    warnings,
  };
};