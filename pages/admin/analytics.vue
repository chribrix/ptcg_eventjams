<template>
  <AdminPageLayout title="Website-Analytics" subtitle="Anonyme Aufrufe und Aktionen auf deiner Website">
    <template #actions>
      <div class="range-switch" aria-label="Zeitraum wählen">
        <button v-for="option in rangeOptions" :key="option" type="button" :class="{ active: selectedDays === option }" @click="selectedDays = option">
          {{ option }} Tage
        </button>
      </div>
    </template>

    <AppStatePanel v-if="pending" kind="loading" title="Analytics werden geladen" message="Die täglichen Aufrufe werden aufbereitet." />
    <AppStatePanel v-else-if="error" kind="error" title="Analytics konnten nicht geladen werden" :message="errorMessage">
      <template #actions><button class="retry-button" type="button" @click="refresh()">Erneut laden</button></template>
    </AppStatePanel>

    <template v-else-if="analytics">
      <section class="summary-grid" aria-label="Zusammenfassung">
        <article class="summary-card"><span>Seitenaufrufe</span><strong>{{ formatNumber(analytics.summary.pageViews) }}</strong><small>alle öffentlichen Seiten</small></article>
        <article class="summary-card"><span>Besucher</span><strong>{{ formatNumber(analytics.summary.visitors) }}</strong><small>anonym, pro Tag eindeutig</small></article>
        <article class="summary-card"><span>Registrierungen</span><strong>{{ formatNumber(analytics.summary.registrations) }}</strong><small>erfolgreich abgeschlossen</small></article>
        <article class="summary-card"><span>Warteliste</span><strong>{{ formatNumber(analytics.summary.waitlistJoins) }}</strong><small>neu beigetreten</small></article>
      </section>

      <AppPanel title="Tägliche Entwicklung" subtitle="Seitenaufrufe und anonyme Besucher im gewählten Zeitraum" compact>
        <div v-if="hasTraffic" class="chart-wrap">
          <div class="chart-legend" aria-hidden="true"><span><i class="views-dot" />Aufrufe</span><span><i class="visitors-dot" />Besucher</span></div>
          <svg class="history-chart" viewBox="0 0 760 250" role="img" :aria-label="`Aufrufshistorie der letzten ${selectedDays} Tage`" preserveAspectRatio="none">
            <line v-for="y in [30, 80, 130, 180, 230]" :key="y" x1="20" :y1="y" x2="740" :y2="y" class="chart-grid" />
            <polyline :points="viewPoints" class="chart-line chart-line-views" />
            <polyline :points="visitorPoints" class="chart-line chart-line-visitors" />
            <g v-for="(day, index) in analytics.daily" :key="day.date">
              <circle :cx="pointX(index)" :cy="pointY(day.pageViews)" r="4" class="chart-point chart-point-views"><title>{{ formatDate(day.date) }}: {{ day.pageViews }} Aufrufe</title></circle>
              <circle :cx="pointX(index)" :cy="pointY(day.visitors)" r="3.5" class="chart-point chart-point-visitors"><title>{{ formatDate(day.date) }}: {{ day.visitors }} Besucher</title></circle>
            </g>
          </svg>
          <div class="chart-labels"><span>{{ formatDate(analytics.daily[0]?.date) }}</span><span>{{ formatDate(analytics.daily[Math.floor(analytics.daily.length / 2)]?.date) }}</span><span>{{ formatDate(analytics.daily.at(-1)?.date) }}</span></div>
        </div>
        <AppStatePanel v-else title="Noch keine Aufrufe" message="Neue öffentliche Seitenaufrufe erscheinen ab jetzt automatisch hier." />
      </AppPanel>

      <div class="detail-grid">
        <AppPanel title="Was Besucher machen" subtitle="Aktionen und wichtige Seiten" compact>
          <ol v-if="analytics.actions.length" class="metric-list">
            <li v-for="item in analytics.actions" :key="item.key"><div><strong>{{ actionLabel(item.key) }}</strong><span>{{ actionDescription(item.key) }}</span></div><b>{{ formatNumber(item.count) }}</b></li>
          </ol>
          <AppStatePanel v-else message="Noch keine Aktionen erfasst." />
        </AppPanel>
        <AppPanel title="Meistbesuchte Seiten" subtitle="Öffentliche Bereiche nach Aufrufen" compact>
          <ol v-if="analytics.topPages.length" class="metric-list">
            <li v-for="item in analytics.topPages" :key="item.path"><div><strong>{{ pageLabel(item.path) }}</strong><span>{{ item.path }}</span></div><b>{{ formatNumber(item.count) }}</b></li>
          </ol>
          <AppStatePanel v-else message="Noch keine Seitenaufrufe erfasst." />
        </AppPanel>
      </div>

      <p class="privacy-note">Datenschutz: Es werden weder Namen noch E-Mail-Adressen oder vollständige IP-Adressen gespeichert. Besucher werden ausschließlich über einen täglich wechselnden anonymen Hash gezählt; Adminseiten und Bots sind ausgeschlossen.</p>
    </template>
  </AdminPageLayout>
</template>

<script setup lang="ts">
type AnalyticsResponse = {
  rangeDays: number;
  summary: { pageViews: number; visitors: number; registrations: number; waitlistJoins: number };
  daily: Array<{ date: string; pageViews: number; visitors: number; registrations: number }>;
  actions: Array<{ key: string; count: number }>;
  topPages: Array<{ path: string; count: number }>;
};

definePageMeta({ layout: "default" });
useHead({ title: "Website-Analytics – PTCG Event Jams" });

const rangeOptions = [7, 30, 90] as const;
const selectedDays = ref<(typeof rangeOptions)[number]>(30);
const { data: analytics, pending, error, refresh } = await useFetch<AnalyticsResponse>("/api/admin/analytics", {
  query: computed(() => ({ days: selectedDays.value })),
  watch: [selectedDays],
});

const formatNumber = (value: number) => new Intl.NumberFormat("de-DE").format(value);
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`)) : "";
const errorMessage = computed(() => error.value?.statusMessage || "Bitte versuche es erneut.");
const hasTraffic = computed(() => (analytics.value?.summary.pageViews || 0) > 0);
const chartMax = computed(() => Math.max(1, ...((analytics.value?.daily || []).flatMap((day) => [day.pageViews, day.visitors]))));
const pointX = (index: number) => {
  const count = analytics.value?.daily.length || 1;
  return count === 1 ? 380 : 20 + (index / (count - 1)) * 720;
};
const pointY = (value: number) => 230 - (value / chartMax.value) * 200;
const pointsFor = (key: "pageViews" | "visitors") => (analytics.value?.daily || []).map((day, index) => `${pointX(index)},${pointY(day[key])}`).join(" ");
const viewPoints = computed(() => pointsFor("pageViews"));
const visitorPoints = computed(() => pointsFor("visitors"));

const actionLabels: Record<string, [string, string]> = {
  event_list_view: ["Eventliste angesehen", "Besucher prüfen verfügbare Events"],
  event_detail_view: ["Eventdetails geöffnet", "Ein konkretes Event wurde angesehen"],
  registration_form_view: ["Registrierung begonnen", "Das Anmeldeformular wurde geöffnet"],
  registration_completed: ["Registrierung abgeschlossen", "Ein fester Platz wurde gebucht"],
  waitlist_joined: ["Warteliste beigetreten", "Ein Wartelistenplatz wurde angefragt"],
  waitlist_confirmed: ["Wartelistenplatz bestätigt", "Ein angebotener Platz wurde angenommen"],
  event_bookmarked: ["Event gemerkt", "Ein Event wurde vorgemerkt"],
  dashboard_view: ["Nutzer-Dashboard geöffnet", "Eigene Anmeldungen wurden angesehen"],
  landing_page_view: ["Startseite angesehen", "Einstieg über die Startseite"],
  other_page_view: ["Andere Seiten angesehen", "Weitere öffentliche Bereiche"],
};
const actionLabel = (key: string) => actionLabels[key]?.[0] || key;
const actionDescription = (key: string) => actionLabels[key]?.[1] || "";
const pageLabel = (path: string) => ({
  "/": "Startseite", "/eventlist": "Eventliste", "/events/:id": "Eventdetails", "/events/register/:id": "Eventregistrierung", "/dashboard": "Nutzer-Dashboard", "/login": "Login", "/register": "Account erstellen",
}[path] || path);
</script>

<style scoped>
.range-switch { display: inline-flex; gap: 0.25rem; padding: 0.25rem; border: 1px solid var(--app-border); border-radius: 0.85rem; background: var(--app-surface-1); }
.range-switch button, .retry-button { border: 0; border-radius: 0.65rem; padding: 0.55rem 0.7rem; background: transparent; color: var(--app-text-secondary); font-weight: 700; cursor: pointer; }
.range-switch button.active, .retry-button { background: var(--app-accent); color: var(--app-accent-contrast, white); }
.summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem; }
.summary-card { display: flex; min-width: 0; flex-direction: column; gap: 0.2rem; padding: 0.85rem; border: 1px solid var(--app-border); border-radius: 1rem; background: var(--app-surface-0); }
.summary-card span { color: var(--app-text-secondary); font-size: 0.78rem; font-weight: 700; }
.summary-card strong { color: var(--app-text-primary); font-size: clamp(1.65rem, 7vw, 2.4rem); line-height: 1; }
.summary-card small { overflow: hidden; color: var(--app-text-muted); font-size: 0.7rem; text-overflow: ellipsis; white-space: nowrap; }
.chart-wrap { min-width: 0; }
.chart-legend { display: flex; justify-content: flex-end; gap: 1rem; color: var(--app-text-muted); font-size: 0.75rem; }
.chart-legend span { display: inline-flex; align-items: center; gap: 0.35rem; }
.chart-legend i { width: 0.65rem; height: 0.65rem; border-radius: 999px; }
.views-dot { background: var(--app-accent); }
.visitors-dot { background: #a78bfa; }
.history-chart { width: 100%; height: 15rem; overflow: visible; }
.chart-grid { stroke: var(--app-border); stroke-width: 1; vector-effect: non-scaling-stroke; }
.chart-line { fill: none; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.chart-line-views, .chart-point-views { stroke: var(--app-accent); fill: var(--app-accent); }
.chart-line-visitors, .chart-point-visitors { stroke: #a78bfa; fill: #a78bfa; }
.chart-point { vector-effect: non-scaling-stroke; }
.chart-labels { display: flex; justify-content: space-between; color: var(--app-text-muted); font-size: 0.72rem; }
.detail-grid { display: grid; gap: 1rem; }
.metric-list { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.metric-list li { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--app-border); }
.metric-list li:last-child { border-bottom: 0; }
.metric-list div { display: flex; min-width: 0; flex-direction: column; }
.metric-list strong { color: var(--app-text-primary); font-size: 0.88rem; }
.metric-list span { overflow: hidden; color: var(--app-text-muted); font-size: 0.72rem; text-overflow: ellipsis; white-space: nowrap; }
.metric-list b { flex-shrink: 0; color: var(--app-text-primary); font-size: 1.1rem; }
.privacy-note { margin: 0; padding: 0 0.25rem; color: var(--app-text-muted); font-size: 0.74rem; line-height: 1.5; }
@media (min-width: 700px) { .summary-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; } .summary-card { padding: 1.1rem; } .detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
