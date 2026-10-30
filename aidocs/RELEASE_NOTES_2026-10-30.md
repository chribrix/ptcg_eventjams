# Release Notes – Chrispyjams, 30. Oktober 2026

Produktiv auf `root@chrispyjams` seit 30. Oktober 2026 · ausgelieferter Commit: `07729e2` · Änderungen seit dem vorherigen Produktions-Commit `f935796`.

Die vollständige Architekturplanung und die Prüftore stehen im [Architekturvorschlag](CHRISPYJAMS_ARCHITEKTURVORSCHLAG.md) und [Implementierungsplan](architecture/IMPLEMENTATION_PLAN.md).

## Für Nutzerinnen und Nutzer

- **Eventansichten:** TCG-, VGC- und GO-Events zeigen passende, dezente Logo-Wasserzeichen. Die helle und dunkle Variante folgt dem Farbmodus; auf kleinen Bildschirmen sitzt das Motiv mittig. In Eventkarten bleibt es oberhalb der Fußzeile und überlagert deren Trennlinie nicht.
- **Turniere:** Unveröffentlichte TOM-Runden einschließlich Byes und Zwischenständen werden in der Spieleransicht nicht vorzeitig sichtbar. Ergebnismeldungen erhalten eine Request-ID, damit wiederholte Übertragungen sicherer behandelt werden können. Die Spielerantwort gibt keine unveröffentlichten TOM-Runden oder Geburtsdaten mehr zurück.
- **QR-Zugang ohne Konto:** Der Turnier-Kurzlink öffnet die Spielerseite ohne Login. Gäste identifizieren sich mit Pokémon-Spieler-ID und vollständigem Geburtsdatum aus TOM; angemeldete Profile mit passender ID und passendem Geburtsjahr werden automatisch zugeordnet. Der Zugang gilt nur für das jeweilige freigegebene Turnier.

## Administration

- **Neue Oberfläche:** „Atelier“ ist die Admin-Gestaltung mit den bestehenden Farben der globalen Kopfzeile. Sie unterstützt Hell- und Dunkelmodus, kompaktere Elemente, einheitlichere Schrift- und Buttongrößen sowie eine größere, einklappbare Sidebar. Auf Mobilgeräten öffnet sich die Navigation als Drawer. Die Unterseiten wurden an gemeinsame CSS-Regeln angeglichen. Zwei weitere Gestaltungsrichtungen bleiben nur in der lokalen Vorschau unter `/admin-style-preview` zum Vergleich verfügbar.
- **Mandantenverwaltung:** Plattformadmins können Läden als Entwurf anlegen, umbenennen und Mitgliedschaften vorbereiten. Eine Aktivierung weiterer Läden ist bewusst noch nicht verfügbar, solange Fachrouten und Datenabfragen nicht vollständig mandantenbezogen abgesichert sind.
- **Analyse:** „Heute“ ist der Standardzeitraum. Die Hauptmetrik zählt Besucher mit mindestens einer echten Interaktion; passive Seitenaufrufe erscheinen dort nicht mehr. Hinzu kommen separate Zähler für Klicks auf den Startseitenkalender, erfolgreiche Logins und Aufrufe von Dashboard und Eventliste. Das Tagesdiagramm hat einen Hover-Zustand und eine korrigierte Füllfläche. Die vier neuen Zähler messen Ereignisse, keine eindeutigen Personen; ältere Kalenderklicks und Logins lassen sich nicht rückwirkend ergänzen.

## Architektur und Daten

- Ein Architektur-Arbeitsdokument, ein Funktionsinventar und Modul-READMEs halten Zuständigkeiten, Schnittstellen und Prüftore fest. Das Ziel sind fachliche Module, die gemeinsam oder über Adapter separat betrieben werden können. **Separat deploybare Dienste sind noch nicht umgesetzt.**
- Die additive Mandantengrundlage führt `Tenant`, Mitgliedschaften und `tenantId`-Zuordnungen ein. Die Produktivmigration ordnete alle 51 bestehenden eigenen Events dem gültigen Crows-&-Owls-Mandanten zu. Weitere Läden bleiben Entwürfe.
- Gemeinsame `EventRef`- und Actor-/Tenant-Kontexttypen machen Eventquelle und Berechtigungskontext expliziter. Erste Wartelistenaktionen verwenden die Eventquelle auch bei kollidierenden IDs. Bestehende öffentliche Routen mit bloßer Event-ID bleiben vorerst erhalten.
- Neue Fehlerdiagnostik begrenzt gespeicherte Angaben auf sichere Felder; unerwartete Admin-API-Fehler geben keine internen Exception-Texte aus. Die League-Modelle sind wieder im Prisma-Schema abgebildet.
- Die additiven Migrationen für Mandanten und Analytics wurden auf der Produktivdatenbank angewendet. `prisma migrate status` meldet 41 von 41 Migrationen aktuell.

## Noch offen

- **Mehrmandantenbetrieb:** Alle fachlichen Listen und Mutationen müssen den Tenant serverseitig prüfen. Danach folgen Cross-Tenant-Tests, Anpassungen bestehender globaler Eindeutigkeiten und erst dann die Aktivierung eines zweiten Ladens. Der vorübergehende Crows-&-Owls-Default darf nicht zur dauerhaften Zuordnungsregel werden.
- **Modulbetrieb:** Fachliche Ports, Remote-Adapter, Contract-Tests und ein separat deployter Pilot fehlen noch. Kalender, Buchung, Turnier, Liga und Decklisten laufen weiterhin in der gemeinsamen Nuxt/Nitro-Anwendung.
- **Funktionsparität:** Weitere Integrations- und Browserprüfungen sind nötig, insbesondere Netzunterbrechung bei Ergebnismeldungen, bestehende Buchungs-/Wartelistenabläufe und authentisierte Admin-Unterseiten auf Mobilgeräten. Die repo-weite `vue-tsc`-Prüfung enthält laut letztem dokumentiertem Lauf noch 118 bestehende Fehler.
- **Betrieb:** Historische Diagnoseeinträge sind gesondert zu prüfen. Die neuen Analytics-Zähler beginnen erst mit ihrer jeweiligen Erfassung; fehlende ältere Interaktionen werden nicht geschätzt.
- **QR-Gastzugang:** Die Versuchsdrosselung gilt derzeit je App-Prozess. Für mehrere Instanzen fehlt eine verteilte Drosselung; ein Browser-Test mit realem QR-Scan steht noch aus.

**Release-Nachweis:** Vor dem Wechsel wurde ein geschützter Datenbank-Dump unter `/root/ptcg-backups/idp-pre-release-20261030-qr.dump` angelegt. Lokale Prüfung: 412 Tests bestanden, 4 übersprungen; Build erfolgreich; die Typprüfung hat weiterhin 118 bestehende Fehler. Nach dem Wechsel: Startseite lokal und öffentlich HTTP 200, öffentlicher QR-Kurzlink HTTP 200, gespeicherter Enrollment-Code HTTP 200, unbekannter Code 404, Spieler-API ohne Identität und Gastprüfung mit falschen Daten jeweils 401. Die App läuft auf Commit `07729e2`; ein realer QR-Scan mit gültigen TOM-Daten wurde nicht durchgeführt.
