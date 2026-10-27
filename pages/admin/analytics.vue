<template>
  <AdminPageLayout title="Website-Analytics" subtitle="Anonyme Besucher mit mindestens einer Interaktion auf deiner Website">
    <template #actions>
      <div class="range-switch" aria-label="Zeitraum wählen">
        <button v-for="option in rangeOptions" :key="option" type="button" :class="{ active: selectedDays === option }" :aria-pressed="selectedDays === option" @click="selectedDays = option">
          {{ option === 1 ? "Heute" : `${option} Tage` }}
        </button>
      </div>
    </template>

    <AppStatePanel v-if="pending" kind="loading" title="Analytics werden geladen" message="Die täglichen Aufrufe werden aufbereitet." />
    <AppStatePanel v-else-if="error" kind="error" title="Analytics konnten nicht geladen werden" :message="errorMessage">
      <template #actions><button class="retry-button" type="button" @click="refresh()">Erneut laden</button></template>
    </AppStatePanel>

    <template v-else-if="analytics">
      <section class="summary-grid" aria-label="Zusammenfassung">
        <article class="summary-card summary-card-primary"><span>Aktive Besucher</span><strong>{{ formatNumber(analytics.summary.visitors) }}</strong><small>mindestens ein Klick oder eine Aktion · pro Tag anonym gezählt</small></article>
        <article class="summary-card"><span>Kalenderklicks</span><strong>{{ formatNumber(analytics.summary.homeCalendarClicks) }}</strong><small>Eventkalender auf der Startseite</small></article>
        <article class="summary-card"><span>Logins</span><strong>{{ formatNumber(analytics.summary.logins) }}</strong><small>erfolgreiche Anmeldungen</small></article>
        <article class="summary-card"><span>Dashboard-Aufrufe</span><strong>{{ formatNumber(analytics.summary.dashboardViews) }}</strong><small>Seite /dashboard</small></article>
        <article class="summary-card"><span>Eventliste-Aufrufe</span><strong>{{ formatNumber(analytics.summary.eventListViews) }}</strong><small>Seite /eventlist</small></article>
      </section>

      <AppPanel :title="selectedDays === 1 ? 'Heute' : 'Tägliche Entwicklung'" :subtitle="selectedDays === 1 ? 'Aktive Besucher seit Mitternacht (Berlin)' : 'Täglich aktive Besucher im gewählten Zeitraum'" compact>
        <div v-if="hasTraffic" class="chart-wrap">
          <div class="chart-legend" aria-hidden="true"><span><i class="visitors-dot" />Aktive Besucher</span></div>
          <div class="chart-stage">
            <svg class="history-chart" viewBox="0 0 760 250" role="img" tabindex="0" :aria-label="chartAriaLabel" aria-describedby="chart-help" preserveAspectRatio="none" @pointermove="onChartPointerMove" @pointerdown="onChartPointerMove" @pointerleave="activeDayIndex = null" @focus="focusChart" @blur="activeDayIndex = null" @keydown="onChartKeydown">
              <rect x="0" y="0" width="760" height="250" fill="transparent" />
              <line v-for="y in [30, 80, 130, 180, 230]" :key="y" x1="20" :y1="y" x2="740" :y2="y" class="chart-grid" />
              <polyline :points="visitorPoints" class="chart-line chart-line-visitors" />
              <line v-if="activeDayIndex !== null" :x1="pointX(activeDayIndex)" y1="25" :x2="pointX(activeDayIndex)" y2="230" class="chart-guide" />
            </svg>
            <template v-if="displayDay && displayDayIndex !== null">
              <span class="chart-focus-point chart-focus-visitors" :style="pointStyle(displayDayIndex, displayDay.visitors)" aria-hidden="true" />
            </template>
            <div v-if="activeDay && activeDayIndex !== null" class="chart-tooltip" :style="tooltipStyle(activeDayIndex)">
              <strong>{{ formatDate(activeDay.date) }}</strong>
              <span><i class="visitors-dot" />{{ formatNumber(activeDay.visitors) }} aktive Besucher</span>
            </div>
          </div>
          <p id="chart-help" class="sr-only">Diagramm fokussieren und mit den Pfeiltasten durch die Tage wechseln.</p>
          <div class="chart-labels"><span v-if="selectedDays === 1">Heute · {{ formatDate(analytics.daily[0]?.date) }}</span><template v-else><span>{{ formatDate(analytics.daily[0]?.date) }}</span><span>{{ formatDate(analytics.daily[Math.floor(analytics.daily.length / 2)]?.date) }}</span><span>{{ formatDate(analytics.daily.at(-1)?.date) }}</span></template></div>
        </div>
        <AppStatePanel v-else title="Noch keine Interaktionen" message="Besucher erscheinen hier, sobald sie mindestens einmal mit der Website interagiert haben." />
      </AppPanel>

      <div class="detail-grid">
        <AppPanel title="Gezielte Aktionen" subtitle="Anmeldungen, Warteliste und Merkliste" compact>
          <ol v-if="analytics.actions.length" class="metric-list">
            <li v-for="item in analytics.actions" :key="item.key"><div><strong>{{ actionLabel(item.key) }}</strong><span>{{ actionDescription(item.key) }}</span></div><b>{{ formatNumber(item.count) }}</b></li>
          </ol>
          <AppStatePanel v-else message="Noch keine Aktionen erfasst." />
        </AppPanel>
        <AppPanel title="Seiten mit Interaktionen" subtitle="Öffentliche Bereiche nach aktiven Besuchern" compact>
          <ol v-if="analytics.topPages.length" class="metric-list">
            <li v-for="item in analytics.topPages" :key="item.path"><div><strong>{{ pageLabel(item.path) }}</strong><span>{{ item.path }}</span></div><b>{{ formatNumber(item.count) }}</b></li>
          </ol>
          <AppStatePanel v-else message="Noch keine Interaktionen erfasst." />
        </AppPanel>
      </div>

      <p class="privacy-note">Datenschutz: Es werden weder Namen noch E-Mail-Adressen oder vollständige IP-Adressen gespeichert. Aktive Besucher werden über einen täglich wechselnden anonymen Hash gezählt; dieselbe Person kann an mehreren Tagen mehrfach zählen. Adminseiten und Bots sind ausgeschlossen.</p>
    </template>
  </AdminPageLayout>
</template>

<script setup lang="ts">
import { ANALYTICS_RANGE_DAYS, type AnalyticsRangeDays } from "~/utils/analyticsRange";

type AnalyticsResponse = {
  rangeDays: number;
  summary: { pageViews: number; visitors: number; registrations: number; waitlistJoins: number; homeCalendarClicks: number; logins: number; dashboardViews: number; eventListViews: number };
  daily: Array<{ date: string; pageViews: number; visitors: number; registrations: number }>;
  actions: Array<{ key: string; count: number }>;
  topPages: Array<{ path: string; count: number }>;
};

definePageMeta({ layout: "default" });
useHead({ title: "Website-Analytics – PTCG Event Jams" });

const rangeOptions = ANALYTICS_RANGE_DAYS;
const selectedDays = ref<AnalyticsRangeDays>(1);
const { data: analytics, pending, error, refresh } = await useFetch<AnalyticsResponse>("/api/admin/analytics", {
  query: computed(() => ({ days: selectedDays.value })),
  watch: [selectedDays],
});

const formatNumber = (value: number) => new Intl.NumberFormat("de-DE").format(value);
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`)) : "";
const errorMessage = computed(() => error.value?.statusMessage || "Bitte versuche es erneut.");
const hasTraffic = computed(() => (analytics.value?.summary.visitors || 0) > 0);
const chartMax = computed(() => Math.max(1, ...((analytics.value?.daily || []).map((day) => day.visitors))));
const pointX = (index: number) => {
  const count = analytics.value?.daily.length || 1;
  return count === 1 ? 380 : 20 + (index / (count - 1)) * 720;
};
const pointY = (value: number) => 230 - (value / chartMax.value) * 200;
const visitorPoints = computed(() => (analytics.value?.daily || []).map((day, index) => `${pointX(index)},${pointY(day.visitors)}`).join(" "));
const activeDayIndex = ref<number | null>(null);
watch(selectedDays, () => { activeDayIndex.value = null; });
const activeDay = computed(() => activeDayIndex.value === null ? null : analytics.value?.daily[activeDayIndex.value] ?? null);
const displayDayIndex = computed(() => activeDayIndex.value ?? (analytics.value?.daily.length === 1 ? 0 : null));
const displayDay = computed(() => displayDayIndex.value === null ? null : analytics.value?.daily[displayDayIndex.value] ?? null);
const chartAriaLabel = computed(() => activeDay.value
  ? `${formatDate(activeDay.value.date)}: ${formatNumber(activeDay.value.visitors)} aktive Besucher`
  : selectedDays.value === 1 ? "Aktive Besucher heute" : `Aktive Besucher der letzten ${selectedDays.value} Tage`);

function onChartPointerMove(event: PointerEvent) {
  const count = analytics.value?.daily.length || 0;
  if (!count) return;
  const bounds = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width) * 760;
  activeDayIndex.value = count === 1 ? 0 : Math.max(0, Math.min(count - 1, Math.round(((x - 20) / 720) * (count - 1))));
}

function focusChart() {
  activeDayIndex.value = Math.max(0, (analytics.value?.daily.length || 1) - 1);
}

function onChartKeydown(event: KeyboardEvent) {
  const count = analytics.value?.daily.length || 0;
  if (!count || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  if (event.key === "Home") activeDayIndex.value = 0;
  else if (event.key === "End") activeDayIndex.value = count - 1;
  else activeDayIndex.value = Math.max(0, Math.min(count - 1, (activeDayIndex.value ?? count - 1) + (event.key === "ArrowRight" ? 1 : -1)));
}

const pointStyle = (index: number, value: number) => ({ left: `${(pointX(index) / 760) * 100}%`, top: `${(pointY(value) / 250) * 100}%` });
const tooltipStyle = (index: number) => {
  const day = analytics.value?.daily[index];
  const top = day ? (pointY(day.visitors) / 250) * 100 + 8 : 15;
  return {
    left: `${Math.max(15, Math.min(85, (pointX(index) / 760) * 100))}%`,
    top: `${Math.max(15, Math.min(60, top))}%`,
  };
};

const actionLabels: Record<string, [string, string]> = {
  registration_completed: ["Registrierung abgeschlossen", "Ein fester Platz wurde gebucht"],
  waitlist_joined: ["Warteliste beigetreten", "Ein Wartelistenplatz wurde angefragt"],
  waitlist_confirmed: ["Wartelistenplatz bestätigt", "Ein angebotener Platz wurde angenommen"],
  event_bookmarked: ["Event gemerkt", "Ein Event wurde vorgemerkt"],
};
const actionLabel = (key: string) => actionLabels[key]?.[0] || key;
const actionDescription = (key: string) => actionLabels[key]?.[1] || "";
const pageLabel = (path: string) => ({
  "/": "Startseite", "/eventlist": "Eventliste", "/events/:id": "Eventdetails", "/events/register/:id": "Eventregistrierung", "/dashboard": "Nutzer-Dashboard", "/login": "Login", "/register": "Account erstellen",
}[path] || path);
</script>

<style scoped>
.range-switch { display: inline-flex; flex-wrap: wrap; gap: 0.2rem; padding: 0.15rem; border: 1px solid var(--app-border); border-radius: var(--admin-control-radius); background: var(--app-surface-1); }
.range-switch button { min-height: var(--admin-control-height); border: 0; border-radius: var(--admin-control-radius); padding: 0.5rem 0.75rem; background: transparent; color: var(--app-text-secondary); font: inherit; font-size: var(--admin-font-control); font-weight: 500; cursor: pointer; }
.retry-button { border: 0; border-radius: var(--admin-control-radius); padding: 0.5rem 0.75rem; background: transparent; color: var(--app-text-secondary); font-weight: 500; cursor: pointer; }
.range-switch button.active { color: var(--app-button-blue-text); background: linear-gradient(135deg, color-mix(in srgb, var(--app-button-blue) 84%, white), color-mix(in srgb, var(--app-button-green) 68%, var(--app-button-blue))); box-shadow: var(--app-shadow-soft); }
.retry-button { background: var(--app-accent); color: var(--app-bg-page); }
.summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem; }
.summary-card-primary { grid-column: 1 / -1; }
.summary-card { display: flex; min-width: 0; flex-direction: column; gap: 0.15rem; padding: 0.7rem; border: 1px solid var(--app-border); border-radius: 5px; background: var(--app-surface-0); }
.summary-card span { color: var(--app-text-secondary); font-size: var(--admin-font-body); font-weight: 700; }
.summary-card strong { color: var(--app-text-primary); font-size: clamp(1.5rem, 5vw, 1.85rem); line-height: 1; }
.summary-card small { color: var(--app-text-muted); font-size: var(--admin-font-support); }
.chart-wrap { min-width: 0; }
.chart-legend { display: flex; justify-content: flex-end; gap: 1rem; color: var(--app-text-muted); font-size: var(--admin-font-support); }
.chart-legend span { display: inline-flex; align-items: center; gap: 0.35rem; }
.chart-legend i { width: 0.65rem; height: 0.65rem; border-radius: 999px; }
.visitors-dot { background: var(--app-accent); }
.chart-stage { position: relative; }
.history-chart { display: block; width: 100%; height: 12rem; overflow: visible; cursor: crosshair; }
.history-chart:focus-visible { outline: 2px solid var(--app-accent); outline-offset: 2px; }
.chart-grid { stroke: var(--app-border); stroke-width: 1; vector-effect: non-scaling-stroke; }
.chart-line { fill: none; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.chart-line-visitors { stroke: var(--app-accent); }
.chart-guide { stroke: var(--app-text-muted); stroke-width: 1; stroke-dasharray: 4 5; vector-effect: non-scaling-stroke; pointer-events: none; }
.chart-focus-point { position: absolute; z-index: 1; width: 0.75rem; height: 0.75rem; border: 2px solid var(--app-surface-0); border-radius: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 0 1px var(--app-border); pointer-events: none; }
.chart-focus-visitors { background: var(--app-accent); }
.chart-tooltip { position: absolute; z-index: 2; display: grid; gap: 0.2rem; min-width: 9rem; padding: 0.5rem 0.65rem; border: 1px solid var(--app-border); border-radius: var(--admin-control-radius); background: var(--app-surface-0); box-shadow: var(--app-shadow-soft); color: var(--app-text-primary); font-size: var(--admin-font-support); transform: translateX(-50%); pointer-events: none; }
.chart-tooltip strong { font-size: var(--admin-font-body); }
.chart-tooltip span { display: flex; align-items: center; gap: 0.4rem; white-space: nowrap; }
.chart-tooltip i { width: 0.55rem; height: 0.55rem; flex: none; border-radius: 50%; }
.chart-labels { display: flex; justify-content: space-between; color: var(--app-text-muted); font-size: var(--admin-font-support); }
.detail-grid { display: grid; gap: 0.7rem; }
.metric-list { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.metric-list li { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.5rem 0; border-bottom: 1px solid var(--app-border); }
.metric-list li:last-child { border-bottom: 0; }
.metric-list div { display: flex; min-width: 0; flex-direction: column; }
.metric-list strong { color: var(--app-text-primary); font-size: var(--admin-font-body); }
.metric-list span { overflow: hidden; color: var(--app-text-muted); font-size: var(--admin-font-support); text-overflow: ellipsis; white-space: nowrap; }
.metric-list b { flex-shrink: 0; color: var(--app-text-primary); font-size: 1.1rem; }
.privacy-note { margin: 0; padding: 0 0.25rem; color: var(--app-text-muted); font-size: var(--admin-font-support); line-height: 1.5; }
@media (min-width: 1201px) { .summary-grid { grid-template-columns: 1.5fr repeat(4, minmax(0, 1fr)); gap: 0.7rem; } .summary-card-primary { grid-column: auto; } }
@media (min-width: 700px) { .detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
