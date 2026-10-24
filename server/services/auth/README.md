# Auth-Service (heutige Codegrenze)

`authService.ts` ist die einzige serverseitige Autorität für Endnutzeridentität. `resolveOptionalAuthUser` und `requireAuthUser` prüfen Supabase-Cookie oder explizites Bearer-Token mit öffentlichem Schlüssel. API-Routen und andere Services beziehen die Identität hier; sie prüfen Tokens nicht selbst. Der Client verwaltet Session-Refresh und -Invalidierung ausschließlich in `services/authSessionService.ts`.

**Daten und Interaktion:** Supabase besitzt Credentials und Sessions; `Player` ist das lokale Fachprofil. `server/util/authenticatedPlayer.ts` verbindet beides. Admin-Rollen kommen aus verifizierten `app_metadata` über `server/util/adminAccess.ts`. Tenant-Mitgliedschaft ist zukünftig Eigentum des Mandantenmoduls. Der Service-Role-Key bleibt ausschließlich bei serverseitigen Adminoperationen.

**Betrieb und Nachweis:** Heute gemeinsam mit Nitro deployt. Für entfernte Fachmodule soll ein signierter kurzlebiger Actor-Kontext transportiert und dort erneut berechtigt werden; keine Token- oder Service-Role-Key-Weitergabe an Fachmodule. `tests/unit/authArchitecture.test.ts`, `tests/unit/authSessionService.test.ts` und Auth-Endpunkt-Tests prüfen die Grenze. Zielvertrag: [`modules/identity/README.md`](../../../modules/identity/README.md).
