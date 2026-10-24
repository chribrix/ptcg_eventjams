# Modulindex und Dokumentationsvertrag

Status: Zielgrenzen als Planungs-READMEs. Die Implementierung liegt noch überwiegend in `server/services`, `server/api`, `pages` und `components`. Beim Verschieben eines Moduls wandert seine README **in das Codeverzeichnis** und wird in derselben Änderung aktualisiert. Der [Implementierungsplan](IMPLEMENTATION_PLAN.md) legt die Prüftore fest.

| Modul | Planungs-README | Heutige Hauptorte | Künftige Datenhoheit |
| --- | --- | --- | --- |
| Identität & Zugriff | [README](../../modules/identity/README.md) | `server/services/auth`, `server/util/authenticatedPlayer.ts`, `server/util/adminAccess.ts`, `services/authSessionService.ts` | Identitätszuordnung, globale Rollen; Supabase bleibt Auth-Provider. |
| Mandanten | [README](../../modules/tenants/README.md) | Noch kein eigenes Modul; Anfänge in `VenueDirectoryEntry` und Adminrollen. | Tenant, Mitgliedschaft, Orte, Tenant-Konfiguration. |
| Kalender & Eventkatalog | [README](../../modules/catalog/README.md) | `server/services/events/pokedataService.ts`, `eventProjectionService.ts`, `server/services/admin/eventAdminService.ts`, `server/api/events*` | Events, Vorlagen, Quellenverknüpfung, Kalenderprojektion. |
| Buchung & Warteliste | [README](../../modules/booking/README.md) | `server/api/events/[id]/register.post.ts`, `server/api/bookings`, `server/services/events/waitlistService.ts` | Registrierungen, Tickets, Warteliste. |
| Turnier | [README](../../modules/tournament/README.md) | `server/services/events/tom*`, `tournamentTomStateService.ts`, `server/api/**/tom-bridge` | Turnierzustand, Pairings, Meldungen, Freigaben. |
| Liga | [README](../../modules/league/README.md) | `server/services/league`, `server/api/admin/league`, `server/api/league` | Saisons, Wertungen, Ligateilnahmen. |
| Decklisten | [README](../../modules/decklists/README.md) | `server/api/dashboard/decklist.put.ts`, `server/api/validate.post.ts`, `server/util/PTCGValidator.ts` | Einreichungen, Versionen, Prüfergebnisse. |

## Pflichtinhalt jeder Modul-README

Die README erklärt Zweck und Nichtzuständigkeit, öffentliche Befehle/Abfragen/Ereignisse und ihre Versionen, eigene Daten, verwendete zentrale Utilities, Abhängigkeiten und Interaktionen, Actor-/Tenant-Prüfung, Fehler- und Konsistenzverhalten, lokale und entfernte Betriebsart, Migration/Kompatibilität, Tests und Betrieb. Für jedes Untermodul oder eigenständig betriebene Service wird dieselbe Vorlage an seiner Codegrenze geführt. Adapter für pokedata und TOM werden im jeweiligen Fachmodul dokumentiert; wenn sie eigene Deployments erhalten, bekommen sie zusätzliche READMEs.

## Import- und Eigentumsregel

Eine API-Route ist ein dünner Adapter. Sie löst Auth/Tenant über zentrale Dienste auf und ruft den öffentlichen Modul-Port auf. Kein Modul importiert interne Dateien eines anderen Moduls oder liest dessen private Prisma-Modelle. Gemeinsame DTOs und technische Utilities haben einen benannten Eigentümer; fachliche Statusregeln bleiben im verantwortlichen Modul. Diese Regel wird ab P1 durch Architekturtests oder Import-Grenzen geprüft.
