# Admin-Services (heutige Codegrenze)

Die Services hier bedienen Event-/Vorlagen-/Ort-/Override-Verwaltung, Spieler und Benutzer, Dashboard, Registrierung, Banner und Admin-Audit. `adminRoute.ts` verbindet API-Routen mit der serverseitigen Adminprüfung in `server/util/adminAccess.ts`; `adminAuditService.ts` schreibt nur noch sichere Diagnosecodes und Actor-IDs.

**Daten und Interaktion:** Die einzelnen Dienste ändern heute direkt Prisma-Modelle mehrerer Fachbereiche. Das ist eine Übergangsstruktur, keine künftige Modulgrenze. Bei der Modularisierung wandern fachliche Befehle zu Katalog, Buchung, Mandanten und Identität; diese Adminschicht bleibt dünner Adapter. Globale Adminrolle und künftige Ladenrolle müssen getrennt geprüft werden.

**Betrieb und Nachweis:** Heute gemeinsam mit Nitro. Separater Betrieb betrifft die Fachmodule, nicht eine eigenständige Admin-Datenhoheit. Bestehende `tests/unit/admin*`-Tests und Routenparität sichern den Übergang; Cross-Tenant-Tests fehlen noch. Zielindex: [`aidocs/architecture/MODULES.md`](../../../aidocs/architecture/MODULES.md).

**Fehlervertrag:** `adminRoute.ts` reicht validierte 4xx-Fehler weiter und gibt für unerwartete Fehler nur einen generischen 500-Text zurück. Auth- und Admin-Diagnosen nutzen `safeDiagnostics`; rohe Exception-Texte werden nicht geloggt oder an API-Clients gesendet.
