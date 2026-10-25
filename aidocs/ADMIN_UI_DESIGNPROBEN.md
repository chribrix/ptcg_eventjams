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
