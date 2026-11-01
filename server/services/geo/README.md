# Postleitzahl-Lookup

**Zweck und Daten:** `postcodeService.ts` löst eine validierte Postleitzahl aus DE/AT/CH über Zippopotam.us in einen Ortsmittelpunkt mit Koordinaten auf. Der Service besitzt keine Nutzerprofile, Standortfreigaben oder Präferenzen. Antworten werden je Land/PLZ 30 Tage im Nitro-Cache gehalten; unbekannte PLZ ebenfalls.

**Öffentlicher Vertrag:** `parsePostcodeLookup(country, postcode)`, `lookupPostcode(country, postcode)`; HTTP-Adapter `GET /api/locations/postcode?country=DE&postcode=84028`. 400 bei ungültiger Eingabe, 404 bei unbekannter PLZ, 503 bei Providerausfall. Keine Authentisierung und kein Tenant-Scope, da ausschließlich öffentliche PLZ-Ortsdaten gelesen werden. Das Eventmodul konsumiert den Ortsmittelpunkt nur clientseitig als Suchpräferenz über seinen bestehenden Suchvertrag. Kein Zugriff auf private Eventtabellen.

**Betrieb und Nachweis:** Im gemeinsamen Deployment ist Nitro-Storage der Cache; für getrennten oder mehrfachen Betrieb wird ein gemeinsamer Treiber benötigt. `tests/unit/postcodeService.test.ts` prüft Validierung, Antwortabbildung und Cache. Der Ortsmittelpunkt ist eine Näherung, keine exakte Adresse.
