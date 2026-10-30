# Mandanten — Planungs-README

**Zweck:** Läden/Betreiber, ihre Orte, Einstellungen und Mitarbeiterrechte verwalten. Ein Mandant ist eine Berechtigungs- und Datengrenze; ein Ort oder Freitext-`venue` ist keine Grenze.

**Heute:** Die additive Migration `20261024230000_add_tenant_foundation` legt `Tenant` und `TenantMembership` an und ordnet bestehende eigene Events, Vorlagen, Orte, Overrides und Liga-Saisons Crows & Owls zu. `server/services/tenants/tenantService.ts` prüft serverseitig die Rollenmatrix. Die bisherigen Routen sind noch nicht durchgängig auf Tenant-Scope umgestellt; ein zweiter Laden bleibt bis dahin gesperrt.
Die Plattformadmin-UI kann weitere Läden als **Entwurf** anlegen, umbenennen und Mitgliedschaften vorbereiten. Eine Aktivierungsaktion gibt es noch nicht.

**Daten:** `Tenant`, `TenantMembership`, `Venue`, Tenant-Konfiguration. Andere Module speichern oder referenzieren `tenantId`, besitzen aber diese Stammdaten nicht.

**Geplanter öffentlicher Vertrag:** `getTenant`, `listActorTenants`, `requireTenantPermission(actor, tenantId, action)`, `resolveTenantForResource(ref)`. Befehle für Membership und Ort sind idempotent und auditierbar. Fehler: `TENANT_NOT_FOUND`, `TENANT_FORBIDDEN`, `TENANT_SUSPENDED`.

**Interaktion:** Identität liefert verifizierten Actor; alle schreibenden Fachmodule prüfen den Tenant. Katalog besitzt Events mit `tenantId`, Buchung/Turnier/Decklisten leiten Scope aus ihrem Objekt ab und prüfen ihn erneut. Plattformadmin ist ein eigener expliziter Pfad.

**Betrieb und Nachweis:** Lokal und remote derselbe Port; remote mit kurzlebigem signiertem Actor-Kontext, nie mit vom Client behaupteter Membership. Backfill für Crows & Owls vor dem zweiten Laden. Tests mit zwei Tenants, gleichen Event-/Ortsnamen und Cross-Tenant-Zugriffsversuchen; Health, Audit und Cache-Invalidierung für Membership-Änderungen dokumentieren.

**Zwischenstand:** `prisma validate`, `prisma generate` und `tests/unit/tenantService.test.ts` sind grün. Die additive Migration wurde auf Dev und am 30. Oktober 2026 auf Produktion mit Bestandsdaten angewandt; tenantbezogene API-Abfragen und die getrennte Bereitstellung stehen aus.

**Rollout-Sperre:** Die additive Migration setzt für bestehende Schreibpfade vorübergehend `crows-and-owls` als Default. Alte globale Eindeutigkeiten für Orte, externe Overrides und Saison-Slugs gelten ebenfalls noch. Vor dem zweiten Tenant müssen neue Objekte ihre `tenantId` ausdrücklich aus dem serverseitig geprüften Kontext erhalten, alle Listen/Mutationen Scope prüfen und die Eindeutigkeiten tenantbezogen migriert werden.
