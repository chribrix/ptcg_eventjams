# Liga — Planungs-README

**Zweck:** Saisons, Spieleridentitäten/Aliase, Punkteregeln, Turnierimporte, Tabellen und Exporte verwalten. Liga ist eine eigene fachliche Grenze, auch wenn sie zunächst zusammen mit Turnier deployt werden kann.

**Heute:** `server/services/league`, `server/api/admin/league`, `server/api/league` und SQL-Migrationen für `league_*`. Die entsprechenden Modelle fehlen derzeit in der eingecheckten `prisma/schema.prisma`; das muss vor Umbau geprüft und behoben werden.

**Daten:** Saison, Ligaspieler/Aliase, Punkteregeln, Liga-Event/Teilnahme, Importprotokoll und Änderungshistorie. Tenant-Zuordnung ist beim Mandanten-Backfill festzulegen.

**Geplanter öffentlicher Vertrag:** `createSeason`, `setPointRules`, `importTournamentResults`, `getStandings`, `exportStandings`; Ereignisse `StandingsChanged`. Ein Import identifiziert Quelle und Version, damit Wiederholung keine doppelten Punkte erzeugt.

**Interaktion:** Turnier stellt bestätigte, versionierte Resultate bereit oder liefert eine explizite Importdatei; Identität/Tenant-Modul prüfen Adminrechte. Liga liest keine privaten TOM-Tabellen. Spieleraliase werden fachlich im Ligamodul aufgelöst.

**Betrieb und Nachweis:** Lokal oder remote; Importfehler sind wiederholbar und auditierbar. TDF-Fixtures und Tabellen-Snapshots beweisen Punktgleichheit vor/nach Migration. Schema-/Client-Generierung, Exportformate und Tenant-Isolation gehören zum Freigabetor.
