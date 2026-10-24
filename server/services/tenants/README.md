# Mandanten-Service (additive Grundlage)

`tenantService.ts` enthält die zentrale serverseitige Prüfung eines Mandantenrechts. Der Actor kommt ausschließlich aus `server/services/auth/authService.ts`; Supabase-`app_metadata` kennzeichnet bisherige globale Admins als Plattformadmins. `TenantMembership` gibt tenantbezogene Rollen `owner`, `admin` und `staff`. Ein Request-`tenantId` ist nur Suchhinweis und muss gegen das adressierte Objekt abgeglichen werden.

**Daten:** `Tenant` und `TenantMembership` gehören diesem Service. `CustomEvent`, `EventTemplate`, `VenueDirectoryEntry`, `ExternalEventOverride` und `LeagueSeason` erhalten in der additiven Migration einen `tenantId`; die Bestandsdaten werden Crows & Owls zugeordnet. Turnier, Buchung und Deckliste leiten ihre Mandantenzuordnung zunächst über das Event ab.

**Interaktion und Betrieb:** Heute nur in-process und noch nicht als Zugriffspfad aller Routen aktiv. Ein zweiter Tenant darf deshalb noch nicht produktiv freigeschaltet werden. Vor getrennter Bereitstellung braucht der Dienst denselben Berechtigungsvertrag über einen authentisierten Transportadapter; Fachmodule prüfen ihre Objektzuordnung zusätzlich. Der Zielvertrag steht in [`modules/tenants/README.md`](../../../modules/tenants/README.md).

**Nachweis:** `prisma validate` und `prisma generate` prüfen das Schema, `tests/unit/tenantService.test.ts` die Rollenmatrix. Migration und Backfill gegen eine reale Datenbank sowie Cross-Tenant-API-Tests stehen noch aus.
