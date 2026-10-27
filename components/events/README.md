# Öffentliche Eventdarstellung

`EventGameWatermark.vue` zeigt in öffentlichen Eventkarten ein dekoratives Logo für Pokémon TCG, VGC oder GO. Die Komponente erwartet den bereits fachlich bestimmten `PokemonGameType` aus `types/eventGame.ts`; unbekannte bzw. andere Spiele erhalten kein Wasserzeichen. Sie verändert keine Eventdaten und hat keine eigene API oder Berechtigung.

Die sechs SVGs liegen in `assets/images/`. `assets/css/event-game-watermark.css` steuert Größe, Deckkraft und Position zentral: rechts auf breiten Ansichten, mittig unter 640 px. Das Theme auf `html[data-theme]` wählt die schwarze Variante im hellen und die weiße Variante im dunklen Modus. Beide Bilder sind dekorativ (`alt=""`, `aria-hidden`) und blockieren keine Klicks. Nutzer der Komponente sind der Startseitenkalender-Popover und die Eventliste. Fachliche Typzuordnung bleibt in `types/eventGame.ts` bzw. der bestehenden Eventnormalisierung; das Wasserzeichen ist nur Präsentation.

Die Komponente läuft im gemeinsamen Nuxt-Deployment und benötigt keinen eigenen Dienst. Bei getrennter Bereitstellung der Eventansicht muss der `gameType` im Lesevertrag verfügbar bleiben. Build und Sichtprüfung beider Themes sowie einer 390-px-Ansicht sind die Prüfbasis.
