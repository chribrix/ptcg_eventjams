# League Manager Integration

Stand: 2026-08-29

## Architekturentscheidung

- [x] Liga-Daten in die bestehende PostgreSQL-Datenbank integrieren.
- [x] Keine SQLite-Datei im Nuxt-Server öffnen oder als zweite produktive Datenbank betreiben.
- [x] Die ursprüngliche SQLite-Datei unverändert als Migrationseingabe und Sicherung behalten.
- [x] Liga-Tabellen durch `League*`-Prisma-Modelle vom Eventbetrieb abgrenzen.
- [x] ChrispyJams-Spieler über `Player.playerId` mit `LeaguePlayerExternalId.pokemonPlayerId` verbinden.

PostgreSQL ist hier die bessere Zielarchitektur: Berechtigungsprüfung und Ranglistendaten laufen in derselben Transaktion und Deployment-/Backup-Strecke wie ChrispyJams. SQLite bleibt nur das Legacy-Quellformat.

## Datenmodell und Bestandsdaten

- [x] Saisons mit genau einer durch den Service aktivierten Saison.
- [x] Ligaspieler, unveränderbare externe Spieler-IDs und Aliase.
- [x] Saisonabhängige Punktregeln.
- [x] Liga-Events, Roh-TDF/XML und Duplikatschutz über normalisierten SHA-256-Hash.
- [x] Teilnahmen mit Platzierung, Punkten, Status und Korrekturbegründung.
- [x] Änderungsprotokoll für Importe und Adminmutationen.
- [x] PostgreSQL-Migration `20260829120000_add_league_manager` angewandt.
- [x] Saison 26/27 aus `saison-2027-27.sqlite3` importiert und aktiviert.
- [x] Import direkt in PostgreSQL verifiziert: 43 Spieler, 15 Events, 130 Teilnahmen.

Der wiederholbare Import steht über `npm run migrate:league-sqlite:dry-run` und `npm run migrate:league-sqlite` bereit. Eine vorhandene Saison wird nur mit dem expliziten Argument `--replace` ersetzt.

## Admin-Funktionalität

- [x] Saison anlegen, auswählen, aktivieren und löschen.
- [x] TDF/XML bis 5 MB analysieren.
- [x] Mehrere TDF/XML-Dateien als Batch analysieren, einzeln prüfen, überspringen oder importieren.
- [x] Hauptwertung Kategorie 2, DNF und Nebenwertungen auswerten.
- [x] Importwarnungen vor Übernahme bestätigen.
- [x] Namen, Datum, Teilnehmer, Spieler, Status, Platzierung und Punkte vor Import korrigieren.
- [x] Doppelte Turnierdateien abweisen.
- [x] Events manuell anlegen, bearbeiten und mit Begründung löschen.
- [x] Teilnahmen und Punkte erfassen oder korrigieren.
- [x] Ligaspieler umbenennen, aktiv/inaktiv setzen, Aliase anlegen und zusammenführen.
- [x] Überschneidungsfreie Punktregeln verwalten.
- [x] Rangliste, Punktematrix, Preispool und Änderungsprotokoll anzeigen.
- [x] CSV-Export für Rangliste, Events und Matrix.
- [x] Saisonbezogenes JSON-Backup inklusive Roh-TDF und Änderungsprotokoll herunterladen.

Produktive Wiederherstellung und Disaster Recovery erfolgen über das PostgreSQL-Backup der bestehenden ChrispyJams-Infrastruktur; es wird keine zweite SQLite-Backupstrecke betrieben.

Admin-Einstieg: `/admin/league`

## Spielerzugriff

- [x] `/league` erfordert eine gültige ChrispyJams-Anmeldung.
- [x] Der angemeldete Account muss einen `Player.playerId` besitzen.
- [x] Diese ID muss in der aktiven Saison einem aktiven Ligaspieler zugeordnet sein.
- [x] Standings werden erst nach der serverseitigen Prüfung geliefert.
- [x] Eigener Rang und eigene Event-Punkte werden hervorgehoben.
- [x] Alternative Legacy-Spieler-IDs bleiben zugriffsberechtigt.

## Ranking-Regeln

- [x] Sortierung nach Gesamtpunkten.
- [x] Danach Platzierungen 1-2.
- [x] Danach Anzahl punktender Teilnahmen.
- [x] Danach längste Serie aufeinanderfolgender Events mit Punkten.
- [x] Bei Gleichheit aller vier Werte gleicher Rang.
- [x] Fehlende Eventteilnahme unterbricht die Serie.

## Validierung

- [x] `npx prisma validate`
- [x] `npx prisma generate`
- [x] Liga-Kerntests: 3 bestanden.
- [x] Produktions-Build erfolgreich.
- [x] Gesamttests: 343 bestanden, 4 übersprungen.
- [ ] Bestehenden, ligaunabhängigen Fehler in `tests/unit/playerCheckEndpoint.test.ts` separat beheben (1 Test fehlgeschlagen).
- [ ] Manuellen Browser-Smoke-Test mit einem Admin und einem aktiven Ligaspieler durchführen.