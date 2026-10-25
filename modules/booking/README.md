# Buchung & Warteliste — Planungs-README

**Zweck:** Registrierungen, mehrere Tickets je Buchung, Kapazität, Stornierung und Wartelisten-Nachrücken verwalten. Dieses Modul besitzt Teilnahmezustände, nicht Decklisteninhalt oder Kalenderpublikation.

**Heute:** `EventRegistration`, `RegistrationTicket`, `WaitlistEntry`; Anmeldung in `server/api/events/[id]/register.post.ts`, Bearbeitung in `server/api/bookings`, Wartelistenlogik in `server/services/events/waitlistService.ts`. Eigene und extern verknüpfte Events werden unterstützt.

**Daten:** Registrierung, Ticket, Wartelisteneintrag, Platzanspruch und Statusübergang. Event-ID und Tenant-ID sind Referenzen auf Katalog/Mandantenmodul. Decklistenstatus wird abgefragt, nicht als Ticketstatus-Ersatz definiert.

**Geplanter öffentlicher Vertrag:** `register`, `addTicket`, `updateTicket`, `cancel`, `joinWaitlist`, `claimOffer`, `getBooking`, `getCapacity`; Ereignisse `RegistrationChanged`, `TicketChanged`, `CapacityChanged`. Schreibbefehle erhalten Idempotenzschlüssel; konkurrierende Kapazitätsentscheidungen werden atomar getroffen.

**Interaktion:** Identität liefert Actor, Tenant-Modul Berechtigung, Katalog Eventregeln und Fristen. Der erste gemeinsame [`EventRef`-Vertrag](../../contracts/README.md) unterscheidet eigene und externe Event-IDs bereits in den quellgebundenen Wartelistenaktionen. Decklistenmodul referenziert `ticketId`; Turnier erhält Teilnehmerzuordnung über expliziten Vertrag. Kein fremdes Modul ändert Buchungsstatus direkt.

**Betrieb und Nachweis:** Lokal oder remote; bei Netzfehler wird eine wiederholte Registrierung nicht doppelt angelegt. Outbox/Inbox oder gleichwertige garantierte Zustellung für Statusereignisse; Benachrichtigung kann asynchron sein. Tests für Konkurrenz, Kapazität, Fristen, Mehrticket-Buchung, externe Events und Wartelisten-Claim; alte Routen bleiben während Migration erhalten.
