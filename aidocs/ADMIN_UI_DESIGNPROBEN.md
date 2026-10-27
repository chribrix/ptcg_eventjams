# Admin-UI: drei umschaltbare Richtungen

Stand: 27. Oktober 2026 · Arbeitsdokument auf `codex/chrispyjams-architecture-rework`. Die Dev-Vorschau liegt unter `/admin-style-preview` und enthält ausschließlich Beispieldaten. Dort bleiben drei Richtungen über eine einklappbare Leiste und Toast vergleichbar. Im echten Adminbereich ist **Atelier** festgelegt. Es erbt die Hell- und Dunkelpalette der globalen Kopfzeile aus `assets/css/tailwind.css`; die Admin-Aliase, Typografie und Sidebar-Regeln stehen in `assets/css/admin-workspace.css`. Die vier Hauptbereiche sind in einer Sidebar einklappbar, Unterseiten erscheinen darunter. Mobil öffnet ein „Bereiche“-Knopf dieselbe Navigation als Drawer.

## Baselines aus der Recherche

| Vorschlag | Bezug | Eigene Umsetzung | Eignung |
| --- | --- | --- | --- |
| **Atelier** | [Nuxt UI Dashboard Template](https://ui.nuxt.com/templates) und [responsive Sidebar/Drawer](https://ui.nuxt.com/docs/releases/v4.6.0) | Neutrale Hell-/Dunkelpalette, flache kompakte Flächen, verschachtelte Sidebar. | Gewählte Richtung für die tägliche Verwaltung. |
| **Signal** | [shadcn/vue Sidebar](https://www.shadcn-vue.com/docs/components/sidebar) und [Tabs](https://radix.shadcn-vue.com/docs/components/tabs) | Dunkle Konsole mit kräftigem Mint-Akzent und derselben Sidebar-Struktur. | Vergleichsprobe für Turnierbetrieb. |
| **Editorial** | [PrimeVue Tab Menu und Tastaturregeln](https://tailwind.primevue.org/tabs/) | Warme Papierpalette, Serifentitel und dünne Linien. | Vergleichsprobe für Inhaltsverwaltung. |

Die drei Vorschläge verwenden vorhandene Vue-/CSS-Bausteine; es wurde kein zusätzliches UI-Kit installiert. Die verlinkten Kits dienen als Interaktions- und Layout-Baseline. Der Designwechsel ist auf die lokale Dev-Vorschau begrenzt; Fachseiten und API-Verträge bleiben erhalten.

## Sichtung des Ausgangsbilds

Das alte Bild zeigt 12 gleichgewichtige Punkte in einer langen linken Leiste, während die obere globale Navigation ebenfalls „Admin“ anbietet. Der Inhaltsbereich beginnt mit einer großen Titelkarte, dann einer weiteren Übersichtskarte; der tatsächliche Arbeitsinhalt rutscht weit nach unten. Die Aktivitätsliste ist lang und nutzt wiederholte Emoji-Icons. Die neue Sidebar bündelt die Punkte in vier einklappbare Hauptbereiche. Flächen haben kleine Radien und engere Abstände; die Kennzahlen sind niedriger und zeigen dieselben API-Daten. Die Aktivitätsliste zeigt sechs Einträge und kann vollständig aufgeklappt werden. Die Eventhistorie bleibt über einen ausklappbaren Abschnitt erreichbar.

## Prüfpunkte

- Navigationsgruppen: Überblick, Veranstaltungen, Personen & Läden, System; Unterseiten bleiben echte Links mit aktuellem Seitenzustand. Hauptbereiche lassen sich einzeln ein- und ausklappen.
- Mobile Prüfung bei 375px und Standard-In-App-Viewport; Desktopprüfung bei 1440px. Der Drawer wurde geöffnet und „Veranstaltungen“ eingeklappt. Kennzahlen bleiben zweispaltig.
- Atelier in Hell und Dunkel visuell geprüft. Die Mandantenansicht verwendet dieselbe Hülle; ihre Schreiboperationen bleiben serverseitig autorisiert.
- Noch offen: Prüfung aller bestehenden Adminfachseiten mit echten Daten auf schmalem Gerät und Tastaturnavigation durch den gesamten Workspace. `vue-tsc` enthält weiterhin ältere repo-weite Fehler.

## Übernahme auf Unterseiten

Die Fachseiten behalten ihre bestehenden Datenflüsse und Bedienelemente. `assets/css/admin-shared.css` bündelt nun kompakte Karten, Tabellen, Formulare, Modale, Buttons und Statusmarken. `assets/css/admin-workspace.css` stellt die Admin-Aliase bereit und passt auch gemeinsam genutzte `AppPanel`-Komponenten innerhalb des Adminbereichs an; der öffentliche Teil der App verwendet seine bisherigen Styles.

Spezielle Oberflächen wurden dort angepasst, wo die gemeinsamen Regeln nicht ausreichen: Eventliste und Registrierung (`AdminEventsManager`), Eventdetails, externe Events, Turniersteuerung, Liga, Analyse, Tags, Banner sowie Benutzer, Spieler, Orte und Protokolle. Große Radien/Schatten und fest codierte helle Farben in diesen Bereichen wurden durch kompakte Abstände und Theme-Variablen ersetzt. Unterhalb von 1100 px nutzt die Eventliste im Desktop-Sidebarlayout eine Spalte.

Die Dev-Vorschau zeigt zusätzlich ein Unterseitenmuster mit denselben Formular-, Tabellen- und Statusklassen. Es enthält nur Beispieldaten. Die noch ausstehende Sichtprüfung mit echten, angemeldeten Daten bleibt ein Freigabeschritt für jede Fachseite; das Muster beweist nicht den vollständigen Inhalt jeder Fachseite.

Nach der Angleichung: `npm test` 398 bestanden/4 übersprungen, `npm run build` erfolgreich, `vue-tsc --noEmit` weiterhin 118 bestehende Fehler ohne neue Treffer in den bearbeiteten Adminseiten. Das Unterseitenmuster wurde in Atelier Hell/Dunkel und bei 375 px visuell geprüft.

## Nacharbeit vom 26. Oktober 2026: Ausrichtung und Schriftgrößen

Die Admin-Hülle setzt die Seitenaktion nun in dieselbe Zeile wie den Seitentitel; der Untertitel steht geschlossen darunter. Die Schriftgrößen für Seitentitel, Abschnittstitel, Eyebrows und Begleittexte sind in `assets/css/admin-workspace.css` zentral festgelegt. Die Dashboard-Abschnitte und die Eventhistorie verwenden diese Skala. Alle vier Kennzahlen haben dieselben Zeilen für Beschriftung, Wert und Aktion; insbesondere beginnt „Historie öffnen“ auf derselben Achse wie die anderen Links. Die Datenabfrage und Zielrouten bleiben unverändert.

`npm run build` ist erfolgreich. Die Dev-Vorschau auf Port 3000 wurde nach einem Nuxt-Neustart im dunklen Atelier-Modus geprüft. Die echte Admin-Übersicht benötigt weiterhin eine angemeldete Sitzung; die Sichtprüfung ihrer Live-Daten steht daher noch aus.

## Navigation vom 26. Oktober 2026

Die doppelte Workspace-Leiste vor der Adminseite ist entfernt. „Administration“ steht als Abschnittsname direkt in der globalen Kopfzeile; auf schmalen Displays bleibt dafür das Logo sichtbar und der lange Markenname entfällt. Die Sidebar beginnt unmittelbar mit den einklappbaren Gruppen, ohne „Bereiche“-Überschrift. Sie ist am Desktop 260 px breit und hat größere Schrift und Ziele. Der mobile Drawer öffnet über „Bereiche“ in der Titelzeile der Adminseite. Die Navigationsziele und Gruppenlogik bleiben erhalten.

Die Desktop-Vorschau wurde im dunklen Atelier-Modus auf Port 3000 geprüft. `npm run build` war erfolgreich; anschließend wurde der Dev-Server auf Port 3000 neu gestartet und die Vorschau erneut geladen.

## Farbpalette vom 27. Oktober 2026

Atelier überschreibt die globalen `--app-*`-Farben nicht mehr. Admin-Hintergrund, Karten, Sidebar, Text, Linien, Akzente und Buttons verwenden damit in beiden Themes exakt die bereits für die globale Kopfzeile definierten Tokens. Aktiv-/Entwurfsstatus nutzen die globalen Badge-Farben. Signal und Editorial behalten nur auf der Dev-Vergleichsseite eigene Paletten. Die Vorschau wurde in Hell und Dunkel visuell geprüft. `npm run build` war erfolgreich; der Dev-Server auf Port 3000 wurde danach neu gestartet.

## Kopfzeile als Button- und Schriftmaßstab

Die bestehende globale Kopfzeile bleibt gestalterisch unverändert. Ihre Aktionsbuttons sind der Maßstab für Admin-Aktionen: 0,875 rem Schriftgröße, 0,5 rem Eckenradius, die vorhandenen `--app-button-*`-Farben, der weiche Schatten und für primäre Aktionen derselbe blau-grüne Verlauf. Sekundäre Aktionen verwenden die Oberflächen- und Rahmenfarben der App. Die Admin-Typografie und Kontrollhöhen stehen zentral in `assets/css/admin-workspace.css`; die gemeinsamen `.btn`-Regeln stehen in `assets/css/admin-shared.css`. Karten und Panels behalten ihre kompakteren Radien und Abstände. Die Dev-Vorschau zeigt einen primären und sekundären Beispielbutton zur direkten Gegenüberstellung mit der Kopfzeile. Hell und Dunkel wurden visuell geprüft.

## Lesbarkeit und exakte Buttonhöhe

Bei der Sichtprüfung war die Adminseite trotz gleicher nomineller Button-Schrift kleiner als die Kopfzeile. Der Grund: Admin-Buttons hatten 17,5 px Zeilenhöhe und waren insgesamt 36 px hoch, die Header-Buttons hatten 21 px Zeilenhöhe und 39 px Höhe. Die zentralen Admin-Buttons haben nun ebenfalls 14 px Schrift, 21 px Zeilenhöhe, 8 px vertikales Padding und 39 px Gesamthöhe; kleine Varianten verwenden dieselbe Mindestgröße. Die normale Admin-Schrift steigt auf 16 px, Begleittext auf 14 px, Abschnittstitel auf 22 px und die Desktop-Sidebar erhält 16-px-Links mit 44-px-Zielen. Die Dashboard-Kennzahlen und die Vorschau verwenden diese Skala. Bei schmaleren Desktopbreiten wechseln die Vorschau-Kennzahlen auf zwei Spalten, damit Beschriftungen Platz haben. Der globale Header wurde nicht geändert.

## Analytics-Diagramm

Die frühere gemeinsame Farbregel für Linie und Punkt setzte auf der Aufruflinie versehentlich eine Füllung und erzeugte das große türkise Dreieck. Die verbleibende Reihe für aktive Besucher ist eine offene SVG-Linie (`fill: none`). Der Fokuspunkt wird als kreisförmiges HTML-Overlay gezeichnet, damit er bei responsiv gestrecktem SVG nicht oval wird. Maus und Touch wählen den nächstliegenden Kalendertag; ein Tooltip zeigt Datum und aktive Besucher. Per Tab und Pfeiltasten, Home/End lässt sich derselbe Tageswert mit dynamischer Beschriftung erreichen. Die Ein-Tages-Ansicht zeigt den Punkt auch ohne Hover.

## Analytics-Metrik: aktive Besucher

Die Hauptkennzahl und die Diagrammreihe zeigen nun ausschließlich anonyme Besucher mit mindestens einem echten Klick oder einer gezielten Aktion pro Berliner Kalendertag. Passive Seitenaufrufe bleiben technisch erfasst, erscheinen aber nicht als Hauptmetrik. Die Seitenrangliste verwendet unterschiedliche aktive Besucher je Pfad. Registrierungen und Warteliste bleiben als ergänzende Kennzahlen; die Aktionsliste zeigt nur gezielte Fachaktionen. Frühere Tage enthalten nur damals erfasste gezielte Aktionen, weil allgemeine Klicks erst ab dieser Änderung erfasst werden. Die Definition steht im Analytics-Service-README.

## Gezielte Analytics-Kennzahlen vom 27. Oktober 2026

Die vier Karten neben „Aktive Besucher“ zeigen jetzt einzelne Klicks auf den Startseitenkalender, erfolgreiche Logins sowie Aufrufe von `/dashboard` und `/eventlist`. Alle Zahlen verwenden denselben Zeitraum (standardmäßig „Heute“). Die Registrierungs- und Wartelistenwerte bleiben im API und in „Gezielte Aktionen“ verfügbar. Kalenderklick und Login sind eigene Ereignistypen; Dashboard und Eventliste verwenden die bereits erfassten Seitenaufrufe. Definition, Datenhoheit und Migration stehen im Analytics-Service-README. Die neue Datenbank-Constraint wurde in der lokalen Dev-Datenbank angewendet. Im Dev-Browser wurde ein Kalender-Monatswechsel durchgeführt und sein Ereignis in der Datenbank nachgewiesen; auch ein Eventlisten-Aufruf wurde verifiziert. Ein erfolgreicher Login konnte ohne Testkonto nicht interaktiv geprüft werden.
