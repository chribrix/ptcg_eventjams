# Kalender & Eventkatalog — Planungs-README

**Zweck:** Eigene Events veröffentlichen, externe Quellen importieren, Quellen verknüpfen, Vorlagen verwalten und eine einheitliche Kalenderprojektion liefern. Der Katalog nimmt keine Buchungen an und führt kein Turnier durch.

**Heute:** `CustomEvent`, `EventTemplate`, `ExternalEventOverride`; pokedata-Adapter in `server/services/events/pokedataService.ts`; Feeds in `server/api/events*`; Zusammenführung teils im Client. Crows-&-Owls-Sichtbarkeit ist in `utils/externalEventVisibility.ts` hartcodiert.

**Daten:** Event/Publikationsstatus, externe Provider-ID, Quelle, Tenant-Zuordnung, Venue-Referenz, Eventvorlagen, Verknüpfung und Sichtbarkeit. Provider-Rohdaten sind austauschbare Importdaten.

**Geplanter öffentlicher Vertrag:** `listCalendarEvents(query)`, `getEvent(ref)`, `createOwnedEvent`, `updateOwnedEvent`, `linkExternalEvent`, `setVisibility`; Ereignisse `EventPublished`, `EventChanged`, `EventCancelled`. DTOs enthalten `source`, `tenantId?`, `registrationMode` und Fähigkeiten. Bestehende `/api/events*`-Antworten bleiben bis zur getesteten Migration als kompatible Fassade.

**Interaktion:** Tenant-Modul prüft Eigentum und Mitarbeiterrecht; Buchung liefert Belegungsprojektion, Turnier optionalen Anzeigezustand. Ein externer Feed-Eintrag darf mehreren Tenants sichtbar sein, ohne dass sie fremde Daten übernehmen. Kein direkter Zugriff auf Buchungs-/Turniertabellen.

**Betrieb und Nachweis:** Lokal oder remote über denselben Port; pokedata-Adapter kann später als separater Worker laufen. Cache-Frische/Invalidierung, Provider-Ausfall und Deduplizierung pro Tenant sind dokumentierte Zustände. Golden-Fixtures für externe/eigene Events, Zeitzonen, Tags, Sichtbarkeit und bisherige Links; UI-Parität Desktop/Mobil.

**Admin-Eventansicht:** `/admin/events` zeigt dieselben Eventdaten wie zuvor im Details-Modal direkt auf Karten: Status, Tags, Datum, Ort, Belegung, optionale Gebühr, Decklistenpflicht und Beschreibung. Die Karte enthält die Verwaltungsaktionen und ein Icon zum Kopieren der Registrierungs-URL. Registrierungs-, Bearbeitungs- und Erstellungsdialoge bleiben bestehen. Datenquelle und Adminberechtigung ändern sich dabei nicht. Die Kartenansicht wird in `tests/unit/adminEventManagementCard.test.ts` geprüft; authentifizierte Sichtprüfung auf Desktop und Mobil steht aus.

**Öffentliche Kalenderansicht (31.10.2026):** Die Startseite nutzt weiterhin die bestehende Eventzusammenführung, Filter und Details; zuvor startete sie mit einem 29-Tage-Bereich in einer festen 42-Zellen-Monatsmatrix und die Pfeile schalteten auf Monatsansicht. Jetzt liefert `utils/rollingCalendarWindow.ts` genau 28 aktive Kalendertage ab dem Anker und ergänzt nur die nötigen Randtage für Montag-bis-Sonntag-Zeilen. Die Pfeile verschieben den Anker um 28 Tage, „Heute anzeigen“ setzt ihn zurück. Der Kopf nennt die betroffenen Monate; die Woche wird am Monatswechsel geteilt, damit der 1. unter der Monatsüberschrift und in der korrekten Wochentagsspalte steht. Eventdaten und API-Verträge sind unverändert. `tests/unit/rollingCalendarWindow.test.ts` prüft Monats-/Jahreswechsel und Sommerzeit; `/calendar-preview` zeigt im Dev-Modus eine Fixture vom 31.10.2026.

**Kategorien, 31.10.2026:** Die Startseitenfilter zeigen Cups, Challenges, eigene Events unter dem Namen des aktuell einzigen Tenants „Crows & Owls“ und Prereleases. Der Riftbound-Filter wurde aus der Oberfläche entfernt; Riftbound-Termine bleiben im Kalender sichtbar. Die Einstufung und Sichtbarkeit liegt in `utils/calendarEventUtils.ts` und wird in `tests/unit/calendarEventUtils.test.ts` geprüft. Falls mehrere aktive Tenants öffentlich auswählbar werden, muss der angezeigte Name aus der Katalogprojektion statt aus der aktuellen DE/EN-Beschriftung kommen.

**Kalenderkopf:** Er zeigt die betroffenen Monate; die redundante Datums-/Vierwochen-Unterzeile wurde entfernt. Die Navigationsschritte und der Zeitraum bleiben unverändert.
