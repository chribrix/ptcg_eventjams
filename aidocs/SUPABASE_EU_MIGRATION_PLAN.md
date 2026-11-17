# Supabase Auth von US in die EU migrieren – ChrispyJams

Stand: 17.11.2026 · **Plan, nicht ausgeführt**. Dieser Plan gilt für den kombinierten Docker-/Nitro-Betrieb auf `root@chrispyjams`. Er setzt voraus, dass das bisherige Supabase-Projekt tatsächlich außerhalb der EU liegt; die aktuelle Region und die Dashboard-Einstellungen sind aus dem Repository nicht ablesbar.

## Ziel und unveränderliche Zuordnung

Ein neues Supabase-Projekt wird in einer **konkreten EU-Region**, vorzugsweise `eu-central-1` (Frankfurt), angelegt. Die bestehende Supabase-Auth-Nutzerbasis wird vollständig mit denselben `auth.users.id`-UUIDs, Passwort-Hashes, Identitäten, `user_metadata` und `app_metadata` übertragen. Dadurch bleiben `public.players.supabase_id`, Admin-Rollen und bestehende fachliche Verknüpfungen gültig. Ein Neu-Anlegen der Nutzer über die Admin-API mit neuen UUIDs ist kein Ersatz für die Migration.

Die ChrispyJams-Datenbank für Spieler, Events, Anmeldungen, CMS-Rechtstexte und Kenntnisnahmen liegt im eigenen PostgreSQL-Container und wird **nicht** in das neue Supabase-Projekt verschoben. Sie braucht für Rückweg und Konsistenzprüfung trotzdem einen zeitgleichen Backup-Stand. Nach einem Wechsel auf einen neuen JWT-Schlüssel melden sich Nutzer erneut an; ihre Passwörter müssen bei vollständig übertragenen Auth-Daten nicht zurückgesetzt werden.

## Verifizierter Ist-Stand im Projekt

- `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_WEBHOOK_SECRET`, `APP_BASE_URL` und `ANALYTICS_SALT` sind in der Produktions-`.env` gesetzt. `APP_BASE_URL` zeigt auf `chrispyjams.de`. Werte und Geheimnisse wurden nicht ausgegeben.
- `PASSWORD_PEPPER` ist in Produktion **nicht gesetzt**. Die vorhandenen Passwort-Anmeldungen verwenden damit den ungepepperten Pfad. Beim Supabase-Wechsel darf dieser Wert nicht beiläufig eingeführt werden; das wäre eine eigene Passwortmigration.
- `SMTP_*` für Wartelistenmails sind in der App gesetzt. Supabase-Auth-SMTP wird separat im Supabase-Dashboard konfiguriert und konnte hier nicht geprüft werden.
- Die Auth-Identität gehört `server/services/auth/authService.ts`; `Player.supabaseId` und `app_metadata` sind die Verknüpfungs- beziehungsweise Admin-Verträge. Passwort- und E-Mail-Code-Flows verwenden Supabase Auth. Der QR-Gastzugang hat einen eigenen eventbezogenen Vertrag.
- `docker-compose.yml` übergibt URL und öffentlichen Schlüssel auch als **Build-Argumente**. Eine reine Änderung der `.env` mit Container-Neustart reicht daher für den Projektwechsel nicht zuverlässig aus; das App-Image muss neu gebaut werden. Die CI verwendet zusätzlich GitHub-Secrets für URL und öffentlichen Schlüssel.
- `server/api/auth/webhook.post.ts` akzeptiert Aufrufe ohne Signaturprüfung, falls `SUPABASE_WEBHOOK_SECRET` fehlt. Vor dem Wechsel ist der Endpunkt fail-closed zu machen und zu testen. In Produktion ist der Wert derzeit gesetzt; ob der Datenbank-Webhook im alten Supabase-Projekt aktiv ist, ist noch zu prüfen.

## Phase 1 – Bestandsaufnahme und Sicherung

1. Im alten Supabase-Dashboard Region, Tarif/Backup-Möglichkeit, Auth-Provider, E-Mail-/OTP-Einstellungen, SMTP, Templates, URL-Konfiguration, Ratenlimits, Database Webhooks, Storage-Buckets, Edge Functions, Vault und eventuelle Social-Provider dokumentieren. Nur tatsächlich genutzte Zusatzfunktionen in den neuen Projektumfang aufnehmen.
2. Einen aktuellen **vollständigen** Supabase-Export erstellen und sicher, verschlüsselt und außerhalb des Git-Repositories aufbewahren. Vor dem Import belegen, dass der Export `auth.users` **und** die zugehörigen Tabellen wie `auth.identities` sowie Passwort-Hashes und Metadaten enthält. Ein gewöhnlicher `supabase db dump` schließt Supabase-verwaltete Schemas wie `auth` standardmäßig aus; ein solcher Dump allein würde die Nutzerbasis verlieren. Den Export deshalb mit einem **expliziten** SQL-/`pg_dump`-Verfahren für die benötigten Auth-Tabellen nach der aktuellen Supabase-Anleitung planen. Ein herunterladbarer Dashboard-Backup-Export ist nur eine Alternative, wenn ihn das konkrete Quellprojekt tatsächlich anbietet; Free-Projekte haben keine herunterladbaren Dashboard-Backups, und neuere physische Backups sind nicht als logischer Export verfügbar.
3. Einen PostgreSQL-Backup des ChrispyJams-Servers für denselben Stichtag anlegen. Aggregierte Baselines erfassen: Anzahl Auth-Nutzer, Anzahl Spieler mit `supabase_id`, fehlende/mehrfache Zuordnungen, Admin-Rollen und offene Passwort-Einrichtungen. Keine Nutzerlisten oder Zugangsdaten in Logs, Tickets oder Git ablegen.
4. Den alten Projektzustand und die bisherigen Produktions- und CI-Konfigurationswerte für den Rückweg sicher sichern. Geheimnisse nie in Git, Shell-Ausgaben, Build-Logs oder Antworten kopieren.

## Phase 2 – EU-Projekt und isolierte Probe

1. Neues Supabase-Projekt in einer **expliziten EU-Region** anlegen. Die Funktion „Restore to a new project“ ist für einen Regionswechsel ungeeignet, weil sie die Region der Quelle beibehält. Stattdessen den manuellen Export/Import in das zuvor angelegte EU-Projekt nutzen.
2. Auth-Einstellungen neu einrichten: E-Mail-Provider mit Passwort und OTP; „Magic Link or OTP“-Template mit `{{ .Token }}` statt Link; OTP-Laufzeit passend zum 15-Minuten-Fenster der App (900 Sekunden); `Site URL` `https://chrispyjams.de`; benötigte Redirect-URLs; Auth-SMTP, Absender und Ratenlimits. Eventuelle weitere Provider, Webhooks und Storage-Nutzung aus der Bestandsaufnahme übernehmen. Auth-Einstellungen und API-Schlüssel sind kein Teil eines reinen Datenbankexports.
3. Auth-Daten nach der **aktuellen** Supabase-Anleitung testweise in das EU-Projekt importieren. Während der Probe weder einen neuen `auth.users`-Webhook auf die produktive ChrispyJams-API zeigen lassen noch das EU-Projekt gegen die produktive App-Datenbank testen. Für Integrationstests eine isolierte Kopie der App-Datenbank und eine separate Test-App verwenden.
4. Quelle und Ziel vergleichen: gleiche Auth-Nutzerzahl und UUID-Menge, gleiche relevanten Passwort-/Identitäts- und Metadaten, gleiche Admin-Rollen. Gegen die isolierte App-Datenbank prüfen, dass jede kontoabhängige `Player.supabaseId` weiterhin auf dieselbe Auth-UUID zeigt. Abweichungen vor einem Cutover beheben.
5. In der Test-App Passwort-Login, OTP-Versand/-Prüfung, Registrierung, Passwort-Einrichtung, Adminzugang, Player-Profil und Datenschutz-Kenntnisnahme durchspielen. Zusätzlich den Webhook mit gültigem und fehlendem Secret sowie SMTP-Zustellung prüfen. Erst nach bestandener Probe einen Produktions-Cutover ansetzen.

## Phase 3 – Produktions-Cutover

1. Kurzes Wartungsfenster mit Schreibstopp für Registrierung, Anmeldung und Profiländerungen einrichten. Die App besitzt derzeit keinen dedizierten Wartungsschalter; vorab eine kontrollierte Wartungsantwort am Reverse Proxy oder einen entsprechenden App-Schalter vorbereiten. So entsteht zwischen letztem Export und Umschalten kein unbemerkter neuer Nutzer im alten Projekt.
2. Laufende Passwort-Einrichtungen abschließen lassen oder mindestens deren 15-Minuten-Frist abwarten. Da `PASSWORD_PEPPER` fehlt, wird `pending_password_setup` derzeit ersatzweise mit dem alten Service-Role-Key verschlüsselt; solche offenen Vorgänge sind nach dem Schlüsselwechsel nicht zuverlässig abschließbar. `PASSWORD_PEPPER` beim Cutover unverändert **nicht** setzen.
3. Letzten Supabase- und lokalen PostgreSQL-Sicherungsstand erstellen, finalen Auth-Import ausführen und die UUID-/Rollen-/Player-Abgleiche wiederholen. Den Datenbank-Webhook erst nach dem Import auf die produktive API schalten, falls er tatsächlich verwendet wird.
4. Auf dem Produktionshost `SUPABASE_URL`, `SUPABASE_KEY` und `SUPABASE_SERVICE_ROLE_KEY` auf das neue Projekt umstellen. `SUPABASE_WEBHOOK_SECRET` nur zusammen mit dem entsprechenden Header im neuen Supabase-Webhook ändern. `APP_BASE_URL`, `DATABASE_URL`, `ANALYTICS_SALT` und die App-SMTP-Werte beibehalten. GitHub-CI-Secrets für URL und öffentlichen Schlüssel ebenfalls aktualisieren. Der Service-Role-Key bleibt ausschließlich serverseitig.
5. App-Image mit den neuen öffentlichen Build-Werten neu bauen und mit dem bestehenden Deploy-Ablauf starten. Standardmäßig den neuen JWT-Schlüssel verwenden und eine erneute Anmeldung der Nutzer einplanen. Eine Übernahme des alten JWT-Schlüssels wäre eine separate, bewusst zu prüfende Option; sie kann API-Schlüssel neu erzeugen.
6. Vor Aufhebung des Schreibstopps: Startseite und geschützte API, Passwort- und OTP-Login eines bestehenden Kontos, Adminrolle, zugeordneten Player, neue Registrierung, Mailzustellung, Webhook und Datenschutz-Kenntnisnahme prüfen. Dann Schreibzugriff wieder öffnen und Fehler-/Auth-Raten beobachten.

## Rückweg und Abschluss

- Das alte Supabase-Projekt und dessen Zugangsdaten bis zum Ende einer festgelegten Beobachtungsphase unverändert verfügbar halten. Der Rückweg besteht aus alter App-Konfiguration, neuem Image-Build und dem dazu passenden Stand der eigenen PostgreSQL-Datenbank.
- **Nach neuen Registrierungen oder Änderungen im EU-Projekt nicht blind zurückschalten:** Erst Schreibzugriff stoppen und neue Auth-Nutzer sowie lokale Player-/Eventänderungen abgleichen. Andernfalls gehen Identitäten oder Verknüpfungen verloren. Bei Datenabweichungen einen Vorwärts-Fix bevorzugen, bis ein konsistenter Rückweg hergestellt ist.
- Nach Stabilisierung die Datenschutzerklärung auf den tatsächlichen Supabase-Standort, Anbieter und etwaige weitere Verarbeitungsorte aktualisieren. EU-Region bedeutet nicht, dass sämtliche Supabase-Verarbeitung ausschließlich in der EU erfolgt. Das alte Projekt erst nach gesicherter Aufbewahrungs-/Löschentscheidung deaktivieren oder löschen.

## Offene Eingaben vor Ausführung

- Aktuelle Region des Quellprojekts und Zugriff auf dessen Dashboard/Backup oder Datenbankexport.
- Tatsächlich aktive Auth-/SMTP-/Webhook-/Storage-/Vault-Einstellungen.
- Neues EU-Projekt und sichere Übergabe seiner URL und Schlüssel; keine Secrets im Chat oder Repository.
- Termin und technische Umsetzung des Schreibstopps sowie Entscheidung, wie lange das alte Projekt für einen Rückweg verfügbar bleibt.

## Quellen

- [Supabase: Projektregion wechseln](https://supabase.com/kb/troubleshooting/change-project-region-eWJo5Z)
- [Supabase: Auth-Nutzer zwischen Projekten migrieren](https://supabase.com/kb/troubleshooting/migrating-auth-users-between-projects)
- [Supabase: manueller Backup-/Restore-Ablauf](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Supabase CLI: `db dump` und ausgeschlossene Schemas](https://supabase.com/docs/reference/cli/supabase-issue-feature)
- [Supabase: Backup-Verfügbarkeit und Export](https://supabase.com/docs/guides/platform/backups)
- [Supabase: Regionen](https://supabase.com/docs/guides/platform/regions)
- [Supabase: Auth-SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
