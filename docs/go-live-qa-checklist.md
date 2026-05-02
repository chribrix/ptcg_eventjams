# Go-Live QA Checklist (Tournament Lifecycle / TOM Bridge)

Stand: 2026-05-02

## A. Setup & Data
- [ ] Mindestens ein Testturnier mit TOM-Import vorhanden.
- [ ] Testdaten mit mehreren Pods/Divisionen (Junior/Senior/Master) vorhanden.
- [ ] Testdaten mit BYE-Match (`outcome=5`) vorhanden.
- [ ] Zwei Testspieler + ein Admin-Konto verifiziert.

## B. Admin: Import & Parsing
- [ ] Admin kann `Tournament Management` öffnen.
- [ ] TOM-Datei (`.tdf/.xml`) importiert ohne Fehler.
- [ ] Overview zeigt Divisionen/Pods korrekt.
- [ ] Round-Tabs zeigen `Runde X · Swiss/Top Cut`.
- [ ] Snapshot-Hinweis (`rX-start/begin/end`) wird erkannt.

## C. Admin: Runde starten / Freigabe
- [ ] Klick auf `Runde starten` gibt visuelles Erfolg-Feedback.
- [ ] Freigegebene Runde wird als `Released round for players` angezeigt.
- [ ] Tab bleibt stabil (kein ungewollter Sprung von `Roster` auf Runde).

## D. Spieler: Zugriff & Sicht
- [ ] Registrierter Spieler sieht Header-Link `Meine Turniere` ab 15 Minuten vor Start.
- [ ] Link führt zur persönlichen Turnierseite.
- [ ] Nicht registrierter Spieler bekommt keinen Zugriff auf Spieler-APIs (`403`).
- [ ] Wenn Pairings noch nicht freigegeben: Hinweis „Pairings vorhanden, aber noch nicht freigegeben.“
- [ ] Aktuelle Runde ist oben hervorgehoben (Gegner + Tischnummer gut sichtbar).

## E. Spieler: Reporting
- [ ] Spieler kann `Sieg / Niederlage / Unentschieden` melden.
- [ ] Gegner sieht, dass bereits ein Report eingegangen ist.
- [ ] Konfliktfall erzeugt Status `conflicted`.
- [ ] Nach 30s ohne Widerspruch wird `pending` automatisch finalisiert.
- [ ] Spieler kann keine alten/fremden Matches submitten (serverseitig geblockt).

## F. Admin: Konfliktlösung
- [ ] Konfliktstatus im Admin-Match sichtbar.
- [ ] Admin kann auflösen mit `Accept P1 / Accept P2 / Draw / DGL`.
- [ ] Auflösung schreibt TOM-Outcome korrekt in `currentXml`.
- [ ] Reportstatus wechselt auf `admin_overridden`.

## G. Export / TOM Re-Import
- [ ] `Export Current` funktioniert bei vollständig abgeschlossener aktueller Runde.
- [ ] `Export Current` ist blockiert, wenn aktuelle Runde offene Matches hat.
- [ ] `Export Source` liefert zuletzt importierte Originaldatei.
- [ ] Snapshot-Export über `Snapshot Exports` Buttons funktioniert.
- [ ] Exportdatei kann in TOM wieder eingelesen werden.
- [ ] Nach TOM-Repairing kann neue Datei erneut importiert werden.

## H. Impersonation & Security
- [ ] Admin-Roster `Turnieransicht` öffnet Spieleransicht im neuen Tab.
- [ ] URL nutzt `viewer`-Token statt offener `tomUserId`.
- [ ] Impersonation-Ansicht zeigt Spieler-View, aber ohne aktives Spieler-Submit.

## I. Post-Tournament Behavior
- [ ] Bei `customEvent.status = completed/cancelled` sind Spieler-Submits blockiert.
- [ ] Spielerhistorie bleibt lesbar nach Turnierende.
- [ ] Dashboard zeigt Placement (`#`) für via TOM gepairte Turniere.

## J. Live Updates
- [ ] Admin-Ansicht aktualisiert sich live via SSE (inkl. Reports).
- [ ] Spieler-Ansicht aktualisiert sich live via SSE.
- [ ] Fallback-Polling funktioniert, falls SSE abreißt.

## K. Regression Smoke
- [ ] Normale Event-Registrierung weiterhin funktionsfähig.
- [ ] Dashboard lädt ohne Fehler.
- [ ] Admin Sidebar/Navigation funktioniert auf Desktop + Mobile.

## L. Go/No-Go
- [ ] Alle Must-Have Punkte B–I grün.
- [ ] Keine Blocker in Logs bei Import/Submit/Export.
- [ ] Team-Review und Freigabe dokumentiert.
