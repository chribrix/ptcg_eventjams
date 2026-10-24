# Turnier — Planungs-README

**Zweck:** Turnierinstanz, TOM/TDF-Import und -Export, Rundenfreigabe, Pairings, Ergebnismeldungen, Konfliktlösung und Abschluss. Ein Kalender-Event kann eine Turnierinstanz referenzieren; das Turnier besitzt keine Eventpublikation.

**Heute:** `TournamentTomState` mit XML und JSON-Metadaten in `server/services/events/tournamentTomStateService.ts`; TOM-Parser in `tomTdfService.ts`; Admin-/Spielerrouten unter `tom-bridge`; SSE plus Polling. Meldungen überschreiben einen großen Zustand ohne stabilen Request-Schlüssel.

**Daten:** Turnier-ID, Event-/Tenant-Referenz, TOM-Snapshots, Freigaben, Pairings, Meldungen, Quittungen, Ergebnisversionen. TOM-XML bleibt Adapterformat; fachliche Zustandsübergänge sollen strukturiert und transaktional sein.

**Geplanter öffentlicher Vertrag:** `importSnapshot`, `releaseTournament`, `releaseRound`, `getPlayerRun`, `reportResult(requestId, ...)`, `resolveConflict`, `endTournament`, `exportSnapshot`; Ereignisse `RoundReleased`, `ResultConfirmed`, `TournamentEnded`. Gleiche `requestId` liefert dieselbe persistierte Quittung; Konflikt führt zu explizitem Fehler statt stillem Überschreiben.

**Interaktion:** Katalog liefert Eventbezug; Buchung liefert berechtigte Teilnehmer-/Ticketzuordnung; Identität/Gastzugang werden serverseitig geprüft; Liga konsumiert versionierte bestätigte Resultate oder importiert explizit. Decklisten können Zulassungsvoraussetzung sein, ändern aber keine Pairings direkt.

**Betrieb und Nachweis:** Lokal oder remote über denselben Port. SSE/Push ist Signal zur Aktualisierung, keine Zustellgarantie für einen Schreibbefehl. Nach Netzabbruch fragt der Client Quittung/Zustand ab. Tests für Bye vor Freigabe, Ergebnis-Retry, parallele Reports, TOM-Roundtrip, Gastzugang, Abschluss und gemischten Betrieb; alte `tom-bridge`-Routen bleiben kompatibel.
