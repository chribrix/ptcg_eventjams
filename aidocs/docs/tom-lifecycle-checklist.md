# TOM Tournament Lifecycle Checklist

Stand: 2026-05-02

## 1) Turnierstart / First Pairing Import
- [x] TOM-Datei kann als Source of Truth importiert werden (`.tdf/.xml`).
- [x] Snapshot-Dateien (`_rX-start`, `_rX-begin`, `_rX-end`) werden erkannt und Import-Historie wird gespeichert.
- [x] Importierte Snapshot-Dateien werden archiviert und können erneut exportiert werden.
- [x] BYE-Format aus TOM (`<match outcome="5"><player .../>`) wird korrekt geparsed.

## 2) Divisionen / Pods (Junior, Senior, Master)
- [x] Pods/Divisionen werden aus TOM gelesen (`<pod category=...>`).
- [x] Spieler werden Division(en) zugeordnet.
- [x] Standings pro Division werden separat berechnet und angezeigt.
- [x] Mehrere Divisionen in einer Datei werden unterstützt.

## 3) Eliminierungsrunden / Top Cut
- [x] Rundenstruktur inkl. `type`/`stage` wird aus TOM übernommen.
- [x] Matches lassen sich unabhängig vom Round-Typ darstellen und bearbeiten.
- [x] UI-Label „Swiss/Top Cut“ ist in den Round-Tabs sichtbar.

## 4) Pairings-Freigabe („Runde starten“)
- [x] Admin-Action `Runde starten` vorhanden.
- [x] Freigabe wird serverseitig als `pairingsReleasedRound` im TOM-Metadata gespeichert.
- [x] Spieler sehen aktuelle Pairings erst nach Freigabe.
- [x] Ergebnis-Submit ist serverseitig an freigegebene aktuelle Pairings gebunden.

## 5) Spieler-Reporting / Konflikte / Finalisierung
- [x] Spieler können Win/Loss/Tie melden.
- [x] Gegner sieht eingehende Meldung.
- [x] 30s Einspruchsfenster mit Konfliktstatus ist implementiert.
- [x] Auto-Finalisierung bei übereinstimmenden Reports oder nach Ablauf.
- [x] Admin kann Konflikte je Match auflösen (`P1`, `P2`, `Draw`, `DGL`).

## 6) Export zurück nach TOM
- [x] Export der aktuellen TOM-kompatiblen Datei (`currentXml`) ist implementiert.
- [x] Export der importierten Source-Datei (`sourceXml`) ist möglich.
- [x] Re-Export älterer archivierter Snapshot-Dateien ist möglich.
- [x] Workflow „Runde fertig -> export -> in TOM neu pairen -> nächste Datei importieren“ ist möglich.
- [x] Export wird blockiert, solange in der aktuellen Runde noch offene Ergebnisse (`outcome=0`) vorhanden sind.

## 7) Spieleransicht / Zugriff / Impersonation
- [x] Jeder registrierte Teilnehmer hat eigene Turnierseite.
- [x] Zugriffsschutz: nur registrierte Teilnehmer dürfen `me/report/stream` nutzen.
- [x] Admin-Impersonation führt auf dieselbe Spieleransicht.
- [x] URL enthält keine offene Spieler-ID mehr; stattdessen gehashter `viewer`-Token.
- [x] Aktuelle Runde ist hervorgehoben (oben), inkl. Gegnername und Tischnummer.
- [x] Spielerseite ist auf Deutsch.

## 8) Nach Turnierende / nach Drop
- [x] Historie bleibt sichtbar (Runden + Ergebnisse).
- [x] Neue Einträge sind nur für freigegebene, aktive aktuelle Paarung möglich.
- [x] Harte Sperre auf `customEvent.status === completed/cancelled` für Spieler-Submit ist serverseitig erzwungen.

## 9) Turnierhistorie im Dashboard (Placements)
- [x] Dashboard zeigt Placement (`#`) wenn TOM-Bridge-Daten für das Event vorhanden sind.
- [x] Placement wird aus TOM-Standings pro Spieler ermittelt.
- [~] Für sehr große Datenmengen kann Caching sinnvoll sein (derzeit Live-Berechnung beim Request).

## 10) Push / Live-Updates
- [x] SSE-Streams für Admin- und Spieleransicht vorhanden.
- [x] Fallback-Polling bleibt aktiv.

---

## Offene Restpunkte (empfohlen)
1. [ ] Optional: „Export all pods“-Massenexport für mehrere Dateien/Selektionsprofile (aktuell ein konsolidierter TOM-Export).
2. [ ] Optional: Caching der Placement-Berechnung für sehr große Dashboard-Datenmengen.
