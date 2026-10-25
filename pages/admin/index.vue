<template>
  <AdminPageLayout
    title="Übersicht"
    :subtitle="`Willkommen zurück${displayName ? `, ${displayName}` : ''}. Hier ist der aktuelle Stand deiner Veranstaltungen.`"
  >
    <template #actions>
      <NuxtLink class="dashboard-action" to="/admin/events">Events verwalten <span aria-hidden="true">↗</span></NuxtLink>
    </template>

    <section aria-labelledby="dashboard-numbers-title">
      <div class="section-heading">
        <div><p class="section-eyebrow">Auf einen Blick</p><h2 id="dashboard-numbers-title">Kennzahlen</h2></div>
        <span class="section-hint">Alle Zeiten lokal</span>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <CalendarDaysIcon class="stat-icon" aria-hidden="true" />
          <span>Eigene Events</span>
          <strong>{{ statsLoading ? "–" : stats.customEvents }}</strong>
          <NuxtLink to="/admin/events">Events ansehen <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div class="stat-card">
          <UsersIcon class="stat-icon" aria-hidden="true" />
          <span>Registrierte Spieler</span>
          <strong>{{ statsLoading ? "–" : stats.totalPlayers }}</strong>
          <NuxtLink to="/admin/players">Spieler ansehen <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div class="stat-card">
          <ClockIcon class="stat-icon" aria-hidden="true" />
          <span>Bevorstehende Events</span>
          <strong>{{ statsLoading ? "–" : stats.upcomingEvents }}</strong>
          <NuxtLink to="/admin/events">Zum Kalender <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div class="stat-card">
          <CheckCircleIcon class="stat-icon" aria-hidden="true" />
          <span>Abgeschlossene Events</span>
          <strong>{{ statsLoading ? "–" : stats.completedEvents }}</strong>
          <button class="stat-link" type="button" @click="openHistory">Historie öffnen <span aria-hidden="true">↓</span></button>
        </div>
      </div>
    </section>

    <section class="activity-panel" aria-labelledby="dashboard-activity-title">
      <div class="section-heading">
        <div><p class="section-eyebrow">Chronik</p><h2 id="dashboard-activity-title">Letzte Aktivitäten</h2></div>
        <button v-if="recentActivity.length > 6" type="button" class="quiet-button" @click="showAllActivity = !showAllActivity">
          {{ showAllActivity ? "Weniger anzeigen" : `Alle ${recentActivity.length} anzeigen` }}
        </button>
      </div>
      <AppStatePanel v-if="activityLoading" kind="loading" message="Aktivitäten werden geladen …" />
      <AppStatePanel v-else-if="recentActivity.length === 0" kind="empty" title="Noch keine Aktivität" message="Neue Events und Spieler erscheinen hier." />
      <ol v-else class="activity-list">
        <li v-for="activity in visibleActivity" :key="activity.id" class="activity-item">
          <span class="activity-marker" aria-hidden="true"></span>
          <span class="activity-copy"><strong>{{ activityLabel(activity) }}</strong><small>{{ formatTime(activity.createdAt) }}</small></span>
          <span class="activity-category">{{ categoryLabel(activity.type) }}</span>
        </li>
      </ol>
    </section>

    <details id="event-history" ref="historyElement" class="history-panel">
      <summary><span><strong>Eventhistorie</strong><small>Abgeschlossene Veranstaltungen und Ergebnisse</small></span><span aria-hidden="true">⌄</span></summary>
      <div class="history-content"><EventHistory :isAdmin="true" /></div>
    </details>
  </AdminPageLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { CalendarDaysIcon, UsersIcon, ClockIcon, CheckCircleIcon } from "@heroicons/vue/24/outline";

const { user } = useAdmin();
const displayName = computed(() => user.value?.user_metadata?.name || user.value?.email || "");
definePageMeta({ layout: "default" });
useHead({ title: "Admin-Übersicht – ChrispyJams" });

const statsLoading = ref(true);
const activityLoading = ref(true);
const showAllActivity = ref(false);
const historyElement = ref<HTMLDetailsElement | null>(null);
const stats = ref({ customEvents: 0, totalPlayers: 0, upcomingEvents: 0, completedEvents: 0 });
const recentActivity = ref<Array<{ id: string; type: string; description: string; createdAt: string }>>([]);
const visibleActivity = computed(() => showAllActivity.value ? recentActivity.value : recentActivity.value.slice(0, 6));

function categoryLabel(type: string) {
  const lower = type.toLowerCase();
  if (lower.includes("player")) return "Spieler";
  if (lower.includes("event")) return "Event";
  if (lower.includes("registr")) return "Buchung";
  return "Aktivität";
}

function activityLabel(activity: { type: string; description: string }) {
  if (activity.type === "eventCreated") {
    const match = activity.description.match(/^Custom event "(.*)" created$/);
    if (match) return `Event „${match[1]}“ erstellt`;
  }
  if (activity.type === "playerCreated") {
    const match = activity.description.match(/^Player "(.*)" \((.*)\) created$/);
    if (match) return `Spieler „${match[1].trim()}“${match[2] && match[2] !== "null" ? ` (${match[2]})` : ""} angelegt`;
  }
  return activity.description;
}

function openHistory() {
  if (!historyElement.value) return;
  historyElement.value.open = true;
  historyElement.value.scrollIntoView({ behavior: "smooth", block: "start" });
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days < 1) return "Heute, " + new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(date);
  if (days === 1) return "Gestern";
  if (days < 7) return `Vor ${days} Tagen`;
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

onMounted(async () => {
  try {
    const response = await $fetch<{ stats: typeof stats.value; recentActivity: typeof recentActivity.value }>("/api/admin/dashboard");
    stats.value = response.stats;
    recentActivity.value = response.recentActivity;
  } catch {
    // The panels retain their empty state; API authorization remains server-side.
  } finally {
    statsLoading.value = false;
    activityLoading.value = false;
  }
});
</script>

<style scoped>
.section-heading { display:flex; align-items:end; justify-content:space-between; gap:1rem; margin-bottom:.8rem; }
.section-heading h2 { margin:0; color:var(--app-text-primary); font-size:1.2rem; letter-spacing:-.025em; }
.section-eyebrow { margin:0 0 .2rem; color:var(--app-accent); font-size:.68rem; font-weight:800; letter-spacing:.14em; text-transform:uppercase; }
.section-hint { color:var(--app-text-muted); font-size:.74rem; }
.stats-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.75rem; }
.stat-card, .activity-panel, .history-panel { border:1px solid var(--app-border); background:var(--app-surface-0); border-radius:5px; }
.stat-card { display:grid; grid-template-columns:1rem 1fr; align-items:start; column-gap:.5rem; padding:.7rem .8rem; min-width:0; }
.stat-icon { width:1rem; height:1rem; color:var(--app-accent); grid-row:1 / 3; margin-top:.08rem; }
.stat-card > span { color:var(--app-text-secondary); font-size:.77rem; font-weight:700; }
.stat-card strong { color:var(--app-text-primary); font-size:1.55rem; line-height:1.05; margin:.13rem 0 .3rem; letter-spacing:-.04em; }
.stat-card a, .stat-link { grid-column:2; color:var(--app-accent); text-decoration:none; font-size:.7rem; font-weight:750; }
.stat-link { padding:0; border:0; background:transparent; cursor:pointer; }
.stat-card a:hover, .stat-link:hover, .quiet-button:hover { text-decoration:underline; }
.dashboard-action { display:inline-flex; align-items:center; gap:.55rem; padding:.45rem .7rem; border-radius:4px; background:var(--app-accent); color:var(--app-bg-page); text-decoration:none; font-size:.76rem; font-weight:800; }
.activity-panel { padding:.85rem; }
.activity-list { list-style:none; padding:0; margin:0; }
.activity-item { display:flex; align-items:center; gap:.65rem; padding:.5rem 0; border-top:1px solid var(--app-border); }
.activity-marker { width:.55rem; height:.55rem; flex:none; border-radius:50%; background:var(--app-accent); }
.activity-copy { display:flex; flex:1; min-width:0; flex-direction:column; gap:.18rem; }
.activity-copy strong { color:var(--app-text-primary); font-size:.84rem; font-weight:650; overflow-wrap:anywhere; }
.activity-copy small, .activity-category { color:var(--app-text-muted); font-size:.72rem; }
.activity-category { flex:none; }
.quiet-button { border:0; background:transparent; color:var(--app-accent); font:inherit; font-size:.75rem; font-weight:750; cursor:pointer; }
.history-panel { overflow:hidden; }
.history-panel summary { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.7rem .85rem; cursor:pointer; list-style:none; color:var(--app-text-primary); }
.history-panel summary::-webkit-details-marker { display:none; }
.history-panel summary span:first-child { display:flex; flex-direction:column; gap:.15rem; }
.history-panel summary small { color:var(--app-text-muted); font-size:.75rem; }
.history-panel[open] summary { border-bottom:1px solid var(--app-border); }
.history-content { padding:1rem; }
@media (max-width:1000px) { .stats-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:560px) { .stats-grid { gap:.5rem; } .stat-card { padding:.85rem; } .stat-card strong { font-size:1.65rem; } .activity-panel { padding:.9rem; } .activity-category, .section-hint { display:none; } }
</style>
