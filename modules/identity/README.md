# Identität & Zugriff — Planungs-README

**Zweck:** Supabase-Endnutzeridentität auf ein lokales Spielerprofil und einen verifizierten `ActorContext` abbilden. Globale Plattformrechte von mandantenbezogenen Rechten unterscheiden. Dieses Modul besitzt keine Events oder Buchungen.

**Heute:** `server/services/auth/authService.ts` ist alleinige serverseitige Identitätsautorität; `services/authSessionService.ts` alleinige clientseitige Session-Autorität. `server/util/authenticatedPlayer.ts` und `server/util/adminAccess.ts` setzen darauf auf. Diese Grenzen bleiben bestehen.

**Daten:** `Player` und Zuordnung zu Supabase-ID. Supabase besitzt Credentials/Session. Tenant-Mitgliedschaft gehört dem Mandantenmodul; Identität liefert nur die verifizierte User-ID und Plattformrolle.

**Geplanter öffentlicher Vertrag:** `resolveOptionalActor`, `requireActor`, `resolvePlayer`, `requirePlatformRole`; Ergebnis enthält sichere IDs, niemals Access-/Refresh-Token. Fehler: `UNAUTHENTICATED`, `PLAYER_NOT_FOUND`, `FORBIDDEN`. Die vorhandenen Funktionen `resolveOptionalAuthUser` und `requireAuthUser` bleiben Kern des serverseitigen Vertrags.

**Interaktion:** API-Gateway und Module beziehen Actor-Kontext hier; Mandantenmodul prüft Membership. Kein Modul interpretiert Clientrollen. In separatem Betrieb prüft jeder Dienst einen signierten kurzlebigen Servicekontext mit Actor-/Tenant-Bezug und eigener Berechtigungsentscheidung; der Supabase-Service-Role-Key wird nicht übertragen.

**Betrieb und Nachweis:** Lokal über In-process-Port, remote über Auth-/Kontextadapter ohne Weitergabe von Session-Secrets an Fachmodule. Contract-Tests für gültige/abgelaufene Session, Rollen und fehlendes Profil; Auth-Logging-Regeln aus `AGENTS.md` gelten in beiden Betriebsarten. Migrationspfad: bestehende Routen behalten ihre Signaturen bis alle Aufrufer umgestellt sind.
