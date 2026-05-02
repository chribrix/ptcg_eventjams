- Einheitliche Sprache, default deutsch
- Schönere Darstellung für Desktop anwendungen

- Kalender in /dashboard mit vorgemerkten und registrierten Events

- Passwort reset soll link reset ermöglichen

- Versteckte Eventtypen speichern für den Nutzer bei reload
- Warum bei reload immer redirect auf login?

- Online Pairings via TOM-Integration
  - Wer sich per Tool registriert hat sieht das quasi unter "meine Turniere"
  - Andere kriegen QR Code
  - Einlader kann QR code an seine Leute verteilen bzw. ihnen die Pairings nennen.

### Technisches Fundament (neu)

- TOM Import/Analyse:
  - `POST /api/admin/tournaments/tom-bridge/parse` nimmt TOM-XML (`.tdf`) entgegen und liefert:
  - Turnier-Metadaten, Spieleranzahl, Rundenübersicht, aktuelle Runde mit Pairings.
- TOM Ergebnis-Export:
  - `POST /api/admin/tournaments/tom-bridge/apply-results` nimmt Original-XML + Ergebnisupdates und gibt aktualisierte XML zurück (für Re-Import in TOM).
- Spieler-Ansicht Pairings:
  - `POST /api/tournaments/tom-bridge/my-pairings` liefert für den eingeloggten Spieler das Pairing der aktuellen Runde.
  - Nutzt standardmäßig `player.playerId` als TOM `userid` (optional `tomUserId` im Request überschreibbar).
- Kernservice:
  - `server/services/events/tomTdfService.ts` enthält Parser + Pairing-Selektion + XML-Update-Funktion.

### Nächste Baustellen (UI + Persistenz)

- Admin Turnierdashboard:
  - XML Upload/Dropzone, Rundenansicht, Matchkarten pro Tisch.
  - Ergebnis-Buttons pro Match (`P1`, `P2`, `Draw`, `Bye`, etc.).
  - Export-Button für aktualisierte XML.
- Spielerseite:
  - „Meine Turniere“: aktueller Gegner, Tisch, Rundennummer, Ergebnisabgabe.
  - Optional QR-Join-Link für nicht-registrierte Spieler.
- Persistenz für Livebetrieb:
  - TOM Snapshot + Ergebnisänderungen in DB speichern (statt nur request-basiertem XML).
  - Audit-Log für Turnieränderungen (wer hat welches Ergebnis gesetzt).

- Geofilter (nicht nur bayern)
- subdomain mit multiplayer sim

---

Ich möchte dass diese Software turniere auch stattfinden lassen kann.

Turniere und die Pairings der Spieler sollen über deren Geräte angezeigt werden können, während ein Admin als organisator ein Turnierdashboard hat, welches den Turniervorgang steuert.

TOM ist das Programm das für die Turnierpairings genutzt wird, und in welches die Spieler sowie Ergebnisse eingetragen werden. Dies alles wird über .xml Dateien (im Ordner TOM sind Beispiele) gesteuert.

Diese Aufgabe hat zwei große Baustellen:

- Turnierverwaltungsdashboard und Ansicht der Pairings für Spieler (individuell pro Spieler) mit Möglichkeit, den Ausgang einzugeben
- Analyse des TOM xml formats zum Einlesen / Ausgeben für das Dashboard (es soll aus TOM exportiert und zum ende wieder in TOM eingelesen, da dieses Programm die Pairings erstellt).
