import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import prisma from "../lib/prisma";
import { DEFAULT_LEAGUE_POINT_RULES } from "../server/services/league/leagueService";
import { parseLeagueTdf } from "../server/services/league/leagueTdfService";

const apply = process.argv.includes("--apply");
const seasonArgumentIndex = process.argv.indexOf("--season");
const seasonArgument = seasonArgumentIndex >= 0 ? process.argv[seasonArgumentIndex + 1] : undefined;
const filePaths = process.argv.slice(2).filter((argument, index, allArguments) =>
  !argument.startsWith("--") && allArguments[index - 1] !== "--season",
);

const pointsForPlacement = (
  rules: Array<{ positionFrom: number; positionTo: number | null; points: number }>,
  placement: number | null,
) => placement === null ? 0 : rules.find(
  (rule) => rule.positionFrom <= placement && (rule.positionTo === null || rule.positionTo >= placement),
)?.points || 0;

const canonicalIds = (pokemonPlayerId: string) =>
  ["2771230", "5966188"].includes(pokemonPlayerId)
    ? { canonicalId: "5966188", externalIds: ["2771230", "5966188"] }
    : { canonicalId: pokemonPlayerId, externalIds: [pokemonPlayerId] };

async function main() {
  if (filePaths.length === 0) throw new Error("Mindestens eine TDF-Datei ist erforderlich.");
  const season = await prisma.leagueSeason.findFirst({
    where: seasonArgument
      ? { OR: [{ id: seasonArgument }, { slug: seasonArgument }] }
      : { isActive: true },
    include: {
      pointRules: true,
      events: { include: { participations: true } },
      players: { include: { externalIds: true } },
    },
  });
  if (!season) throw new Error("Liga-Saison nicht gefunden.");
  const rules = season.pointRules.length > 0 ? season.pointRules : [...DEFAULT_LEAGUE_POINT_RULES];
  const repairs = filePaths.map((filePath) => {
    const absolutePath = resolve(filePath);
    const xml = readFileSync(absolutePath, "utf8");
    const tournament = parseLeagueTdf(xml);
    const eventDate = new Date(`${tournament.eventDate}T00:00:00.000Z`).getTime();
    const matches = season.events.filter((event) =>
      event.eventDate.getTime() === eventDate && event.name.trim() === tournament.name.trim(),
    );
    if (matches.length !== 1) {
      throw new Error(`${absolutePath}: ${matches.length} passende Events für ${tournament.eventDate} / ${tournament.name}.`);
    }
    if (tournament.players.some((player) => player.status !== "unranked" && !player.division)) {
      throw new Error(`${absolutePath}: Mindestens eine gewertete Teilnahme hat keine Division.`);
    }
    return { absolutePath, xml, tournament, event: matches[0] };
  });
  const duplicateEvent = repairs.find((repair, index) => repairs.findIndex((item) => item.event.id === repair.event.id) !== index);
  if (duplicateEvent) throw new Error(`Mehrere TDF-Dateien passen zu ${duplicateEvent.event.name}.`);

  for (const repair of repairs) {
    const existingByPlayerId = new Map(repair.event.participations.map((entry) => [entry.leaguePlayerId, entry]));
    let added = 0;
    let changed = 0;
    let pointsDelta = 0;
    for (const player of repair.tournament.players.filter((entry) => entry.status !== "unranked")) {
      const identity = canonicalIds(player.pokemonPlayerId);
      const leaguePlayer = season.players.find((entry) =>
        entry.canonicalId === identity.canonicalId || entry.externalIds.some((id) => identity.externalIds.includes(id.pokemonPlayerId)),
      );
      const existing = leaguePlayer ? existingByPlayerId.get(leaguePlayer.id) : undefined;
      const points = player.status === "confirmed" ? pointsForPlacement(rules, player.placement) : 0;
      if (!existing) added += 1;
      else if (existing.division !== player.division || existing.placement !== player.placement || existing.points !== points || existing.status !== player.status) changed += 1;
      pointsDelta += points - (existing?.points || 0);
    }
    console.log(`${repair.tournament.eventDate} ${repair.tournament.name}: +${added} Teilnahmen, ${changed} Änderungen, Punktedelta ${pointsDelta >= 0 ? "+" : ""}${pointsDelta}`);
  }

  if (!apply) {
    console.log("Dry-run abgeschlossen. Mit --apply werden die Änderungen geschrieben.");
    return;
  }

  for (const repair of repairs) {
    await prisma.$transaction(async (transaction) => {
      let changedParticipations = 0;
      for (const importedPlayer of repair.tournament.players.filter((player) => player.status !== "unranked")) {
        const identity = canonicalIds(importedPlayer.pokemonPlayerId);
        let leaguePlayer = await transaction.leaguePlayer.findFirst({
          where: {
            seasonId: season.id,
            OR: [
              { canonicalId: identity.canonicalId },
              { externalIds: { some: { pokemonPlayerId: { in: identity.externalIds } } } },
            ],
          },
        });
        if (!leaguePlayer) {
          leaguePlayer = await transaction.leaguePlayer.create({
            data: { seasonId: season.id, canonicalId: identity.canonicalId, displayName: importedPlayer.displayName },
          });
        }
        for (const externalId of identity.externalIds) {
          await transaction.leaguePlayerExternalId.upsert({
            where: { seasonId_pokemonPlayerId: { seasonId: season.id, pokemonPlayerId: externalId } },
            update: { leaguePlayerId: leaguePlayer.id },
            create: { seasonId: season.id, leaguePlayerId: leaguePlayer.id, pokemonPlayerId: externalId },
          });
        }
        const points = importedPlayer.status === "confirmed"
          ? pointsForPlacement(rules, importedPlayer.placement)
          : 0;
        await transaction.leagueParticipation.upsert({
          where: { eventId_leaguePlayerId: { eventId: repair.event.id, leaguePlayerId: leaguePlayer.id } },
          update: {
            division: importedPlayer.division!, placement: importedPlayer.placement, points,
            status: importedPlayer.status, correctionReason: "Historische TDF-Neuberechnung: divisionsübergreifende Wertung",
          },
          create: {
            eventId: repair.event.id, leaguePlayerId: leaguePlayer.id, division: importedPlayer.division!,
            placement: importedPlayer.placement, points, status: importedPlayer.status,
            correctionReason: "Historische TDF-Neuberechnung: divisionsübergreifende Wertung",
          },
        });
        changedParticipations += 1;
      }
      await transaction.leagueEvent.update({
        where: { id: repair.event.id },
        data: { sourceXml: repair.xml, participantCount: repair.tournament.participantCount },
      });
      await transaction.leagueChangeLog.create({
        data: {
          seasonId: season.id, action: "recalculated", entityType: "event", entityId: repair.event.id,
          reason: "Historische Altersklassen-Fehlwertung korrigiert",
          details: { source: repair.absolutePath.split("/").at(-1), changedParticipations },
        },
      });
    });
  }

  const unknownParticipations = await prisma.leagueParticipation.findMany({
    where: { division: "unknown", event: { seasonId: season.id } },
    select: { id: true, leaguePlayerId: true },
  });
  let inferred = 0;
  for (const participation of unknownParticipations) {
    const known = await prisma.leagueParticipation.findMany({
      where: { leaguePlayerId: participation.leaguePlayerId, event: { seasonId: season.id }, division: { not: "unknown" } },
      distinct: ["division"],
      select: { division: true },
    });
    if (known.length !== 1) continue;
    await prisma.leagueParticipation.update({ where: { id: participation.id }, data: { division: known[0].division } });
    inferred += 1;
  }
  console.log(`${repairs.length} Events repariert; ${inferred} weitere Legacy-Divisionen innerhalb der Saison eindeutig abgeleitet.`);
}

main()
  .catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());