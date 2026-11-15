<template>
  <aside class="event-role-notice" aria-label="Hinweise zu Veranstalter und Anmeldung">
    <strong>Wer macht was?</strong>
    <p v-if="mode === 'external'">Dieser Termin stammt von einem externen Veranstalter. ChrispyJams zeigt die Eventdaten; die Anmeldung öffnet dessen externe Seite. Für Durchführung und mögliche Teilnahmegebühren ist der Veranstalter zuständig.</p>
    <p v-else>ChrispyJams nimmt die Online-Anmeldung und gegebenenfalls die Warteliste für dieses Event entgegen. Die Veranstaltung führt der jeweilige Veranstalter vor Ort durch. Eine mögliche Teilnahmegebühr wird ausschließlich vor Ort abgewickelt; ChrispyJams nimmt keine Zahlung entgegen.</p>
    <NuxtLink to="/datenschutz">Wie Anmeldedaten verarbeitet werden →</NuxtLink>
  </aside>
</template>
<script setup lang="ts">
defineProps<{ mode: "external" | "local" }>();
</script>
<style scoped>
.event-role-notice { padding: 1rem 1.1rem; border: 1px solid var(--app-border); border-left: 3px solid var(--app-accent); border-radius: .8rem; background: var(--app-surface-1); color: var(--app-text-secondary); font-size: .87rem; line-height: 1.55; }
.event-role-notice strong { color: var(--app-text-primary); font-weight: 800; }
.event-role-notice p { margin: .35rem 0 .5rem; }
.event-role-notice a { color: var(--app-accent); font-weight: 700; text-decoration: underline; }
</style>
