# Implementierungsplan für das Architektur-Rework

Status: Arbeitsdokument · Branch: `codex/chrispyjams-architecture-rework` · Stand: 24. Oktober 2026. Der [Ist-/Zielentwurf](../CHRISPYJAMS_ARCHITEKTURVORSCHLAG.md) begründet die Grenzen; der [Modulindex](MODULES.md) dokumentiert die Verträge. Jede Phase ergänzt hier tatsächliche Entscheidungen, Testresultate und Abweichungen. Eine erledigte Phase wird erst nach ihrem Prüftor abgehakt.

## Nicht verhandelbare Invarianten

1. Bestehende öffentlich genutzte URLs, API-Antworten, Buchungs- und Turnierabläufe bleiben während der Migration verfügbar. Änderungen daran brauchen eine dokumentierte Versionierung, Migration aller Aufrufer und Paritätsprüfung.
2. Session-Refresh und -Invalidierung bleiben ausschließlich in `services/authSessionService.ts`; Endnutzeridentität wird serverseitig ausschließlich über `server/services/auth/authService.ts` aufgelöst. Der Service-Role-Key bleibt serverseitig und nur für administrative Operationen.
3. Ein Mandant ist eine serverseitig geprüfte Daten- und Berechtigungsgrenze. Jeder schreibende Befehl und jede mandantenbezogene Leseabfrage prüft den aufgelösten Actor und Tenant. Globale Plattformrolle und Ladenrolle sind getrennt.
4. Globale Regeln haben eine zentrale Utility oder einen eindeutig verantwortlichen Service mit öffentlichem Vertrag. Eventbezeichner, Zeitzonen, Actor-/Tenant-Kontext, Rechteprüfung, Fehlerabbildung und sichere Diagnostik werden nicht je Route neu implementiert. Fachlogik gehört ihrem Modul, nicht einem allgemeinen `utils/`-Sammelordner.
5. Module besitzen ihre Daten. Andere Module greifen nur über veröffentlichte Abfragen, Befehle oder Ereignisse zu. Diese Verträge funktionieren in-process und über einen Transportadapter. Ein separates Deployment braucht keine privaten Imports oder gemeinsamen Tabellenzugriffe.
6. Ein Modulwechsel wird als expandieren → umstellen → bereinigen ausgeführt: neue Felder/Verträge zunächst ergänzen, Daten backfillen, alte und neue Pfade vergleichen, Verbraucher umstellen, erst nach Parität alte Pfade entfernen. Rückfallpfad und Datenreparatur stehen vor dem Umschalten fest.

## Zwei Betriebsarten aus einem Codebestand

| Aspekt | Gemeinsamer Betrieb | Separater Betrieb | Gleichbleibender Vertrag |
| --- | --- | --- | --- |
| Aufruf | In-process-Adapter hinter Modul-Interface. | HTTP/RPC-Adapter mit Timeout, Authentisierung und Versionierung. | Dieselben Befehle, Abfragen, DTOs und fachlichen Fehlercodes. |
| Daten | Eine Postgres-Instanz ist möglich, aber Tabellen/Schemaeigentümer und DB-Zugriffsrollen sind pro Modul festgelegt. | Eigenes Schema oder eigene Datenbank pro Dienst; keine direkten Cross-Service-Joins. | IDs und publizierte Ereignisse statt fremder ORM-Modelle. |
| Auth | Bestehende Auth-Autoritäten liefern serverseitig `ActorContext`. | Gateway prüft Session; Dienst prüft signierten, kurzlebigen Servicekontext und Tenant-Recht erneut. Keine Weitergabe von Service-Role-Key oder ungeprüfter Clientrolle. | Gleiche Berechtigungsergebnisse und Audit-IDs. |
| Transaktionen | Lokal atomar innerhalb eines Moduls. | Fachliche Befehle mit Idempotenzschlüssel; Outbox/Inbox oder gleichwertig für Cross-Modul-Ereignisse; explizite Kompensation. | Dokumentierte Zustandsübergänge und Wiederholbarkeit. |
| Lesen | Projektionen können direkt aus Modul-Abfragen aufgebaut werden. | BFF aggregiert Modulantworten oder liest eine per Ereignis aktualisierte Projektion. | Öffentliche API-Formate und Sichtbarkeit bleiben stabil. |
| Betrieb | Ein Build/Release und gemeinsames Monitoring. | Dienstweise Builds/Deployments, Health-/Readiness-Prüfung, Korrelation, Metriken und Rückrollversionen. | Kompatible API-Versionen und Contract-Tests. |

Ein `MODULE_MODE=local|remote`-Schalter ist nur ein mögliches Implementierungsdetail. Maßgeblich ist eine **Composition Root**, die je Modul genau einen Port mit lokalem oder remote Adapter bindet. Keine Fachfunktion fragt selbst eine Umgebungsvariable ab. Der erste separate Pilot sollte ein wenig transaktional gekoppelter Adapter/Worker sein; Buchung und Auth folgen erst nach bestandenen Ausfalltests.

## Funktionsinventar: vor dem Umbau erfassen und erhalten

Die Tabelle ist der Start der Paritätsliste. Vor Änderungen an einem Bereich werden konkrete Fälle, heutige API-Antworten, Berechtigungen, Datenzustände und UI-Erwartungen als Tests oder überprüfbare Fixtures festgehalten. Bestehende Tests sind Ausgangspunkt, kein alleiniger Paritätsnachweis.

| Bereich | Bestehende Funktion, die erhalten bleiben muss | Ausgangspunkte | Nachweis vor Abschalten des alten Pfads |
| --- | --- | --- | --- |
| Auth und Profil | Passwort/OTP/Session, Logout, Spieleranlage und -zuordnung, Adminrolle, Gastzugang zum Turnier. | `server/api/auth`, `server/api/players`, `services/authSessionService.ts`, `server/services/auth/authService.ts`, `server/services/events/tomGuestAccessService.ts` | Auth- und API-Integrationstests für gültige, abgelaufene und fehlende Session; keine Rechteausweitung zwischen Mandanten. |
| Öffentlicher Kalender | Externe pokedata-Events, eigene Events, Tags/Filter, Zeitzonen, Details, Sichtbarkeit und Bookmarks. | `server/api/events*`, `components/landingPageCards/calendar`, `utils/calendarEventUtils.ts` | Golden-Response-Fixtures für beide Quellen, Filter und Datumsgrenzen; UI-Test für Crows & Owls und zweiten Mandanten. |
| Event-Administration | Eigenes Event erstellen/bearbeiten/löschen, Vorlagen, Orte, externe Overrides, ausgeblendete Events und Historie. | `server/api/admin/custom-events.ts`, `server/api/admin/event-templates.ts`, `server/api/admin/venues.ts`, `server/api/admin/event-overrides*` | CRUD-/Berechtigungstests pro Mandant und bestehende Admin-Ansichten. |
| Buchung | Eine Buchung mit mehreren Tickets, Kapazitätsgrenze, Bearbeitung, Stornierung, anonyme Teilnehmer, Registrierungsfrist und externe Events mit lokaler Buchung. | `server/api/events/[id]/register.post.ts`, `server/api/bookings`, `server/services/admin/adminRegistrationService.ts` | Bestehende Buchungen vor/nach Migration vergleichen; konkurrierende Buchungen, Status und Teilnehmerzahlen testen. |
| Warteliste | Warteschlangenposition, Priorität, Benachrichtigung, Claim-Frist, Bestätigung und Nachrücken. | `server/services/events/waitlistService.ts`, `server/api/events/[id]/waitlist*` | Transaktions- und Zeitgrenzentests; keine doppelte Platzvergabe bei Wiederholung. |
| Turnier | TOM/TDF-Import/Export, Enrollment, Freigaben, Pairings, Bye, Ergebnismeldung/Korrektur/Konflikt, Spieler- und Adminansicht, SSE/Polling, Abschluss. | `server/services/events/tournamentTomStateService.ts`, `server/services/events/tomTdfService.ts`, `server/api/**/tom-bridge`, `pages/tournaments/[eventId].vue` | XML-Roundtrips und API-Contract-Tests; Freigabe-/Bye-Regressionsfall; Netzunterbrechung und wiederholte Ergebnismeldung. |
| Liga | Saison, Spieleridentität/Aliase, Punkteregeln, TDF-Import, Tabellen und Exporte. | `server/services/league`, `server/api/admin/league`, `server/api/league` | Schema-/Client-Abgleich und Import-Fixtures; identische Punktetabellen vor/nach Migration. |
| Decklisten | Pro Ticket Text oder „vor Ort“, Einreichung/Bearbeitung bis Start, Adminansicht, Import und Validierung. | `server/api/dashboard/decklist.put.ts`, `server/api/validate.post.ts`, `components/DecklistImporter.vue` | Berechtigungs-, Frist- und Formatfälle; Buchungsstatus bleibt bei Modultrennung korrekt; kein Deckinhalt in Logs/Debugdateien. |
| Querschnitt/UI | DE/EN, mobile Ansicht, Designsystem, Analytics, Admin-Dashboard, Fehlerzustände. | `i18n`, `components/App*`, `server/services/analytics`, `pages/admin` | Sichtprüfung wichtiger Flows auf Desktop/Mobil und i18n-Keys; keine verwaisten Navigationen. |

## Phasen und Prüftore

### P0 — Baseline und akute Risiken (in Arbeit)

- [x] Bestehende Tests und Build auf diesem Branch ausführen; die zwei roten Baseline-Tests waren veraltete Mocks und sind angepasst. `npm test`: 388 bestanden, 4 übersprungen. `npm run build`: erfolgreich. `vue-tsc --noEmit`: noch 119 bestehende Typfehler; kein grünes Typprüftor.
- [ ] Kritische Flows aus dem gesamten Funktionsinventar als reproduzierbare Fixtures bzw. Integrationstests erfassen. Bye vor Freigabe, wiederholte und gleichzeitige Meldungen sowie die Reduktion der Spielerantwort auf veröffentlichte Daten sind jetzt getestet; Browser-Netzabbruch und weitere Bereiche fehlen noch.
- [x] Neue Decklisten-Logs/Debugdatei und unredigierte neue Fehlerdiagnostik bereinigen; sichere Felder zentral über `safeDiagnostics` begrenzen. Vorhandene historische Logeinträge und Admin-Log-Leseprojektion müssen vor produktiver Freigabe gesondert auf Altlasten geprüft werden.
- [x] League-Prisma-Modelle gegen SQL-Migration abgleichen und Client generieren. `prisma validate` und `prisma generate` erfolgreich; reale Datenbankmigration/Abfrage noch nicht geprüft.

**Prüftor:** Baseline-Bericht vorhanden; kritische Ist-Flows reproduzierbar; keine sensiblen Daten in neuen Logs oder Tests.

### P1 — Verträge und zentrale Utilities (begonnen)

- [ ] Modul-Ports und DTOs definieren (`EventRef`, `ActorContext`, `TenantContext`, Resultat/Fehlercodes). Gemeinsame serialisierbare Grundtypen und Legacy-Adapter sind vorhanden; fachliche Ports, Versionierung und Fehlerabbildung fehlen. Routen bleiben als Adapter bestehen.
- [ ] Zentrale Utility-/Service-Eigentümer für Auth, Tenant-Rechte, Zeit, IDs, API-Fehler und redigierte Diagnostik festlegen; doppelte Implementierungen schrittweise entfernen.
- [ ] Für jedes Zielmodul README am tatsächlichen Modulverzeichnis anlegen bzw. die Planungs-README übernehmen. Vertragsänderung ohne aktualisierte Dokumentation und Contract-Test ist nicht fertig.
- [ ] Import-Regeln/Architekturtest einführen: fremde private Tabellen, interne Service-Imports und zyklische Modulabhängigkeiten verhindern.

**Prüftor:** Bestehende API-Tests unverändert grün; Modulverträge und Dokumentation stehen; lokale Adapter reproduzieren die bisherigen Antworten.

### P2 — Mandanten ohne Datenverlust (Grundlage begonnen)

- [x] Tenant und Membership schemafähig ergänzen, Crows & Owls als ersten Tenant anlegen, bestehende eigene Events/Vorlagen/Orte/Overrides zuordnen. Die additive Migration wurde auf der lokalen Docker-Dev-DB ausgeführt; Bestandszahlen sind abgeglichen. Produktive Migration steht noch aus.
- [ ] Mandantenauflösung und Rechteprüfung in zentralem Serverdienst einführen; alle Listen und Mutationen auf Tenant-Scope prüfen. Plattformadmin ausdrücklich separat modellieren.
- [ ] Migration zunächst additiv, mit Backfill-Report über null/mehrdeutige Zuordnungen. Erst nach Korrektur `NOT NULL`, Indizes und Eindeutigkeiten setzen.
- [ ] Zweiten Test-Tenant mit identischen Namen/Orten anlegen und Isolation von Events, Buchungen, Decklisten, TOM-Zustand und Adminansichten prüfen.

**Prüftor:** Kein Cross-Tenant-Lese- oder Schreibzugriff; bestehende Crows-&-Owls-Daten und URLs bleiben erreichbar; Rückroll-/Reparaturskript ist dokumentiert.

### P3 — Kalender- und Buchungsgrenzen

- [ ] Serverprojektion aus eigenen Events und externem Feed aufbauen; Quelle, Besitzer und Buchungsart explizit halten. Provider-ID-basierte Verknüpfung statt Namens-/Adressheuristik.
- [ ] Alte `/api/events*`-Routen als kompatible Fassade belassen; neue Projektion gegen Golden-Fixtures vergleichen.
- [ ] Buchung/Warteliste besitzen ihre Tabellen und Statusübergänge. Andere Module nutzen Befehle/Abfragen; Ereignisse aktualisieren Kalender-Zählwerte und Ansichten mit dokumentierter Verzögerung.
- [ ] Cache-Invalidierung bei Event-/Override-Änderung und bei Kapazitätsänderung definieren.

**Prüftor:** Kalender, Registrierung und Warteliste liefern gleiche fachliche Ergebnisse wie die Baseline; keine doppelte Anmeldung durch wiederholte Befehle.

### P4 — Turnier, Liga und Decklisten

- [ ] Turnier- und Ligamodell voneinander abgrenzen; TOM bleibt Adapter. Ergebnisse, Freigaben und Meldungen mit Version/Idempotenz absichern.
- [ ] Bye, Score und Verlauf aus derselben veröffentlichten Rundenansicht berechnen. Client erhält eine persistierte Quittung pro Ergebnismeldung und kann nach Netzabbruch den bestätigten Zustand abfragen.
- [ ] Decklisten als eigene Einreichung je Ticket modellieren; Version, Format, Prüfstatus und Frist von Ticketstatus trennen. Migration erhält bestehende Texte und „vor Ort“-Flags.
- [ ] Admin-/Spieleransichten und Exporte gegen gespeicherte Fixtures vergleichen.

**Prüftor:** TOM-Roundtrip, Liga-Wertungen und Decklistenmigration sind paritätisch; Konkurrenz-/Retry-/Netzausfalltests grün.

### P5 — Separater Betrieb und UI-Konsolidierung

- [ ] Remote-Adapter gegen dieselben Modul-Ports bauen; Contract-Tests lokal und remote ausführen. Mindestens einen wenig gekoppelten Adapter/Worker separat deployen und Ausfälle/Timeouts testen.
- [ ] Für jeden zur Extraktion vorgesehenen Dienst: eigenes Schema/DB-Recht, API-Version, Health-/Readiness-Endpunkt, Audit/Korrelation, Metriken, Outbox/Inbox oder dokumentierte Alternative, Rollback-Plan.
- [ ] Gemischten Betrieb testen: einzelne Module remote, übrige lokal; danach alle fachlich geeigneten Module remote in einer Testumgebung. Benutzeroberfläche und öffentliche API bleiben gleich.
- [ ] Vorhandene `App*`-Bausteine für Event-/Buchungs-/Turnier-/Decklistenstatus zusammenführen; Desktop/Mobil und DE/EN prüfen.

**Prüftor:** Kombiniertes Deployment und unterstützte gemischte/separate Topologien bestehen dieselbe Paritäts-Suite. Einzelne Module sind unabhängig versionierbar und rückrollbar; Ausfall eines Dienstes führt zu definierten Fehler- oder Warteschlangenzuständen statt stillen Datenverlusten.

## Änderungsprotokoll und Entscheidungen

| Datum | Entscheidung/Beobachtung | Nachweis | Nächster Schritt |
| --- | --- | --- | --- |
| 2026-10-24 | Branch für Rework angelegt; Architektur als Arbeitsdokument und kombinierter/separater Betrieb als Ziel festgelegt. | `codex/chrispyjams-architecture-rework`; dieses Dokument | P0-Funktionsfixtures erfassen. |
| 2026-10-24 | Test-Baseline: `npm test` liefert 50 bestandene, 2 fehlgeschlagene und 2 übersprungene Testdateien; 374 bestandene, 2 fehlgeschlagene, 4 übersprungene Tests. Fehlgeschlagen sind `tests/unit/playerCheckEndpoint.test.ts` (erwartete Auth-Existenz) und `tests/unit/playerRegisterEndpoint.test.ts` (erwartete 401, erhaltene 500). Nuxt meldet fehlende Supabase-Testkonfiguration; das erklärt nicht automatisch beide Assertion-Fehler. | Lokaler Lauf auf diesem Branch, Exit-Code 1; keine Produktcodeänderung in diesem Schritt. | Auth-Testfixtures und Fehlerbehandlung prüfen; danach Baseline erneut laufen lassen. |
| 2026-10-24 | Beide Auth-Tests an die bestehenden zentralen Schnittstellen angepasst; Bye-/Score-Veröffentlichung, Request-ID für Ergebnismeldungen, sichere neue Diagnostik und League-Prisma-Modelle umgesetzt. Spielerantwort enthält keine unveröffentlichten TOM-Runden oder Geburtsdaten mehr. Service-Role-Key ist nicht mehr Analytics-Salt. | `npm test`: 56 Testdateien bestanden, 2 übersprungen; 388 Tests bestanden, 4 übersprungen. `npm run build`, `prisma validate`, `prisma generate` erfolgreich. | Browser-Netzausfall, historische Logs, übrige Funktionsfixtures und Typfehler-Baseline bearbeiten. |
| 2026-10-24 | Typprüfung ist noch kein Freigabetor: nach Prisma-Generierung meldet `vue-tsc --noEmit` 119 Fehler in bestehenden UI/API-Typen; keine Meldung in den neu eingeführten Turnier-/Diagnosedateien. | Lokaler Typprüfungslauf, Exit-Code 2. | Vor P1 relevante Typfehler priorisieren und ein grünes Typprüftor herstellen. |
| 2026-10-24 | Mandantengrundlage additiv modelliert: Bestandsdaten erhalten den Crows-&-Owls-Tenant; Membership und zentrale Rollenprüfung sind vorhanden. Ein weiterer Tenant bleibt bis zur vollständigen Scope-Prüfung gesperrt. Die vorübergehenden `tenantId`-Defaults müssen vor Freigabe des zweiten Tenants durch explizite Objektzuordnung ersetzt werden. | `prisma validate`, `prisma generate`, `npm test`: 392 bestanden/4 übersprungen; `npm run build` erfolgreich. `vue-tsc --noEmit` weiterhin 119 bestehende Fehler. Keine reale DB-Migration ausgeführt. | Reale Migration mit Bestandsdaten prüfen, dann API-Routen und Listen tenantbezogen absichern. |
| 2026-10-24 | Admin-Adapter verwendet zentrale sichere Diagnostik für unerwartete Fehler; API-500-Antworten enthalten keine Exception-Texte mehr. Der Fehlervertrag der bestehenden 4xx-Fälle bleibt erhalten. | 28 gezielte Admin-Tests bestanden, darunter Prüfung auf geheimen Bearer-Text in Logs und Antwort. | Weitere rohe Fehlerpfade und historische Logs prüfen; API-Fehlercodes als Modulvertrag vereinheitlichen. |
| 2026-10-25 | Gemeinsamer `EventRef`-Vertrag und Actor-/Tenant-Kontexttypen eingeführt. Quellgebundene Wartelistenaktionen nutzen die bekannte Eventquelle auch bei identischer ID eines eigenen und externen Events. Die öffentlichen Routen mit bloßer ID bleiben unverändert und müssen vor Multi-Tenant-Betrieb eindeutig werden. | 11 gezielte Wartelisten-/Tenant-Tests bestanden, einschließlich ID-Kollision; Gesamtlauf: 393 bestanden, 4 übersprungen; Build erfolgreich. | Weitere Aufrufer auf explizite Referenzen umstellen und öffentliche Auflösung versionieren. |
| 2026-10-25 | Lokale Docker-Dev-DB vor Migration gesichert, dann drei ausstehende Migrationen angewandt (Geburtsjahr, Enrollment-Code, Tenant). Crows & Owls bleibt einziger aktiver Tenant; neue Läden entstehen über die Plattformadmin-UI ausschließlich als Entwurf. Gemeinsamer serverseitiger Supabase-Admin-Client ersetzt eine ungültige Client-Funktion. Nach Nutzerfeedback ist Atelier die Admin-Basis: zentrale Hell-/Dunkeltokens, flache kompakte Elemente und einklappbare Sidebar mit Mobil-Drawer. Signal/Editorial bleiben nur in der Dev-Vorschau schaltbar. Dashboardkennzahlen, Aktivitäten und Historie sind neu gegliedert. | `prisma migrate status`: aktuell; Bestandszahlen 8/8 eigene Events, 3/3 Orte, 1/1 Liga-Saison; 0 Vorlagen/Overrides. Dev-Dump: `/tmp/chrispyjams-dev-pre-tenant-20261025.dump`. `npm test`: 398 bestanden, 4 übersprungen; Build erfolgreich nach UI-Feinschliff. `vue-tsc --noEmit`: 118 bestehende Fehler, keine in neuen Dateien. Atelier Hell/Dunkel und Mobil-Drawer bei 375px visuell geprüft. | Echte Tenant-Scopes in allen Fachrouten, dann zweiter aktiver Mandant und Cross-Tenant-Tests. UI-Proben mit echten Adminfachseiten und Nutzerfeedback vergleichen. |

Offene Produktentscheidungen stehen im Ist-/Zielentwurf. Technische Detailentscheidungen werden hier mit Auswirkungen auf Kompatibilität und Rückrollbarkeit nachgetragen.

### Adminoberfläche nach Atelier-Entscheid

Die Unterseiten verwenden die gewählte Atelier-Hülle und zentralisierte Controls in `assets/css/admin-shared.css`. Fachspezifische Elemente sind mit denselben Oberflächen- und Textvariablen in Hell/Dunkel verdichtet. Der Daten- und API-Vertrag wurde bei dieser CSS-Angleichung nicht geändert. Die noch offene visuelle Abnahme mit echten, authentisierten Fachansichten ist im UI-Arbeitsdokument aufgeführt.
