# Admin-UI: drei umschaltbare Richtungen

Stand: 25. Oktober 2026 · Arbeitsdokument auf `codex/chrispyjams-architecture-rework`. Die Dev-Vorschau liegt unter `/admin-style-preview` und enthält ausschließlich Beispieldaten. Dort bleiben drei Richtungen über eine einklappbare Leiste und Toast vergleichbar. Im echten Adminbereich ist **Atelier** festgelegt. Seine Hell- und Dunkelpalette folgt dem bestehenden `html[data-theme]`-Mechanismus; alle Admin-Farbtokens und die Sidebar-Regeln stehen zentral in `assets/css/admin-workspace.css`, geladen über `assets/css/tailwind.css`. Die vier Hauptbereiche sind in einer Sidebar einklappbar, Unterseiten erscheinen darunter. Mobil öffnet ein „Bereiche“-Knopf dieselbe Navigation als Drawer.

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

Die Fachseiten behalten ihre bestehenden Datenflüsse und Bedienelemente. `assets/css/admin-shared.css` bündelt nun kompakte Karten, Tabellen, Formulare, Modale, Buttons und Statusmarken. `assets/css/admin-workspace.css` stellt die Atelier-Tokens bereit und passt auch gemeinsam genutzte `AppPanel`-Komponenten innerhalb des Adminbereichs an; der öffentliche Teil der App verwendet seine bisherigen Styles.

Spezielle Oberflächen wurden dort angepasst, wo die gemeinsamen Regeln nicht ausreichen: Eventliste und Registrierung (`AdminEventsManager`), Eventdetails, externe Events, Turniersteuerung, Liga, Analyse, Tags, Banner sowie Benutzer, Spieler, Orte und Protokolle. Große Radien/Schatten und fest codierte helle Farben in diesen Bereichen wurden durch kompakte Abstände und Theme-Variablen ersetzt. Unterhalb von 1100 px nutzt die Eventliste im Desktop-Sidebarlayout eine Spalte.

Die Dev-Vorschau zeigt zusätzlich ein Unterseitenmuster mit denselben Formular-, Tabellen- und Statusklassen. Es enthält nur Beispieldaten. Die noch ausstehende Sichtprüfung mit echten, angemeldeten Daten bleibt ein Freigabeschritt für jede Fachseite; das Muster beweist nicht den vollständigen Inhalt jeder Fachseite.

Nach der Angleichung: `npm test` 398 bestanden/4 übersprungen, `npm run build` erfolgreich, `vue-tsc --noEmit` weiterhin 118 bestehende Fehler ohne neue Treffer in den bearbeiteten Adminseiten. Das Unterseitenmuster wurde in Atelier Hell/Dunkel und bei 375 px visuell geprüft.

## Nacharbeit vom 26. Oktober 2026: Ausrichtung und Schriftgrößen

Die Admin-Hülle setzt die Seitenaktion nun in dieselbe Zeile wie den Seitentitel; der Untertitel steht geschlossen darunter. Die Schriftgrößen für Seitentitel, Abschnittstitel, Eyebrows und Begleittexte sind in `assets/css/admin-workspace.css` zentral festgelegt. Die Dashboard-Abschnitte und die Eventhistorie verwenden diese Skala. Alle vier Kennzahlen haben dieselben Zeilen für Beschriftung, Wert und Aktion; insbesondere beginnt „Historie öffnen“ auf derselben Achse wie die anderen Links. Die Datenabfrage und Zielrouten bleiben unverändert.

`npm run build` ist erfolgreich. Die Dev-Vorschau auf Port 3000 wurde nach einem Nuxt-Neustart im dunklen Atelier-Modus geprüft. Die echte Admin-Übersicht benötigt weiterhin eine angemeldete Sitzung; die Sichtprüfung ihrer Live-Daten steht daher noch aus.

## Navigation vom 26. Oktober 2026

Die doppelte Workspace-Leiste vor der Adminseite ist entfernt. „Administration“ steht als Abschnittsname direkt in der globalen Kopfzeile; auf schmalen Displays bleibt dafür das Logo sichtbar und der lange Markenname entfällt. Die Sidebar beginnt unmittelbar mit den einklappbaren Gruppen, ohne „Bereiche“-Überschrift. Sie ist am Desktop 260 px breit und hat größere Schrift und Ziele. Der mobile Drawer öffnet über „Bereiche“ in der Titelzeile der Adminseite. Die Navigationsziele und Gruppenlogik bleiben erhalten.

Die Desktop-Vorschau wurde im dunklen Atelier-Modus auf Port 3000 geprüft. `npm run build` war erfolgreich; anschließend wurde der Dev-Server auf Port 3000 neu gestartet und die Vorschau erneut geladen.
