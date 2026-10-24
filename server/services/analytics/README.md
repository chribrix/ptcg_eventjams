# Analytics-Service (heutige Codegrenze)

`analyticsService.ts` erfasst zugelassene First-Party-Ereignisse und berechnet aggregierte Ansichten. Er filtert API-/Adminpfade und bekannte automatisierte Clients. Der Besucherbezug ist ein täglich rotierender HMAC-Hash, kein gespeicherter Roh-IP-Wert.

**Daten und Interaktion:** Eigentümer ist `AnalyticsEvent`. Öffentliche Trackingroute und Adminauswertung nutzen diesen Service. Tenant-Zuordnung existiert noch nicht; bei Mandantenansichten sind Scope und Aufbewahrung gesondert festzulegen. `SUPABASE_SERVICE_ROLE_KEY` wird nicht als Hash-Salt verwendet. In Produktion braucht der Hash `ANALYTICS_SALT` oder die vorhandene `NUXT_SESSION_PASSWORD`-Konfiguration; ohne beide wird nicht erfasst.

**Betrieb und Nachweis:** Heute mit Nitro deployt. Bei separatem Betrieb braucht der Dienst einen versionierten Tracking-/Auswertungsvertrag, eigene Datenhoheit, Ausfallverhalten und Tenant-Scope. `tests/unit/analyticsService.test.ts` prüft Pfadnormalisierung; Erfassungs- und Ausfalltests sind noch zu ergänzen.
