# Kalender & Eventkatalog — Planungs-README

**Zweck:** Eigene Events veröffentlichen, externe Quellen importieren, Quellen verknüpfen, Vorlagen verwalten und eine einheitliche Kalenderprojektion liefern. Der Katalog nimmt keine Buchungen an und führt kein Turnier durch.

**Heute:** `CustomEvent`, `EventTemplate`, `ExternalEventOverride`; pokedata-Adapter in `server/services/events/pokedataService.ts`; Feeds in `server/api/events*`; Zusammenführung teils im Client. Crows-&-Owls-Sichtbarkeit ist in `utils/externalEventVisibility.ts` hartcodiert.

**Daten:** Event/Publikationsstatus, externe Provider-ID, Quelle, Tenant-Zuordnung, Venue-Referenz, Eventvorlagen, Verknüpfung und Sichtbarkeit. Provider-Rohdaten sind austauschbare Importdaten.

**Geplanter öffentlicher Vertrag:** `listCalendarEvents(query)`, `getEvent(ref)`, `createOwnedEvent`, `updateOwnedEvent`, `linkExternalEvent`, `setVisibility`; Ereignisse `EventPublished`, `EventChanged`, `EventCancelled`. DTOs enthalten `source`, `tenantId?`, `registrationMode` und Fähigkeiten. Bestehende `/api/events*`-Antworten bleiben bis zur getesteten Migration als kompatible Fassade.

**Interaktion:** Tenant-Modul prüft Eigentum und Mitarbeiterrecht; Buchung liefert Belegungsprojektion, Turnier optionalen Anzeigezustand. Ein externer Feed-Eintrag darf mehreren Tenants sichtbar sein, ohne dass sie fremde Daten übernehmen. Kein direkter Zugriff auf Buchungs-/Turniertabellen.

**Betrieb und Nachweis:** Lokal oder remote über denselben Port; pokedata-Adapter kann später als separater Worker laufen. Cache-Frische/Invalidierung, Provider-Ausfall und Deduplizierung pro Tenant sind dokumentierte Zustände. Golden-Fixtures für externe/eigene Events, Zeitzonen, Tags, Sichtbarkeit und bisherige Links; UI-Parität Desktop/Mobil.

**Admin-Eventansicht:** `/admin/events` zeigt dieselben Eventdaten wie zuvor im Details-Modal direkt auf Karten: Status, Tags, Datum, Ort, Belegung, optionale Gebühr, Decklistenpflicht und Beschreibung. Die Karte enthält die Verwaltungsaktionen und ein Icon zum Kopieren der Registrierungs-URL. Registrierungs-, Bearbeitungs- und Erstellungsdialoge bleiben bestehen. Datenquelle und Adminberechtigung ändern sich dabei nicht. Die Kartenansicht wird in `tests/unit/adminEventManagementCard.test.ts` geprüft; authentifizierte Sichtprüfung auf Desktop und Mobil steht aus.
