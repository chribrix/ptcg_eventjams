# Liga — Planungs-README

**Zweck:** Saisons, Spieleridentitäten/Aliase, Punkteregeln, Turnierimporte, Tabellen und Exporte verwalten. Liga ist eine eigene fachliche Grenze, auch wenn sie zunächst zusammen mit Turnier deployt werden kann.

**Heute:** `server/services/league`, `server/api/admin/league`, `server/api/league` und SQL-Migrationen für `league_*`. P0 hat die zuvor fehlenden Modelle in `prisma/schema.prisma` ergänzt; Schema-Validierung und Client-Generierung sind erfolgreich. Ein Abgleich gegen eine reale Datenbank steht aus.

**Daten:** Saison, Ligaspieler/Aliase, Punkteregeln, Liga-Event/Teilnahme, Importprotokoll und Änderungshistorie. Tenant-Zuordnung ist beim Mandanten-Backfill festzulegen.

**Geplanter öffentlicher Vertrag:** `createSeason`, `setPointRules`, `importTournamentResults`, `getStandings`, `exportStandings`; Ereignisse `StandingsChanged`. Ein Import identifiziert Quelle und Version, damit Wiederholung keine doppelten Punkte erzeugt.

**Interaktion:** Turnier stellt bestätigte, versionierte Resultate bereit oder liefert eine explizite Importdatei; Identität/Tenant-Modul prüfen Adminrechte. Liga liest keine privaten TOM-Tabellen. Spieleraliase werden fachlich im Ligamodul aufgelöst.

**Betrieb und Nachweis:** Lokal oder remote; Importfehler sind wiederholbar und auditierbar. TDF-Fixtures und Tabellen-Snapshots beweisen Punktgleichheit vor/nach Migration. Schema-/Client-Generierung, Exportformate und Tenant-Isolation gehören zum Freigabetor.
