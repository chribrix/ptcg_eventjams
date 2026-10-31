<template>
  <AdminPageLayout
    :title="isTournamentPreview ? 'Turniersteuerung' : 'Admin Designvorschau'"
    :subtitle="isTournamentPreview ? 'Gestartete Turniere verwalten · Vorschau mit Beispieldaten' : 'Drei Richtungen für die neue Verwaltung. Die Sidebar und Designvorschau funktionieren auch auf schmalen Displays.'"
  >
    <template #actions><span class="preview-badge">Designprobe · keine Echtdaten</span></template>
    <template v-if="!isTournamentPreview">
    <section class="preview-stats" aria-label="Beispielkennzahlen">
      <div><span>Eigene Events</span><strong>50</strong><small>+ 6 diesen Monat</small></div>
      <div><span>Registrierte Spieler</span><strong>194</strong><small>+ 12 diesen Monat</small></div>
      <div><span>Bevorstehend</span><strong>4</strong><small>Nächstes Event Freitag</small></div>
      <div><span>Abgeschlossen</span><strong>46</strong><small>Archiv aktuell</small></div>
    </section>
    <section class="preview-activity">
      <div class="preview-heading"><p>Was gerade passiert</p><h2>Letzte Aktivitäten</h2></div>
      <div class="preview-row"><span class="preview-dot"></span><span><strong>Neue Registrierung</strong><small>Heute · 14:32 Uhr</small></span><span class="preview-type">Buchung</span></div>
      <div class="preview-row"><span class="preview-dot"></span><span><strong>Event veröffentlicht</strong><small>Gestern · 18:05 Uhr</small></span><span class="preview-type">Kalender</span></div>
      <div class="preview-row"><span class="preview-dot"></span><span><strong>Turnierrunde abgeschlossen</strong><small>Samstag · 20:14 Uhr</small></span><span class="preview-type">Turnier</span></div>
    </section>
    <section class="admin-card preview-subpage" aria-label="Beispiel einer Admin-Unterseite">
      <div class="section-header">
        <div><p class="preview-subpage-kicker">Unterseitenmuster</p><h2>Veranstaltung verwalten</h2></div>
        <span class="badge badge-success">Aktiv</span>
      </div>
      <div class="preview-subpage-fields">
        <label class="form-group">Eventname<input class="form-input" value="Crows & Owls Locals" readonly /></label>
        <label class="form-group">Ort<input class="form-input" value="Crows & Owls" readonly /></label>
      </div>
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead><tr><th>Teilnehmer</th><th>Status</th><th>Anmeldung</th></tr></thead>
          <tbody>
            <tr><td>Alex Beispiel</td><td><span class="badge badge-success">Bestätigt</span></td><td>Heute</td></tr>
            <tr><td>Sam Muster</td><td><span class="badge badge-warning">Warteliste</span></td><td>Gestern</td></tr>
          </tbody>
        </table>
      </div>
      <div class="preview-actions" aria-label="Beispielaktionen">
        <button type="button" class="btn btn-secondary" @click="previewAction">Sekundär</button>
        <button type="button" class="btn btn-primary" @click="previewAction">Primär</button>
      </div>
    </section>
    <section id="event-cards" class="preview-events" aria-label="Eventkarten mit Beispieldaten">
      <div class="preview-heading"><p>Beispieldaten</p><h2>Events</h2></div>
      <p class="preview-events-note">Vorschau der Eventkarten in der Verwaltung. Die Daten sind frei erfunden; Aktionen ändern keine Daten.</p>
      <div class="preview-event-grid">
        <AdminEventManagementCard
          v-for="event in sampleEvents" :key="event.id" :event="event"
          :date-label="event.dateLabel" :copied="copiedEventId === event.id" preview
          @copy="copySampleLink(event.id)"
          @registrations="previewAction" @edit="previewAction" @delete="previewAction" @preview-action="previewAction"
        />
      </div>
    </section>
    </template>
    <div v-else id="tournament-preview" class="preview-tournament" aria-label="Turniersteuerung mit Beispieldaten">
      <AdminTournamentSelector
        :events="sampleTournaments" :selected-event-id="selectedTournamentId"
        v-model:search="tournamentSearch" @select="selectedTournamentId = $event"
      />
      <section v-if="selectedTournament" class="admin-card preview-tournament-control">
        <div class="preview-tournament-title">
          <div><h2>{{ selectedTournament.name }}</h2><p>{{ selectedTournament.venue }} · {{ selectedTournament.dateLabel }}</p></div>
          <span class="preview-tournament-status" :class="selectedTournament.ended ? 'ended' : 'ongoing'">{{ selectedTournament.ended ? 'Beendet' : 'Laufend' }}</span>
        </div>
        <div class="preview-tournament-import">
          <h3>Turnierkontrolle</h3>
          <div class="preview-tournament-actions">
            <button class="btn btn-primary" disabled>Paarungen hochladen</button>
            <button class="btn btn-primary" disabled>Turnier freigeben</button>
            <button class="btn btn-primary" disabled>Pairings freigeben · Pod Masters</button>
            <button class="btn btn-danger" disabled>Turnier beenden</button>
            <button class="btn btn-secondary" disabled>Aktualisieren</button>
          </div>
          <p>{{ selectedTournament.ended ? 'Turnier beendet. Spieler sehen ihre vollständige Rundenhistorie noch 24 Stunden.' : 'Turnieransicht und QR-Zugang sind freigegeben.' }}</p>
        </div>
        <div class="preview-tournament-tabs" aria-label="Turnieransichten">
          <span class="active">Overview</span><span>Roster</span><span>Runde 1 · Swiss</span><span>Runde 2 · Swiss</span>
        </div>
        <div class="preview-tournament-table admin-table-wrapper">
          <h3>Pod Masters · Runde {{ selectedTournament.ended ? '3' : '2' }}</h3>
          <table class="admin-table"><thead><tr><th>#</th><th>Player</th><th>MP</th><th>WLT</th></tr></thead>
            <tbody><tr><td>1</td><td>Alex Beispiel</td><td>6</td><td>2-0-0</td></tr><tr><td>2</td><td>Sam Muster</td><td>3</td><td>1-1-0</td></tr></tbody>
          </table>
        </div>
      </section>
    </div>
  </AdminPageLayout>
</template>

<script setup lang="ts">
if (!import.meta.dev) throw createError({ statusCode: 404, statusMessage: "Not found" });
definePageMeta({ layout: "default" });
useHead({ title: "Admin Designvorschau – ChrispyJams" });
const { showToast } = useToast();
const route = useRoute();
const isTournamentPreview = computed(() => route.query.view === "tournament");
const tournamentSearch = ref("");
const selectedTournamentId = ref("demo-autumn-cup");
const sampleTournaments = [
  { id: "demo-autumn-cup", name: "Crows & Owls Herbst-Cup", venue: "Landshut", eventDate: "2026-10-31T12:00:00Z", dateLabel: "31.10.2026, 13:00 Uhr", ended: false },
  { id: "demo-saturday", name: "Samstags-Locals", venue: "Landshut", eventDate: "2026-10-24T13:00:00Z", dateLabel: "24.10.2026, 15:00 Uhr", ended: false },
  { id: "demo-prerelease", name: "Prerelease Delta-Herrschaft", venue: "Crows & Owls", eventDate: "2026-10-17T12:00:00Z", dateLabel: "17.10.2026, 14:00 Uhr", ended: true },
];
const selectedTournament = computed(() => sampleTournaments.find((event) => event.id === selectedTournamentId.value));
const previewAction = () => showToast("Designprobe: keine Daten geändert", "info", 2500);
const copiedEventId = ref<string | null>(null);
const copySampleLink = async (eventId: string) => {
  await navigator.clipboard.writeText(`https://example.invalid/events/register/${eventId}`);
  copiedEventId.value = eventId;
  showToast("Beispiel-Link kopiert", "info", 2500);
};
const sampleEvents = [
  {
    id: "beispiel-prerelease", name: "Crows & Owls Prerelease", venue: "Herrngasse 379, 84028 Landshut",
    eventDate: "2026-11-07T12:00:00Z", dateLabel: "07.11.2026, 13:00 Uhr", status: "upcoming",
    tagType: "pokemon", tags: { type: "prerelease", format: "standard" }, maxParticipants: 20,
    participationFee: 35, requiresDecklist: false, description: "Einlass ab 12:30 Uhr. Bitte bring deine Spieler-ID mit.",
    _count: { registrations: 19 },
  },
  {
    id: "beispiel-locals", name: "Samstags-Locals", venue: "Crows & Owls, Landshut",
    eventDate: "2026-11-14T13:00:00Z", dateLabel: "14.11.2026, 14:00 Uhr", status: "upcoming",
    tagType: "pokemon", tags: { type: "league", format: "standard" }, maxParticipants: 24,
    participationFee: 5, requiresDecklist: true, description: "Drei Runden Schweizer System. Deckliste vor dem ersten Match abgeben.",
    _count: { registrations: 12 },
  },
];
</script>

<style scoped>
@import "~/assets/css/admin-shared.css";

.preview-badge { display:inline-flex; align-items:center; padding:.35rem .6rem; border-radius:3px; border:1px solid var(--app-border); color:var(--app-text-secondary); background:var(--app-surface-1); font-size:var(--admin-font-support); font-weight:750; }
.preview-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.75rem; }
.preview-stats div, .preview-activity { background:var(--app-surface-0); border:1px solid var(--app-border); border-radius:5px; }
.preview-stats div { display:flex; flex-direction:column; padding:.7rem .8rem; }
.preview-stats span { color:var(--app-text-secondary); font-size:var(--admin-font-body); font-weight:750; }
.preview-stats strong { color:var(--app-text-primary); font-size:1.75rem; margin:.2rem 0; line-height:1.1; }
.preview-stats small, .preview-row small { color:var(--app-text-muted); font-size:var(--admin-font-support); }
.preview-activity { padding:.85rem; }
.preview-heading p { margin:0 0 .25rem; color:var(--app-accent); font-size:var(--admin-font-eyebrow); text-transform:uppercase; letter-spacing:.14em; font-weight:800; }
.preview-heading h2 { margin:0 0 .65rem; font-size:var(--admin-font-section-title); color:var(--app-text-primary); }
.preview-row { display:flex; align-items:center; gap:.65rem; padding:.65rem 0; border-top:1px solid var(--app-border); }
.preview-row > span:nth-child(2) { display:flex; flex:1; flex-direction:column; gap:.15rem; }
.preview-row strong { color:var(--app-text-primary); font-size:var(--admin-font-body); }
.preview-dot { width:.55rem; height:.55rem; border-radius:50%; background:var(--app-accent); }
.preview-type { color:var(--app-text-muted); font-size:var(--admin-font-support); }
.preview-subpage-kicker { margin:0 0 .15rem; color:var(--app-accent); font-size:var(--admin-font-eyebrow); font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
.preview-subpage-fields { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.65rem; }
.preview-events { margin-top: 1rem; }
.preview-tournament { display: grid; gap: .7rem; }
.preview-tournament-control { min-width: 0; }
.preview-tournament-title { display: flex; justify-content: space-between; gap: .75rem; align-items: flex-start; margin-bottom: .7rem; }
.preview-tournament-title h2 { margin: 0; color: var(--app-text-primary); font-size: 1.35rem; }
.preview-tournament-title p { margin: .3rem 0 0; color: var(--app-text-muted); }
.preview-tournament-status { display: inline-flex; border-radius: 3px; padding: .3rem .85rem; font-size: .82rem; font-weight: 700; text-transform: uppercase; }
.preview-tournament-status.ongoing { background: var(--app-badge-success-bg); color: var(--app-badge-success-text); }
.preview-tournament-status.ended { background: var(--app-surface-2); color: var(--app-text-secondary); }
.preview-tournament-import { border: 1px solid var(--app-border); background: var(--app-surface-1); border-radius: 5px; padding: .7rem; margin-bottom: .7rem; }
.preview-tournament-import h3 { margin: 0 0 .6rem; font-size: 1rem; }
.preview-tournament-import p { margin: .6rem 0 0; color: var(--app-text-muted); font-size: .85rem; }
.preview-tournament-actions, .preview-tournament-tabs { display: flex; flex-wrap: wrap; gap: .5rem; }
.preview-tournament-tabs { margin-bottom: 1rem; }
.preview-tournament-tabs span { border: 1px solid var(--app-border); border-radius: 4px; padding: .3rem .6rem; color: var(--app-text-secondary); font-size: .78rem; font-weight: 600; }
.preview-tournament-tabs span.active { border-color: var(--app-button-blue-border); background: var(--app-badge-info-bg); color: var(--app-badge-info-text); }
.preview-tournament-table h3 { margin: 0 0 .6rem; font-size: 1rem; }
.preview-events-note { margin: 0 0 .75rem; color: var(--app-text-muted); }
.preview-event-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; }
.preview-actions { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:.5rem; margin-top:.65rem; }
@media (max-width:560px) { .preview-subpage-fields { grid-template-columns:1fr; } }
@media (max-width:800px) { .preview-event-grid { grid-template-columns:1fr; } }
@media (max-width:1200px) { .preview-stats { grid-template-columns:repeat(2,minmax(0,1fr)); } }
</style>
