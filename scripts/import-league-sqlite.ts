import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();
const sourceArgument = process.argv.find((argument) => argument.endsWith(".sqlite3"));
const sourcePath = resolve(
  sourceArgument || "../Crows_and_Owls_League_Manager/data/saison-2027-27.sqlite3",
);
const replaceExisting = process.argv.includes("--replace");
const dryRun = process.argv.includes("--dry-run");

const query = <T>(sql: string): T[] => {
  const output = execFileSync("sqlite3", ["-json", sourcePath, sql], { encoding: "utf8" });
  return output.trim() ? JSON.parse(output) as T[] : [];
};

const asDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
const asTimestamp = (value: string) => new Date(value);
const cuid = () => `league_${crypto.randomUUID().replaceAll("-", "")}`;

async function main() {
  if (!existsSync(sourcePath)) throw new Error(`SQLite-Datei nicht gefunden: ${sourcePath}`);
  const [metadata] = query<any>("SELECT * FROM season_metadata WHERE id = 1");
  if (!metadata) throw new Error("Keine gültigen Saison-Metadaten gefunden.");

  const players = query<any>("SELECT * FROM players ORDER BY id");
  const aliases = query<any>("SELECT * FROM player_aliases ORDER BY id");
  const externalIds = query<any>("SELECT * FROM player_external_ids ORDER BY pokemon_player_id");
  const pointRules = query<any>("SELECT * FROM point_rules ORDER BY position_from");
  const events = query<any>("SELECT * FROM events ORDER BY id");
  const participations = query<any>("SELECT * FROM participations ORDER BY id");
  const changeLog = query<any>("SELECT * FROM change_log ORDER BY id");
  const slug = sourcePath.split("/").at(-1)!.replace(/\.sqlite3$/, "");

  console.log(`${metadata.name}: ${players.length} Spieler, ${events.length} Events, ${participations.length} Teilnahmen`);
  if (dryRun) {
    console.log("Dry-run abgeschlossen; PostgreSQL wurde nicht verändert.");
    return;
  }

  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.leagueSeason.findUnique({ where: { slug } });
    if (existing && !replaceExisting) {
      throw new Error(`Saison ${slug} existiert bereits. Verwende --replace nur für eine bewusste Neuübernahme.`);
    }
    if (existing) await transaction.leagueSeason.delete({ where: { id: existing.id } });
    await transaction.leagueSeason.updateMany({ data: { isActive: false } });

    const seasonId = cuid();
    await transaction.leagueSeason.create({
      data: {
        id: seasonId,
        name: metadata.name,
        slug,
        startsOn: asDate(metadata.starts_on),
        endsOn: asDate(metadata.ends_on),
        isActive: true,
        createdAt: asTimestamp(metadata.created_at),
      },
    });
    await transaction.leaguePointRule.createMany({
      data: pointRules.map((rule) => ({
        id: cuid(), seasonId, positionFrom: rule.position_from,
        positionTo: rule.position_to ?? null, points: rule.points,
      })),
    });

    const playerIds = new Map<number, string>();
    for (const player of players) {
      const id = cuid();
      playerIds.set(player.id, id);
      await transaction.leaguePlayer.create({
        data: {
          id, seasonId, legacyId: player.id, canonicalId: player.pokemon_player_id,
          displayName: player.display_name, status: player.status,
          createdAt: asTimestamp(player.created_at), updatedAt: asTimestamp(player.updated_at),
        },
      });
    }
    await transaction.leaguePlayerAlias.createMany({
      data: aliases.map((alias) => ({ id: cuid(), leaguePlayerId: playerIds.get(alias.player_id)!, alias: alias.alias })),
    });
    await transaction.leaguePlayerExternalId.createMany({
      data: externalIds.map((externalId) => ({
        id: cuid(), seasonId, leaguePlayerId: playerIds.get(externalId.player_id)!,
        pokemonPlayerId: externalId.pokemon_player_id,
      })),
    });

    const eventIds = new Map<number, string>();
    for (const event of events) {
      const id = cuid();
      eventIds.set(event.id, id);
      await transaction.leagueEvent.create({
        data: {
          id, seasonId, legacyId: event.id,
          officialTournamentId: event.official_tournament_id || null,
          importContentHash: event.import_content_hash || null,
          name: event.name, eventDate: asDate(event.event_date),
          participantCount: event.participant_count,
          prizePoolContributionCents: event.prize_pool_contribution_cents,
          status: event.status, sourceXml: event.source_xml || null, notes: event.notes || null,
          createdAt: asTimestamp(event.created_at), updatedAt: asTimestamp(event.updated_at),
        },
      });
    }
    await transaction.leagueParticipation.createMany({
      data: participations.map((participation) => ({
        id: cuid(), legacyId: participation.id,
        eventId: eventIds.get(participation.event_id)!,
        leaguePlayerId: playerIds.get(participation.player_id)!,
        placement: participation.placement ?? null, points: participation.points,
        status: participation.status, correctionReason: participation.correction_reason || null,
        createdAt: asTimestamp(participation.created_at), updatedAt: asTimestamp(participation.updated_at),
      })),
    });
    await transaction.leagueChangeLog.createMany({
      data: changeLog.map((entry) => {
        let details: Prisma.InputJsonValue = {};
        try { details = JSON.parse(entry.details_json || "{}"); } catch { details = { legacyValue: entry.details_json }; }
        return {
          id: cuid(), seasonId, occurredAt: asTimestamp(entry.occurred_at), action: entry.action,
          entityType: entry.entity_type, entityId: entry.entity_id || null,
          reason: entry.reason || null, details,
        };
      }),
    });
  }, { timeout: 60_000 });

  console.log("SQLite-Saison wurde vollständig importiert und als aktive Saison markiert.");
}

main()
  .catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());