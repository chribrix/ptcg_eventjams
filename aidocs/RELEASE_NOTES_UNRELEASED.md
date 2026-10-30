# Release Notes – Architektur-Rework (unveröffentlicht)

Stand: 30. Oktober 2026 · Branch: `codex/chrispyjams-architecture-rework` · Änderungen ab `601f790` einschließlich des aktuellen Arbeitsstands.

Dies ist ein Entwurf für den aktuellen Entwicklungsstand, keine Ankündigung eines Produktiv-Releases. Die vollständige Architekturplanung und die Prüftore stehen im [Architekturvorschlag](CHRISPYJAMS_ARCHITEKTURVORSCHLAG.md) und [Implementierungsplan](architecture/IMPLEMENTATION_PLAN.md).

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
- Die additive Mandantengrundlage führt `Tenant`, Mitgliedschaften und `tenantId`-Zuordnungen ein. Bestehende eigene Events, Orte und die Liga-Saison der lokalen Entwicklungsdatenbank wurden Crows & Owls zugeordnet. Die Migration wurde dort angewendet und anhand der Bestandszahlen geprüft; eine Produktivmigration ist nicht erfolgt.
- Gemeinsame `EventRef`- und Actor-/Tenant-Kontexttypen machen Eventquelle und Berechtigungskontext expliziter. Erste Wartelistenaktionen verwenden die Eventquelle auch bei kollidierenden IDs. Bestehende öffentliche Routen mit bloßer Event-ID bleiben vorerst erhalten.
- Neue Fehlerdiagnostik begrenzt gespeicherte Angaben auf sichere Felder; unerwartete Admin-API-Fehler geben keine internen Exception-Texte aus. Die League-Modelle sind wieder im Prisma-Schema abgebildet.
- Für die neuen Analytics-Ereignisse wurden additive Datenbankmigrationen auf der lokalen Dev-Datenbank angewendet.

## Vor einer Freigabe offen

- **Mehrmandantenbetrieb:** Alle fachlichen Listen und Mutationen müssen den Tenant serverseitig prüfen. Danach folgen Cross-Tenant-Tests, Anpassungen bestehender globaler Eindeutigkeiten und erst dann die Aktivierung eines zweiten Ladens. Der vorübergehende Crows-&-Owls-Default darf nicht zur dauerhaften Zuordnungsregel werden.
- **Modulbetrieb:** Fachliche Ports, Remote-Adapter, Contract-Tests und ein separat deployter Pilot fehlen noch. Kalender, Buchung, Turnier, Liga und Decklisten laufen weiterhin in der gemeinsamen Nuxt/Nitro-Anwendung.
- **Funktionsparität:** Weitere Integrations- und Browserprüfungen sind nötig, insbesondere Netzunterbrechung bei Ergebnismeldungen, bestehende Buchungs-/Wartelistenabläufe und authentisierte Admin-Unterseiten auf Mobilgeräten. Die repo-weite `vue-tsc`-Prüfung enthält laut letztem dokumentiertem Lauf noch 118 bestehende Fehler.
- **Betrieb:** Historische Diagnoseeinträge und produktive Datenmigration sind gesondert zu prüfen. Die neuen Analytics-Zähler beginnen erst mit ihrer jeweiligen Erfassung; fehlende ältere Interaktionen werden nicht geschätzt.
- **QR-Gastzugang:** Die Versuchsdrosselung gilt derzeit je App-Prozess. Für mehrere Instanzen fehlt eine verteilte Drosselung; ein Browser-Test mit realem QR-Scan steht noch aus.

Diese Notes werden vor einem tatsächlichen Release anhand des dann ausgelieferten Commits, der Zielumgebung und eines vollständigen Prüflaufs aktualisiert.
