# Decklisten — Planungs-README

**Zweck:** Decklisten je Ticket einreichen, versionieren, validieren und prüfen. „Vor Ort mitbringen“ ist eine separate Erfüllungsoption. Die Modulgrenze wird vor der ersten breiten Inbetriebnahme stabilisiert.

**Heute:** Decktext und Vor-Ort-Flag liegen in `RegistrationTicket`; `requiresDecklist` in Event/Override. `server/api/dashboard/decklist.put.ts` ändert zusätzlich Ticketstatus. Validator, Kartenrepository und Importer sind vorhanden. P0 hat Decktext-Ausgabe und Debugdatei aus Validate-Endpunkt/Validator entfernt; der eigene Einreichungszustand fehlt weiterhin.

**Daten:** Ticket-/Tenant-Referenz, verschlüsselungs-/zugriffsgeschützte Einreichung, Format, Version, Prüfergebnis, Freigabe- und Friststatus. Kartenkatalog/Validator sind interne Adapter; Buchung besitzt weiterhin den Ticket-Teilnahmestatus.

**Geplanter öffentlicher Vertrag:** `submitDecklist`, `replaceDecklist`, `chooseOnsite`, `validateDecklist`, `getDecklistStatus`, `reviewDecklist`; Ereignis `DecklistStatusChanged`. Externe Antworten geben Inhalt nur an berechtigte Spieler/Veranstalter zurück; Statusabfragen liefern keinen Decktext.

**Interaktion:** Katalog liefert Eventregel/Frist, Buchung bestätigt Ticketbesitz, Tenant-Modul prüft Veranstalterzugriff, Turnier darf einen dokumentierten Zulassungsstatus abfragen. Keine direkte Statusmutation an Buchungstabellen.

**Betrieb und Nachweis:** Lokal oder remote über denselben Port. Keine Decktexte, Tokens oder Request-Bodies in Logs, Traces, Debugdateien oder Fehlerantworten. Migration bewahrt vorhandene Texte und Flags; Tests für Eigentum, Tenant-Isolation, Frist, Format, Versionierung und Statusparität. Provider-/Kartendaten-Ausfall hat einen expliziten Validierungszustand.
