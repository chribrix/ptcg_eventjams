<template>
  <section class="admin-card tm-selector-panel">
    <div class="tm-header"><h2>Turniere</h2></div>
    <input :value="search" class="tm-input" type="search" placeholder="Turnier oder Ort suchen" aria-label="Turnier suchen" @input="$emit('update:search', ($event.target as HTMLInputElement).value)" />
    <p v-if="loading" class="tm-state">Turniere werden geladen …</p>
    <p v-else-if="error" class="tm-error">{{ error }}</p>
    <template v-else>
      <div v-for="group in groups" :key="group.key" class="tm-event-group">
        <h3>{{ group.label }} ({{ group.events.length }})</h3>
        <div v-if="group.events.length" class="tm-event-list">
          <button
            v-for="entry in group.events" :key="entry.id" type="button"
            class="tm-event-choice" :class="{ active: selectedEventId === entry.id }"
            :aria-current="selectedEventId === entry.id ? 'true' : undefined"
            @click="$emit('select', entry.id)"
          >
            <strong>{{ entry.name }}</strong>
            <span>{{ entry.venue }} · {{ formatDate(entry.eventDate) }}</span>
          </button>
        </div>
        <p v-else class="tm-meta">Keine Turniere in dieser Gruppe.</p>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
type TournamentEntry = { id: string; name: string; venue: string; eventDate: string; ended: boolean };
const props = defineProps<{
  events: TournamentEntry[];
  selectedEventId: string | null;
  search: string;
  loading?: boolean;
  error?: string | null;
}>();
defineEmits<{ 'update:search': [value: string]; select: [eventId: string] }>();
const filteredEvents = computed(() => {
  const query = props.search.trim().toLowerCase();
  return query ? props.events.filter((entry) => `${entry.name} ${entry.venue}`.toLowerCase().includes(query)) : props.events;
});
const groups = computed(() => [
  { key: "ongoing", label: "Laufende Turniere", events: filteredEvents.value.filter((entry) => !entry.ended) },
  { key: "ended", label: "Beendete Turniere", events: filteredEvents.value.filter((entry) => entry.ended) },
]);
const formatDate = (value: string) => new Date(value).toLocaleString("de-DE", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
</script>

<style scoped>
@import "~/assets/css/admin-shared.css";
.tm-event-group { margin-top: 0.8rem; }
.tm-event-group h3 { margin: 0 0 0.45rem; font-size: 1rem; color: var(--app-text-primary); }
.tm-event-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.5rem; }
.tm-event-choice { display: grid; gap: 0.25rem; text-align: left; border: 1px solid var(--app-border); border-radius: 5px; padding: 0.65rem; background: var(--app-surface-1); color: var(--app-text-primary); cursor: pointer; }
.tm-event-choice span { color: var(--app-text-muted); font-size: 0.85rem; }
.tm-event-choice:hover, .tm-event-choice.active { border-color: var(--app-accent); background: var(--app-badge-info-bg); }
.tm-input { width: 100%; border: 1px solid var(--app-border); border-radius: 4px; padding: 0.5rem 0.65rem; font-size: 0.9rem; background: var(--app-surface-1); color: var(--app-text-primary); }
.tm-input:focus { outline: none; border-color: var(--app-accent); box-shadow: 0 0 0 3px var(--app-focus-ring); }
.tm-state { color: var(--app-text-muted); padding: 1rem 0; }
.tm-error { background: var(--app-feedback-error-bg); color: var(--app-feedback-error-text); padding: 0.65rem; border-radius: 4px; border: 1px solid var(--app-feedback-error-border); }
.tm-meta { margin: 0 0 0.6rem; color: var(--app-text-muted); font-size: 0.85rem; }
</style>
