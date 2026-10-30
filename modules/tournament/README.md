# Turnier — Planungs-README

**Zweck:** Turnierinstanz, TOM/TDF-Import und -Export, Rundenfreigabe, Pairings, Ergebnismeldungen, Konfliktlösung und Abschluss. Ein Kalender-Event kann eine Turnierinstanz referenzieren; das Turnier besitzt keine Eventpublikation.

**Heute:** `TournamentTomState` mit XML und JSON-Metadaten in `server/services/events/tournamentTomStateService.ts`; TOM-Parser in `tomTdfService.ts`; Admin-/Spielerrouten unter `tom-bridge`; SSE plus Polling. P0 ergänzt eine optionale UUID-Request-ID mit persistierter Quittung und bedingtem Schreiben über `updatedAt`; alte Aufrufer ohne Request-ID bleiben kompatibel. Dies ersetzt noch kein vollständig strukturiertes Turniermodell.

**Daten:** Turnier-ID, Event-/Tenant-Referenz, TOM-Snapshots, Freigaben, Pairings, Meldungen, Quittungen, Ergebnisversionen. TOM-XML bleibt Adapterformat; fachliche Zustandsübergänge sollen strukturiert und transaktional sein.

**Geplanter öffentlicher Vertrag:** `importSnapshot`, `releaseTournament`, `releaseRound`, `getPlayerRun`, `reportResult(requestId, ...)`, `resolveConflict`, `endTournament`, `exportSnapshot`; Ereignisse `RoundReleased`, `ResultConfirmed`, `TournamentEnded`. Gleiche `requestId` liefert dieselbe persistierte Quittung; Konflikt führt zu explizitem Fehler statt stillem Überschreiben.

**Interaktion:** Katalog liefert Eventbezug; Buchung liefert berechtigte Teilnehmer-/Ticketzuordnung; Identität/Gastzugang werden serverseitig geprüft; Liga konsumiert versionierte bestätigte Resultate oder importiert explizit. Decklisten können Zulassungsvoraussetzung sein, ändern aber keine Pairings direkt.

**QR-Gastzugang im gemeinsamen Betrieb:** `/e/:code` ist öffentlich. Nach TOM-Freigabe wird ein Spieler ohne Chrispyjams-Konto anhand seiner Pokémon-Spieler-ID und seines aus TOM abgeleiteten Geburtsjahrs identifiziert; ein signiertes, eventgebundenes HttpOnly-Cookie berechtigt anschließend Spieleransicht, Ergebnismeldung und Live-Updates. Bei angemeldetem Profil genügen dieselbe TOM-ID und dasselbe Geburtsjahr für die automatische Zuordnung. Der bisherige vollständige Datums-Request bleibt für bereits geöffnete Tabs zunächst kompatibel. Die Auflösung gehört `server/services/events/tomPlayerIdentity.ts`, die Cookie-Signatur und prozesslokale Versuchsdrosselung `tomGuestAccessService.ts`. Für einen separaten Betrieb sind signierter Actor-/Gastkontext, ein gemeinsamer Schlüsselvertrag und verteilte Drosselung des öffentlichen Prüfpunkts erforderlich.

**Betrieb und Nachweis:** Lokal oder remote über denselben Port. SSE/Push ist Signal zur Aktualisierung, keine Zustellgarantie für einen Schreibbefehl. Nach Netzabbruch fragt der Client Quittung/Zustand ab. Tests für Bye vor Freigabe, Ergebnis-Retry, parallele Reports, TOM-Roundtrip, Gastzugang, Abschluss und gemischten Betrieb; alte `tom-bridge`-Routen bleiben kompatibel.

**P0-Nachweis:** `tests/unit/tournamentPlayerRun.test.ts` prüft Bye-Veröffentlichung, wiederholte und gleichzeitige Meldungen sowie die Reduktion der Spielerantwort auf Namen und veröffentlichte Paarungen; `tests/unit/tournamentPublication.test.ts` prüft die gemeinsame Freigaberegel. Die UI nutzt bei erneutem Versuch dieselbe Request-ID und zeigt eine unklare Übermittlung an. Ein echter Browser-Test mit Netzabbruch fehlt noch.
