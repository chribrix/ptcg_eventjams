# Mandanten — Planungs-README

**Zweck:** Läden/Betreiber, ihre Orte, Einstellungen und Mitarbeiterrechte verwalten. Ein Mandant ist eine Berechtigungs- und Datengrenze; ein Ort oder Freitext-`venue` ist keine Grenze.

**Heute:** Es gibt keine `Tenant`-Tabelle. `VenueDirectoryEntry` speichert Organisations-/Ortsnamen, Adminrolle ist global. Crows & Owls ist fachlich der erste Tenant, aber noch nicht als solcher modelliert.

**Daten:** `Tenant`, `TenantMembership`, `Venue`, Tenant-Konfiguration. Andere Module speichern oder referenzieren `tenantId`, besitzen aber diese Stammdaten nicht.

**Geplanter öffentlicher Vertrag:** `getTenant`, `listActorTenants`, `requireTenantPermission(actor, tenantId, action)`, `resolveTenantForResource(ref)`. Befehle für Membership und Ort sind idempotent und auditierbar. Fehler: `TENANT_NOT_FOUND`, `TENANT_FORBIDDEN`, `TENANT_SUSPENDED`.

**Interaktion:** Identität liefert verifizierten Actor; alle schreibenden Fachmodule prüfen den Tenant. Katalog besitzt Events mit `tenantId`, Buchung/Turnier/Decklisten leiten Scope aus ihrem Objekt ab und prüfen ihn erneut. Plattformadmin ist ein eigener expliziter Pfad.

**Betrieb und Nachweis:** Lokal und remote derselbe Port; remote mit kurzlebigem signiertem Actor-Kontext, nie mit vom Client behaupteter Membership. Backfill für Crows & Owls vor dem zweiten Laden. Tests mit zwei Tenants, gleichen Event-/Ortsnamen und Cross-Tenant-Zugriffsversuchen; Health, Audit und Cache-Invalidierung für Membership-Änderungen dokumentieren.
