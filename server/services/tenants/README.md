# Mandanten-Service (additive Grundlage)

`tenantService.ts` enthält die zentrale serverseitige Prüfung eines Mandantenrechts. Der Actor kommt ausschließlich aus `server/services/auth/authService.ts`; Supabase-`app_metadata` kennzeichnet bisherige globale Admins als Plattformadmins. `TenantMembership` gibt tenantbezogene Rollen `owner`, `admin` und `staff`. Ein Request-`tenantId` ist nur Suchhinweis und muss gegen das adressierte Objekt abgeglichen werden.

**Daten:** `Tenant` und `TenantMembership` gehören diesem Service. `CustomEvent`, `EventTemplate`, `VenueDirectoryEntry`, `ExternalEventOverride` und `LeagueSeason` erhalten in der additiven Migration einen `tenantId`; die Bestandsdaten werden Crows & Owls zugeordnet. Turnier, Buchung und Deckliste leiten ihre Mandantenzuordnung zunächst über das Event ab.

**Interaktion und Betrieb:** Heute nur in-process und noch nicht als Zugriffspfad aller Routen aktiv. Ein zweiter Tenant darf deshalb noch nicht produktiv freigeschaltet werden. Vor getrennter Bereitstellung braucht der Dienst denselben Berechtigungsvertrag über einen authentisierten Transportadapter; Fachmodule prüfen ihre Objektzuordnung zusätzlich. Der Zielvertrag steht in [`modules/tenants/README.md`](../../../modules/tenants/README.md).

**Nachweis:** `prisma validate` und `prisma generate` prüfen das Schema, `tests/unit/tenantService.test.ts` die Rollenmatrix. Cross-Tenant-API-Tests stehen noch aus.

**Plattformverwaltung:** `tenantAdminService.ts` und `/api/admin/tenants/**` verwalten Namen und Mitgliedschaften über die bestehende serverseitige Plattformadmin-Prüfung. Ein neuer Mandant erhält zwingend `status=draft`; Aktivierung ist noch kein API-Befehl. Benutzer werden vor einer Mitgliedschaft über den zentralen serverseitigen Supabase-Admin-Client geprüft. Die Seite `/admin/tenants` nutzt die vorhandene Admin-Benutzersuche. Ein separater Tenant-Dienst braucht später einen eigenen Identitäts-Port statt direkter Auth-Client-Nutzung.

**Dev-Migration 2026-10-25:** Die drei ausstehenden Migrationen wurden auf der lokalen Docker-Dev-Datenbank angewandt. Ein privater Dump liegt temporär unter `/tmp/chrispyjams-dev-pre-tenant-20261025.dump`. Nachprüfung: 1 Crows-&-Owls-Tenant, 8/8 eigene Events, 0/0 Vorlagen, 3/3 Orte, 0/0 Overrides und 1/1 Liga-Saison zugeordnet; `prisma migrate status` aktuell. Keine Produktionsmigration.
