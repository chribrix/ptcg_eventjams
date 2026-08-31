import prisma from "~/lib/prisma";
import { calculateLeagueStandings } from "./leagueRanking";
import type { LeagueTournamentImport } from "./leagueTdfService";

export const DEFAULT_LEAGUE_POINT_RULES = [
  { positionFrom: 1, positionTo: 1, points: 10 },
  { positionFrom: 2, positionTo: 2, points: 6 },
  { positionFrom: 3, positionTo: 4, points: 4 },
  { positionFrom: 5, positionTo: 6, points: 2 },
  { positionFrom: 7, positionTo: 8, points: 1 },
  { positionFrom: 9, positionTo: null, points: 0 },
] as const;

const CHRIS_BRINKER_IDS = new Set(["2771230", "5966188"]);
const canonicalIdentity = (pokemonPlayerId: string, displayName: string) =>
  CHRIS_BRINKER_IDS.has(pokemonPlayerId)
    ? { canonicalId: "5966188", displayName: "Chris Brinker", externalIds: [...CHRIS_BRINKER_IDS] }
    : { canonicalId: pokemonPlayerId, displayName, externalIds: [pokemonPlayerId] };

const dateOnly = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw createError({ statusCode: 400, statusMessage: "Ungültiges Datum" });
  return date;
};

const assertSeasonDate = (season: { startsOn: Date; endsOn: Date }, eventDate: Date) => {
  if (eventDate < season.startsOn || eventDate > season.endsOn) {
    throw createError({ statusCode: 400, statusMessage: "Das Eventdatum liegt außerhalb des Saisonzeitraums." });
  }
};

const pointsForPlacement = (
  rules: Array<{ positionFrom: number; positionTo: number | null; points: number }>,
  placement: number | null,
) => {
  if (placement === null) return 0;
  return rules.find(
    (rule) => rule.positionFrom <= placement && (rule.positionTo === null || rule.positionTo >= placement),
  )?.points || 0;
};

export const validateLeaguePointRules = (
  rules: Array<{ positionFrom: number; positionTo: number | null; points: number }>,
) => {
  if (rules.length === 0) throw createError({ statusCode: 400, statusMessage: "Mindestens eine Punkte-Regel ist erforderlich." });
  const sorted = [...rules].sort((left, right) => left.positionFrom - right.positionFrom);
  let previousEnd = 0;
  sorted.forEach((rule, index) => {
    if (!Number.isInteger(rule.positionFrom) || rule.positionFrom <= 0 || !Number.isInteger(rule.points) || rule.points < 0) {
      throw createError({ statusCode: 400, statusMessage: "Platzierungen müssen positiv und Punkte mindestens 0 sein." });
    }
    if (rule.positionTo !== null && (!Number.isInteger(rule.positionTo) || rule.positionTo < rule.positionFrom)) {
      throw createError({ statusCode: 400, statusMessage: "Ungültiger Platzierungsbereich." });
    }
    if (rule.positionFrom <= previousEnd || (rule.positionTo === null && index < sorted.length - 1)) {
      throw createError({ statusCode: 400, statusMessage: "Punkte-Regeln dürfen sich nicht überschneiden; eine offene Regel muss zuletzt stehen." });
    }
    previousEnd = rule.positionTo ?? Number.MAX_SAFE_INTEGER;
  });
  return sorted;
};

export const listLeagueSeasons = () =>
  prisma.leagueSeason.findMany({
    orderBy: [{ isActive: "desc" }, { startsOn: "desc" }],
    include: { _count: { select: { players: true, events: true } } },
  });

export const createLeagueSeason = async (input: {
  name: string;
  slug: string;
  startsOn: string;
  endsOn: string;
  isActive?: boolean;
}) => {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  if (!name || !/^[a-z0-9][a-z0-9_-]*$/.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: "Name und gültiger Saison-Slug sind erforderlich." });
  }
  const startsOn = dateOnly(input.startsOn);
  const endsOn = dateOnly(input.endsOn);
  if (startsOn > endsOn) throw createError({ statusCode: 400, statusMessage: "Saisonbeginn muss vor Saisonende liegen." });

  return prisma.$transaction(async (transaction) => {
    if (input.isActive) await transaction.leagueSeason.updateMany({ data: { isActive: false } });
    return transaction.leagueSeason.create({
      data: {
        name,
        slug,
        startsOn,
        endsOn,
        isActive: Boolean(input.isActive),
        pointRules: { create: DEFAULT_LEAGUE_POINT_RULES.map((rule) => ({ ...rule })) },
        changeLog: { create: { action: "created", entityType: "season", reason: "Saison angelegt" } },
      },
      include: { pointRules: true },
    });
  });
};

export const updateLeagueSeason = async (
  seasonId: string,
  input: { name?: string; startsOn?: string; endsOn?: string; isActive?: boolean },
) => prisma.$transaction(async (transaction) => {
  const existing = await transaction.leagueSeason.findUnique({ where: { id: seasonId } });
  if (!existing) throw createError({ statusCode: 404, statusMessage: "Saison nicht gefunden" });
  const startsOn = input.startsOn ? dateOnly(input.startsOn) : existing.startsOn;
  const endsOn = input.endsOn ? dateOnly(input.endsOn) : existing.endsOn;
  if (startsOn > endsOn) throw createError({ statusCode: 400, statusMessage: "Saisonbeginn muss vor Saisonende liegen." });
  if (input.isActive) await transaction.leagueSeason.updateMany({ where: { id: { not: seasonId } }, data: { isActive: false } });
  const updated = await transaction.leagueSeason.update({
    where: { id: seasonId },
    data: { name: input.name?.trim() || undefined, startsOn, endsOn, isActive: input.isActive },
  });
  await transaction.leagueChangeLog.create({ data: { seasonId, action: "updated", entityType: "season", entityId: seasonId, reason: "Saison geändert" } });
  return updated;
});

const seasonGraph = (seasonId: string) => prisma.leagueSeason.findUnique({
  where: { id: seasonId },
  include: {
    pointRules: { orderBy: { positionFrom: "asc" } },
    events: { orderBy: [{ eventDate: "asc" }, { id: "asc" }], include: { participations: true } },
    players: {
      orderBy: { displayName: "asc" },
      include: { aliases: true, externalIds: true, participations: true },
    },
    changeLog: { orderBy: { occurredAt: "desc" }, take: 100 },
  },
});

export const getLeagueSeasonView = async (seasonId: string) => {
  const season = await seasonGraph(seasonId);
  if (!season) throw createError({ statusCode: 404, statusMessage: "Saison nicht gefunden" });
  const standings = calculateLeagueStandings(season.events, season.players);
  const cells = new Map(season.events.flatMap((event) => event.participations.map((entry) => [`${entry.leaguePlayerId}:${event.id}`, entry])));
  return {
    ...season,
    prizePoolCents: season.events.reduce((sum, event) => sum + event.participantCount * event.prizePoolContributionCents, 0),
    standings,
    matrix: season.players.filter((player) => player.participations.length > 0).map((player) => ({
      playerId: player.id,
      displayName: player.displayName,
      pokemonPlayerId: player.canonicalId,
      totalPoints: player.participations.reduce((sum, entry) => sum + entry.points, 0),
      points: season.events.map((event) => cells.get(`${player.id}:${event.id}`)?.points ?? null),
    })),
  };
};

export const replaceLeaguePointRules = async (
  seasonId: string,
  rules: Array<{ positionFrom: number; positionTo: number | null; points: number }>,
) => {
  const validated = validateLeaguePointRules(rules);
  return prisma.$transaction(async (transaction) => {
    await transaction.leaguePointRule.deleteMany({ where: { seasonId } });
    await transaction.leaguePointRule.createMany({ data: validated.map((rule) => ({ seasonId, ...rule })) });
    await transaction.leagueChangeLog.create({ data: { seasonId, action: "updated", entityType: "point_rules", reason: "Punktetabelle geändert", details: { rules: validated } } });
    return transaction.leaguePointRule.findMany({ where: { seasonId }, orderBy: { positionFrom: "asc" } });
  });
};

type ReviewedImportPlayer = {
  pokemonPlayerId: string;
  displayName: string;
  include: boolean;
  placement: number | null;
  points?: number;
  status: "confirmed" | "dnf" | "unranked";
};

export const importLeagueTournament = async (input: {
  seasonId: string;
  tournament: LeagueTournamentImport;
  adminUserId: string;
  sourceXml: string;
  warningsConfirmed: boolean;
  review?: { name?: string; eventDate?: string; participantCount?: number; players?: ReviewedImportPlayer[] };
}) => {
  if (input.tournament.warnings.length > 0 && !input.warningsConfirmed) {
    throw createError({ statusCode: 400, statusMessage: "Bitte bestätige die Importwarnungen." });
  }
  return prisma.$transaction(async (transaction) => {
    const season = await transaction.leagueSeason.findUnique({ where: { id: input.seasonId }, include: { pointRules: true } });
    if (!season) throw createError({ statusCode: 404, statusMessage: "Saison nicht gefunden" });
    const eventDate = dateOnly(input.review?.eventDate || input.tournament.eventDate);
    assertSeasonDate(season, eventDate);
    const duplicate = await transaction.leagueEvent.findFirst({ where: { seasonId: input.seasonId, importContentHash: input.tournament.contentHash } });
    if (duplicate) throw createError({ statusCode: 409, statusMessage: "Diese Turnierdatei wurde bereits importiert." });

    const event = await transaction.leagueEvent.create({
      data: {
        seasonId: input.seasonId,
        officialTournamentId: input.tournament.officialTournamentId,
        importContentHash: input.tournament.contentHash,
        name: input.review?.name?.trim() || input.tournament.name,
        eventDate,
        participantCount: input.review?.participantCount ?? input.tournament.participantCount,
        status: "imported",
        sourceXml: input.sourceXml,
        importedByAdminId: input.adminUserId,
      },
    });
    let createdPlayers = 0;
    const reviewedPlayers = input.review?.players || input.tournament.players.map((player) => ({ ...player, include: player.status !== "unranked" }));
    for (const importedPlayer of reviewedPlayers.filter((player) => player.include)) {
      const identity = canonicalIdentity(importedPlayer.pokemonPlayerId, importedPlayer.displayName);
      let leaguePlayer = await transaction.leaguePlayer.findFirst({
        where: { seasonId: input.seasonId, OR: [{ canonicalId: identity.canonicalId }, { externalIds: { some: { pokemonPlayerId: { in: identity.externalIds } } } }] },
      });
      if (!leaguePlayer) {
        leaguePlayer = await transaction.leaguePlayer.create({
          data: { seasonId: input.seasonId, canonicalId: identity.canonicalId, displayName: identity.displayName, status: "active" },
        });
        createdPlayers += 1;
      }
      for (const externalId of identity.externalIds) {
        await transaction.leaguePlayerExternalId.upsert({
          where: { seasonId_pokemonPlayerId: { seasonId: input.seasonId, pokemonPlayerId: externalId } },
          update: { leaguePlayerId: leaguePlayer.id },
          create: { seasonId: input.seasonId, leaguePlayerId: leaguePlayer.id, pokemonPlayerId: externalId },
        });
      }
      if (importedPlayer.status === "unranked") continue;
      const expectedPoints = importedPlayer.status === "confirmed"
        ? pointsForPlacement(season.pointRules, importedPlayer.placement)
        : 0;
      const points = importedPlayer.points ?? expectedPoints;
      await transaction.leagueParticipation.create({
        data: {
          eventId: event.id,
          leaguePlayerId: leaguePlayer.id,
          placement: importedPlayer.placement,
          points,
          status: importedPlayer.status,
          correctionReason: points !== expectedPoints ? "Beim TDF-Import korrigiert" : null,
        },
      });
    }
    await transaction.leagueChangeLog.create({
      data: { seasonId: input.seasonId, action: "imported", entityType: "event", entityId: event.id, reason: "Turnierdatei importiert", details: { contentHash: input.tournament.contentHash, createdPlayers } },
    });
    return { event, createdPlayers };
  });
};

export const updateLeaguePlayer = async (seasonId: string, playerId: string, input: { displayName: string; status: "active" | "inactive" }) => {
  if (!input.displayName.trim() || !["active", "inactive"].includes(input.status)) throw createError({ statusCode: 400, statusMessage: "Ungültige Spielerdaten" });
  const existing = await prisma.leaguePlayer.findFirst({ where: { id: playerId, seasonId } });
  if (!existing) throw createError({ statusCode: 404, statusMessage: "Ligaspieler nicht gefunden" });
  const player = await prisma.leaguePlayer.update({ where: { id: playerId }, data: { displayName: input.displayName.trim(), status: input.status } });
  await prisma.leagueChangeLog.create({ data: { seasonId, action: "updated", entityType: "player", entityId: playerId, reason: "Spielerdaten gespeichert" } });
  return player;
};

export const addLeaguePlayerAlias = async (seasonId: string, playerId: string, alias: string) => {
  if (!alias.trim()) throw createError({ statusCode: 400, statusMessage: "Alias darf nicht leer sein" });
  const player = await prisma.leaguePlayer.findFirst({ where: { id: playerId, seasonId } });
  if (!player) throw createError({ statusCode: 404, statusMessage: "Ligaspieler nicht gefunden" });
  const result = await prisma.leaguePlayerAlias.create({ data: { leaguePlayerId: playerId, alias: alias.trim() } });
  await prisma.leagueChangeLog.create({ data: { seasonId, action: "created", entityType: "player_alias", entityId: playerId, reason: "Spieler-Alias angelegt" } });
  return result;
};

export const mergeLeaguePlayers = async (seasonId: string, sourceId: string, targetId: string, reason: string) => {
  if (sourceId === targetId || !reason.trim()) throw createError({ statusCode: 400, statusMessage: "Zwei unterschiedliche Spieler und eine Begründung sind erforderlich." });
  return prisma.$transaction(async (transaction) => {
    const players = await transaction.leaguePlayer.count({ where: { seasonId, id: { in: [sourceId, targetId] } } });
    if (players !== 2) throw createError({ statusCode: 404, statusMessage: "Quell- oder Zielspieler gehört nicht zu dieser Saison." });
    const collision = await transaction.leagueParticipation.findFirst({
      where: { leaguePlayerId: sourceId, event: { participations: { some: { leaguePlayerId: targetId } } } },
    });
    if (collision) throw createError({ statusCode: 409, statusMessage: "Beide Spieler haben eine Teilnahme am selben Event." });
    await transaction.leagueParticipation.updateMany({ where: { leaguePlayerId: sourceId }, data: { leaguePlayerId: targetId } });
    await transaction.leaguePlayerAlias.updateMany({ where: { leaguePlayerId: sourceId }, data: { leaguePlayerId: targetId } });
    await transaction.leaguePlayerExternalId.updateMany({ where: { leaguePlayerId: sourceId }, data: { leaguePlayerId: targetId } });
    await transaction.leaguePlayer.delete({ where: { id: sourceId } });
    return transaction.leagueChangeLog.create({ data: { seasonId, action: "merged", entityType: "player", entityId: targetId, reason: reason.trim(), details: { sourceId } } });
  });
};

export const saveLeagueEvent = async (seasonId: string, input: { id?: string; name: string; eventDate: string; participantCount: number; prizePoolContributionCents: number; notes?: string }) => {
  const season = await prisma.leagueSeason.findUnique({ where: { id: seasonId } });
  if (!season || !input.name.trim()) throw createError({ statusCode: 400, statusMessage: "Saison und Eventname sind erforderlich." });
  const eventDate = dateOnly(input.eventDate);
  assertSeasonDate(season, eventDate);
  if (input.participantCount < 0 || input.prizePoolContributionCents < 0) throw createError({ statusCode: 400, statusMessage: "Teilnehmerzahl und Beitrag dürfen nicht negativ sein." });
  const data = { seasonId, name: input.name.trim(), eventDate, participantCount: input.participantCount, prizePoolContributionCents: input.prizePoolContributionCents, notes: input.notes?.trim() || null };
  if (input.id && !(await prisma.leagueEvent.findFirst({ where: { id: input.id, seasonId } }))) {
    throw createError({ statusCode: 404, statusMessage: "Liga-Event nicht gefunden" });
  }
  const event = input.id ? await prisma.leagueEvent.update({ where: { id: input.id }, data }) : await prisma.leagueEvent.create({ data });
  await prisma.leagueChangeLog.create({ data: { seasonId, action: input.id ? "updated" : "created", entityType: "event", entityId: event.id, reason: "Event gespeichert" } });
  return event;
};

export const deleteLeagueEvent = async (seasonId: string, eventId: string, reason: string) => {
  if (!reason.trim()) throw createError({ statusCode: 400, statusMessage: "Eine Begründung ist erforderlich." });
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.leagueEvent.findFirst({ where: { id: eventId, seasonId } });
    if (!existing) throw createError({ statusCode: 404, statusMessage: "Liga-Event nicht gefunden" });
    const event = await transaction.leagueEvent.delete({ where: { id: eventId } });
    await transaction.leagueChangeLog.create({ data: { seasonId, action: "deleted", entityType: "event", entityId: eventId, reason: reason.trim(), details: { eventName: event.name } } });
    return event;
  });
};

export const saveLeagueParticipation = async (seasonId: string, input: { eventId: string; leaguePlayerId: string; placement: number | null; points?: number; status: "confirmed" | "dnf" | "disqualified"; correctionReason?: string }) => {
  const [event, player] = await Promise.all([
    prisma.leagueEvent.findFirst({ where: { id: input.eventId, seasonId } }),
    prisma.leaguePlayer.findFirst({ where: { id: input.leaguePlayerId, seasonId } }),
  ]);
  if (!event || !player) throw createError({ statusCode: 404, statusMessage: "Event oder Spieler gehört nicht zu dieser Saison." });
  const rules = await prisma.leaguePointRule.findMany({ where: { seasonId } });
  const expected = input.status === "confirmed" ? pointsForPlacement(rules, input.placement) : 0;
  const points = input.points ?? expected;
  if (points !== expected && !input.correctionReason?.trim()) throw createError({ statusCode: 400, statusMessage: "Abweichende Punkte benötigen eine Begründung." });
  const participation = await prisma.leagueParticipation.upsert({
    where: { eventId_leaguePlayerId: { eventId: input.eventId, leaguePlayerId: input.leaguePlayerId } },
    update: { placement: input.placement, points, status: input.status, correctionReason: input.correctionReason?.trim() || null },
    create: { eventId: input.eventId, leaguePlayerId: input.leaguePlayerId, placement: input.placement, points, status: input.status, correctionReason: input.correctionReason?.trim() || null },
  });
  await prisma.leagueChangeLog.create({ data: { seasonId, action: "updated", entityType: "participation", entityId: participation.id, reason: input.correctionReason?.trim() || "Teilnahme gespeichert" } });
  return participation;
};

export const getActiveLeagueViewForPlayer = async (pokemonPlayerId: string | null) => {
  if (!pokemonPlayerId) throw createError({ statusCode: 403, statusMessage: "Für Liga-Standings ist eine Spieler-ID erforderlich." });
  const membership = await prisma.leaguePlayerExternalId.findFirst({
    where: { pokemonPlayerId, leaguePlayer: { status: "active", season: { isActive: true } } },
    include: { leaguePlayer: { include: { season: true } } },
  });
  if (!membership) throw createError({ statusCode: 403, statusMessage: "Du bist in der aktiven Liga-Saison nicht freigeschaltet." });
  const view = await getLeagueSeasonView(membership.leaguePlayer.seasonId);
  return { ...view, viewerLeaguePlayerId: membership.leaguePlayerId };
};