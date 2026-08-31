<template>
  <AdminPageLayout title="League Manager" subtitle="Saisons, Wertungen und Turnierimporte">
    <template #actions>
      <select v-model="selectedSeasonId" class="control" @change="loadSeason">
        <option value="">Saison wählen</option>
        <option v-for="season in seasons" :key="season.id" :value="season.id">
          {{ season.isActive ? "Aktiv · " : "" }}{{ season.name }}
        </option>
      </select>
      <button class="button secondary" type="button" @click="showSeasonForm = !showSeasonForm">
        <PlusIcon class="icon" /> Neue Saison
      </button>
    </template>

    <p v-if="message" class="notice" :class="messageType">{{ message }}</p>

    <form v-if="showSeasonForm" class="panel form-grid" @submit.prevent="createSeason">
      <label>Name<input v-model="seasonForm.name" class="control" required /></label>
      <label>Slug<input v-model="seasonForm.slug" class="control" pattern="[a-z0-9][a-z0-9_-]*" required /></label>
      <label>Beginn<input v-model="seasonForm.startsOn" class="control" type="date" required /></label>
      <label>Ende<input v-model="seasonForm.endsOn" class="control" type="date" required /></label>
      <label class="check"><input v-model="seasonForm.isActive" type="checkbox" /> Sofort aktivieren</label>
      <button class="button primary" type="submit"><CheckIcon class="icon" /> Saison anlegen</button>
    </form>

    <div v-if="loading" class="panel empty">Liga-Daten werden geladen …</div>
    <div v-else-if="!view" class="panel empty">Lege eine Saison an oder wähle eine bestehende Saison.</div>
    <template v-else>
      <section class="season-bar">
        <div>
          <strong>{{ view.name }}</strong>
          <span>{{ date(view.startsOn) }} – {{ date(view.endsOn) }}</span>
        </div>
        <div class="button-row">
          <span v-if="view.isActive" class="status active">Aktive Saison</span>
          <button v-else class="button secondary" type="button" @click="activateSeason">Aktivieren</button>
          <a class="icon-button" :href="exportUrl('backup')" title="Saison-Backup herunterladen"><ArrowDownTrayIcon class="icon" /></a>
          <button class="icon-button danger" type="button" title="Saison löschen" @click="deleteSeason">
            <TrashIcon class="icon" />
          </button>
        </div>
      </section>

      <nav class="tabs" aria-label="Liga-Verwaltung">
        <button v-for="item in tabs" :key="item.id" type="button" :class="{ active: tab === item.id }" @click="tab = item.id">
          {{ item.label }}
        </button>
      </nav>

      <section v-if="tab === 'overview'" class="stack">
        <div class="metrics">
          <div><span>Events</span><strong>{{ view.events.length }}</strong></div>
          <div><span>Spieler</span><strong>{{ view.players.length }}</strong></div>
          <div><span>Teilnahmen</span><strong>{{ participationCount }}</strong></div>
          <div><span>Preispool</span><strong>{{ money(view.prizePoolCents) }}</strong></div>
        </div>
        <div class="panel">
          <div class="section-heading"><h2>Top-Platzierungen</h2></div>
          <LeagueStandingsTable :standings="view.standings.slice(0, 10)" />
        </div>
      </section>

      <section v-if="tab === 'standings'" class="panel">
        <div class="section-heading">
          <h2>Rangliste</h2>
          <a class="button secondary" :href="exportUrl('leaderboard')"><ArrowDownTrayIcon class="icon" /> CSV</a>
        </div>
        <LeagueStandingsTable :standings="view.standings" />
        <div class="section-heading matrix-heading">
          <h2>Punktematrix</h2>
          <a class="button secondary" :href="exportUrl('matrix')"><ArrowDownTrayIcon class="icon" /> CSV</a>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Spieler</th><th v-for="event in view.events" :key="event.id">{{ shortDate(event.eventDate) }}</th><th>Σ</th></tr></thead>
            <tbody>
              <tr v-for="row in view.matrix" :key="row.playerId">
                <td>{{ row.displayName }}</td><td v-for="(points, index) in row.points" :key="index">{{ points ?? "–" }}</td><td><strong>{{ row.totalPoints }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="tab === 'import'" class="panel stack">
        <div class="section-heading"><h2>TDF/XML importieren</h2></div>
        <input type="file" accept=".tdf,.xml,text/xml" multiple @change="selectImportFile" />
        <div v-if="importQueue.length" class="import-queue">
          <button
            v-for="(item, index) in importQueue"
            :key="`${item.name}-${index}`"
            type="button"
            :class="{ selected: activeImportIndex === index }"
            @click="item.state === 'pending' && openImportItem(index)"
          >
            <span>{{ item.name }}</span><strong :class="item.state">{{ importStateLabel(item) }}</strong>
          </button>
        </div>
        <div v-if="importPreview" class="stack">
          <div class="import-summary">
            <label>Eventname<input v-model="importReview.name" class="control" /></label>
            <label>Datum<input v-model="importReview.eventDate" class="control" type="date" /></label>
            <label>Teilnehmer<input v-model.number="importReview.participantCount" class="control" type="number" min="0" /></label>
          </div>
          <div v-if="importPreview.warnings.length" class="warning">
            <p v-for="warning in importPreview.warnings" :key="warning">{{ warning }}</p>
            <label class="check"><input v-model="warningsConfirmed" type="checkbox" /> Warnungen geprüft</label>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Übernehmen</th><th>Spieler-ID</th><th>Name</th><th>Status</th><th>Platz</th><th>Punkte</th></tr></thead>
              <tbody>
                <tr v-for="player in importReview.players" :key="player.pokemonPlayerId">
                  <td><input v-model="player.include" type="checkbox" /></td>
                  <td class="mono">{{ player.pokemonPlayerId }}</td>
                  <td><input v-model="player.displayName" class="control compact" /></td>
                  <td><select v-model="player.status" class="control compact"><option value="confirmed">Bestätigt</option><option value="dnf">DNF</option><option value="unranked">Ohne Wertung</option></select></td>
                  <td><input v-model.number="player.placement" class="control number" type="number" min="1" /></td>
                  <td><input v-model.number="player.points" class="control number" type="number" min="0" placeholder="auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="button-row align-start">
            <button class="button primary" type="button" :disabled="saving || (importPreview.warnings.length > 0 && !warningsConfirmed)" @click="confirmImport">
              <ArrowUpTrayIcon class="icon" /> Event importieren und weiter
            </button>
            <button class="button secondary" type="button" @click="skipImport">Datei überspringen</button>
          </div>
        </div>
      </section>

      <section v-if="tab === 'events'" class="split">
        <div class="panel stack">
          <div class="section-heading"><h2>Events</h2><a class="button secondary" :href="exportUrl('events')"><ArrowDownTrayIcon class="icon" /> CSV</a></div>
          <button v-for="event in [...view.events].reverse()" :key="event.id" class="list-row" :class="{ selected: selectedEventId === event.id }" type="button" @click="openEvent(event)">
            <span><strong>{{ event.name }}</strong><small>{{ date(event.eventDate) }} · {{ event.participantCount }} Spieler</small></span><span>{{ money(event.participantCount * event.prizePoolContributionCents) }}</span>
          </button>
          <button class="button secondary align-start" type="button" @click="newEvent"><PlusIcon class="icon" /> Event anlegen</button>
        </div>
        <form class="panel stack" @submit.prevent="saveEvent">
          <div class="section-heading"><h2>{{ eventForm.id ? "Event bearbeiten" : "Neues Event" }}</h2></div>
          <label>Name<input v-model="eventForm.name" class="control" required /></label>
          <div class="form-grid two"><label>Datum<input v-model="eventForm.eventDate" class="control" type="date" required /></label><label>Teilnehmer<input v-model.number="eventForm.participantCount" class="control" type="number" min="0" /></label></div>
          <label>Preispool-Beitrag pro Spieler (Cent)<input v-model.number="eventForm.prizePoolContributionCents" class="control" type="number" min="0" /></label>
          <label>Notizen<textarea v-model="eventForm.notes" class="control" rows="2" /></label>
          <div class="button-row"><button class="button primary" type="submit"><CheckIcon class="icon" /> Speichern</button><button v-if="eventForm.id" class="button danger" type="button" @click="removeEvent"><TrashIcon class="icon" /> Löschen</button></div>
          <template v-if="eventForm.id">
            <div class="section-heading sub"><h3>Teilnahme erfassen oder korrigieren</h3></div>
            <select v-model="participationForm.leaguePlayerId" class="control"><option value="">Spieler wählen</option><option v-for="player in view.players" :key="player.id" :value="player.id">{{ player.displayName }}</option></select>
            <div class="form-grid two"><label>Platz<input v-model.number="participationForm.placement" class="control" type="number" min="1" /></label><label>Punkte<input v-model.number="participationForm.points" class="control" type="number" min="0" placeholder="auto" /></label></div>
            <select v-model="participationForm.status" class="control"><option value="confirmed">Bestätigt</option><option value="dnf">DNF</option><option value="disqualified">Disqualifiziert</option></select>
            <input v-model="participationForm.correctionReason" class="control" placeholder="Begründung bei Punkteabweichung" />
            <button class="button secondary align-start" type="button" @click="saveParticipation">Teilnahme speichern</button>
          </template>
        </form>
      </section>

      <section v-if="tab === 'players'" class="panel stack">
        <div class="section-heading"><h2>Ligaspieler</h2></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Spieler-ID</th><th>Name</th><th>Status</th><th>Aliase</th><th></th></tr></thead>
            <tbody>
              <tr v-for="player in view.players" :key="player.id">
                <td class="mono">{{ player.externalIds.map((item: any) => item.pokemonPlayerId).join(", ") }}</td>
                <td><input v-model="player.displayName" class="control compact" /></td>
                <td><select v-model="player.status" class="control compact"><option value="active">Aktiv</option><option value="inactive">Inaktiv</option></select></td>
                <td><span>{{ player.aliases.map((item: any) => item.alias).join(", ") || "–" }}</span><button class="icon-button" type="button" title="Alias hinzufügen" @click="addAlias(player)"><PlusIcon class="icon" /></button></td>
                <td><button class="icon-button" type="button" title="Spieler speichern" @click="savePlayer(player)"><CheckIcon class="icon" /></button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="merge-row">
          <select v-model="mergeForm.sourceId" class="control"><option value="">Quellspieler</option><option v-for="player in view.players" :key="player.id" :value="player.id">{{ player.displayName }}</option></select>
          <ArrowRightIcon class="icon" />
          <select v-model="mergeForm.targetId" class="control"><option value="">Zielspieler</option><option v-for="player in view.players" :key="player.id" :value="player.id">{{ player.displayName }}</option></select>
          <input v-model="mergeForm.reason" class="control" placeholder="Begründung" />
          <button class="button secondary" type="button" @click="mergePlayers">Zusammenführen</button>
        </div>
      </section>

      <form v-if="tab === 'rules'" class="panel stack" @submit.prevent="saveRules">
        <div class="section-heading"><h2>Punktetabelle</h2></div>
        <div v-for="(rule, index) in editableRules" :key="index" class="rule-row">
          <input v-model.number="rule.positionFrom" class="control number" type="number" min="1" aria-label="Von Platz" />
          <span>bis</span><input v-model.number="rule.positionTo" class="control number" type="number" min="1" placeholder="∞" aria-label="Bis Platz" />
          <span>=</span><input v-model.number="rule.points" class="control number" type="number" min="0" aria-label="Punkte" /><span>Punkte</span>
          <button class="icon-button danger" type="button" title="Regel entfernen" @click="editableRules.splice(index, 1)"><TrashIcon class="icon" /></button>
        </div>
        <div class="button-row"><button class="button secondary" type="button" @click="editableRules.push({ positionFrom: 1, positionTo: null, points: 0 })"><PlusIcon class="icon" /> Regel</button><button class="button primary" type="submit"><CheckIcon class="icon" /> Punktetabelle speichern</button></div>
      </form>

      <section v-if="tab === 'history'" class="panel">
        <div class="section-heading"><h2>Änderungsprotokoll</h2></div>
        <div class="table-wrap"><table><thead><tr><th>Zeitpunkt</th><th>Aktion</th><th>Bereich</th><th>Begründung</th></tr></thead><tbody><tr v-for="entry in view.changeLog" :key="entry.id"><td>{{ dateTime(entry.occurredAt) }}</td><td>{{ entry.action }}</td><td>{{ entry.entityType }}</td><td>{{ entry.reason || "–" }}</td></tr></tbody></table></div>
      </section>
    </template>
  </AdminPageLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ArrowDownTrayIcon, ArrowRightIcon, ArrowUpTrayIcon, CheckIcon, PlusIcon, TrashIcon } from "@heroicons/vue/24/outline";

definePageMeta({ layout: "default" });
useHead({ title: "League Manager - ChrispyJams" });

const tabs = [
  { id: "overview", label: "Übersicht" }, { id: "standings", label: "Rangliste" },
  { id: "import", label: "TDF-Import" }, { id: "events", label: "Events" },
  { id: "players", label: "Spieler" }, { id: "rules", label: "Punktregeln" },
  { id: "history", label: "Protokoll" },
];
const seasons = ref<any[]>([]);
const selectedSeasonId = ref("");
const view = ref<any>(null);
const loading = ref(false);
const saving = ref(false);
const showSeasonForm = ref(false);
const tab = ref("overview");
const message = ref("");
const messageType = ref("success");
const seasonForm = ref({ name: "", slug: "", startsOn: "", endsOn: "", isActive: false });
const editableRules = ref<any[]>([]);
const pendingXml = ref("");
const importPreview = ref<any>(null);
const importReview = ref<any>({ players: [] });
const warningsConfirmed = ref(false);
const importQueue = ref<any[]>([]);
const activeImportIndex = ref(-1);
const selectedEventId = ref("");
const emptyEvent = () => ({ id: "", name: "", eventDate: "", participantCount: 0, prizePoolContributionCents: 100, notes: "" });
const eventForm = ref(emptyEvent());
const participationForm = ref<any>({ leaguePlayerId: "", placement: null, points: undefined, status: "confirmed", correctionReason: "" });
const mergeForm = ref({ sourceId: "", targetId: "", reason: "" });
const participationCount = computed(() => view.value?.events.reduce((sum: number, event: any) => sum + event.participations.length, 0) || 0);

const notify = (text: string, type = "success") => { message.value = text; messageType.value = type; };
const errorMessage = (error: any) => error?.data?.statusMessage || error?.statusMessage || error?.message || "Aktion fehlgeschlagen";
const date = (value: string) => new Intl.DateTimeFormat("de-AT").format(new Date(value));
const shortDate = (value: string) => new Intl.DateTimeFormat("de-AT", { day: "2-digit", month: "2-digit" }).format(new Date(value));
const dateTime = (value: string) => new Intl.DateTimeFormat("de-AT", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const money = (cents: number) => new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(cents / 100);
const exportUrl = (type: string) => `/api/admin/league/seasons/${selectedSeasonId.value}/export/${type}`;

async function loadSeasons() {
  seasons.value = await $fetch<any[]>("/api/admin/league/seasons");
  if (!selectedSeasonId.value) selectedSeasonId.value = seasons.value.find((season) => season.isActive)?.id || seasons.value[0]?.id || "";
  if (selectedSeasonId.value) await loadSeason();
}
async function loadSeason() {
  if (!selectedSeasonId.value) { view.value = null; return; }
  loading.value = true;
  try {
    view.value = await $fetch(`/api/admin/league/seasons/${selectedSeasonId.value}`);
    editableRules.value = view.value.pointRules.map((rule: any) => ({ positionFrom: rule.positionFrom, positionTo: rule.positionTo, points: rule.points }));
  } catch (error) { notify(errorMessage(error), "error"); } finally { loading.value = false; }
}
async function action(payload: any) {
  saving.value = true;
  try { return await $fetch(`/api/admin/league/seasons/${selectedSeasonId.value}/actions`, { method: "POST", body: payload }); }
  finally { saving.value = false; }
}
async function createSeason() {
  try {
    const created: any = await $fetch("/api/admin/league/seasons", { method: "POST", body: seasonForm.value });
    selectedSeasonId.value = created.id; showSeasonForm.value = false; await loadSeasons(); notify("Saison angelegt.");
  } catch (error) { notify(errorMessage(error), "error"); }
}
async function activateSeason() {
  await $fetch(`/api/admin/league/seasons/${selectedSeasonId.value}`, { method: "PATCH", body: { isActive: true } });
  await loadSeasons(); notify("Aktive Saison geändert.");
}
async function deleteSeason() {
  if (!confirm(`Saison „${view.value.name}“ mit allen Ligadaten löschen?`)) return;
  await $fetch(`/api/admin/league/seasons/${selectedSeasonId.value}`, { method: "DELETE" });
  selectedSeasonId.value = ""; view.value = null; await loadSeasons(); notify("Saison gelöscht.");
}
function openImportItem(index: number) {
  const item = importQueue.value[index];
  if (!item?.preview) return;
  activeImportIndex.value = index;
  pendingXml.value = item.xml;
  importPreview.value = item.preview;
  importReview.value = {
    name: item.preview.name, eventDate: item.preview.eventDate,
    participantCount: item.preview.participantCount,
    players: item.preview.players.map((player: any) => ({ ...player, include: player.status !== "unranked", points: undefined })),
  };
  warningsConfirmed.value = false;
}
function importStateLabel(item: any) {
  if (item.state === "error") return `Abgelehnt: ${item.error}`;
  return ({ pending: "Zu prüfen", imported: "Importiert", skipped: "Übersprungen" } as any)[item.state] || item.state;
}
function advanceImportQueue() {
  const nextIndex = importQueue.value.findIndex((item) => item.state === "pending");
  if (nextIndex >= 0) openImportItem(nextIndex);
  else { activeImportIndex.value = -1; pendingXml.value = ""; importPreview.value = null; }
}
async function selectImportFile(event: Event) {
  const files = [...((event.target as HTMLInputElement).files || [])];
  importQueue.value = [];
  for (const file of files) {
    const item: any = { name: file.name, xml: "", preview: null, state: "pending" };
    try {
      if (!file.name.toLowerCase().match(/\.(tdf|xml)$/)) throw new Error("Keine XML- oder TDF-Datei");
      item.xml = await file.text();
      item.preview = await action({ action: "preview-import", xml: item.xml });
      if (importQueue.value.some((existing) => existing.preview?.contentHash === item.preview.contentHash)) {
        throw new Error("Doppelte Datei in diesem Upload");
      }
    } catch (error) { item.state = "error"; item.error = errorMessage(error); }
    importQueue.value.push(item);
  }
  advanceImportQueue();
}
async function confirmImport() {
  try {
    await action({ action: "confirm-import", xml: pendingXml.value, warningsConfirmed: warningsConfirmed.value, review: importReview.value });
    if (activeImportIndex.value >= 0) importQueue.value[activeImportIndex.value].state = "imported";
    await loadSeason(); notify("Turnier importiert."); advanceImportQueue();
  } catch (error) { notify(errorMessage(error), "error"); }
}
function skipImport() {
  if (activeImportIndex.value >= 0) importQueue.value[activeImportIndex.value].state = "skipped";
  advanceImportQueue();
}
async function saveRules() {
  try { await action({ action: "replace-point-rules", rules: editableRules.value.map((rule) => ({ ...rule, positionTo: rule.positionTo || null })) }); await loadSeason(); notify("Punktetabelle gespeichert."); }
  catch (error) { notify(errorMessage(error), "error"); }
}
async function savePlayer(player: any) {
  try { await action({ action: "update-player", playerId: player.id, player: { displayName: player.displayName, status: player.status } }); await loadSeason(); notify("Spieler gespeichert."); }
  catch (error) { notify(errorMessage(error), "error"); }
}
async function addAlias(player: any) {
  const alias = prompt("Neuer Alias"); if (!alias) return;
  try { await action({ action: "add-player-alias", playerId: player.id, alias }); await loadSeason(); notify("Alias angelegt."); }
  catch (error) { notify(errorMessage(error), "error"); }
}
async function mergePlayers() {
  try { await action({ action: "merge-players", ...mergeForm.value }); mergeForm.value = { sourceId: "", targetId: "", reason: "" }; await loadSeason(); notify("Spieler zusammengeführt."); }
  catch (error) { notify(errorMessage(error), "error"); }
}
function newEvent() { selectedEventId.value = ""; eventForm.value = emptyEvent(); }
function openEvent(event: any) { selectedEventId.value = event.id; eventForm.value = { id: event.id, name: event.name, eventDate: String(event.eventDate).slice(0, 10), participantCount: event.participantCount, prizePoolContributionCents: event.prizePoolContributionCents, notes: event.notes || "" }; }
async function saveEvent() {
  try { const saved: any = await action({ action: "save-event", event: { ...eventForm.value, id: eventForm.value.id || undefined } }); await loadSeason(); openEvent(saved); notify("Event gespeichert."); }
  catch (error) { notify(errorMessage(error), "error"); }
}
async function removeEvent() {
  const reason = prompt("Begründung für das Löschen"); if (!reason) return;
  try { await action({ action: "delete-event", eventId: eventForm.value.id, reason }); newEvent(); await loadSeason(); notify("Event gelöscht."); }
  catch (error) { notify(errorMessage(error), "error"); }
}
async function saveParticipation() {
  try { await action({ action: "save-participation", participation: { ...participationForm.value, eventId: eventForm.value.id, points: participationForm.value.points === "" ? undefined : participationForm.value.points } }); await loadSeason(); notify("Teilnahme gespeichert."); }
  catch (error) { notify(errorMessage(error), "error"); }
}

onMounted(loadSeasons);
</script>

<style scoped>
.stack { display: flex; flex-direction: column; gap: 1rem; }
.panel, .season-bar { border: 1px solid var(--app-border); background: var(--app-surface-0); padding: 1.25rem; border-radius: 8px; }
.season-bar, .section-heading, .button-row { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
.season-bar span, .list-row small { display: block; color: var(--app-text-muted); font-size: .82rem; margin-top: .2rem; }
.tabs { display: flex; overflow-x: auto; border-bottom: 1px solid var(--app-border); gap: .25rem; }
.tabs button { border: 0; border-bottom: 3px solid transparent; background: transparent; color: var(--app-text-secondary); padding: .8rem 1rem; white-space: nowrap; cursor: pointer; }
.tabs button.active { border-color: var(--app-accent); color: var(--app-text-primary); font-weight: 700; }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .75rem; }
.metrics div { border-left: 3px solid var(--app-accent); background: var(--app-surface-1); padding: 1rem; }
.metrics span { color: var(--app-text-muted); display: block; font-size: .8rem; }.metrics strong { color: var(--app-text-primary); font-size: 1.5rem; }
.control { width: 100%; border: 1px solid var(--app-border); background: var(--app-surface-1); color: var(--app-text-primary); border-radius: 6px; padding: .62rem .7rem; }
label { color: var(--app-text-secondary); font-size: .85rem; display: flex; flex-direction: column; gap: .35rem; }.check { flex-direction: row; align-items: center; }
.form-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); align-items: end; gap: 1rem; }.form-grid.two { grid-template-columns: 1fr 1fr; }
.button, .icon-button { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; border: 1px solid transparent; border-radius: 6px; cursor: pointer; text-decoration: none; font-weight: 650; }
.button { padding: .62rem .85rem; }.icon-button { width: 2rem; height: 2rem; background: transparent; color: var(--app-text-secondary); }.icon { width: 1rem; height: 1rem; flex: none; }
.primary { background: var(--app-accent); color: var(--app-button-blue-text); }.secondary { background: var(--app-surface-2); border-color: var(--app-border); color: var(--app-text-primary); }.danger { color: var(--app-button-red-text); background: var(--app-button-red); }
.status { padding: .35rem .6rem; border-radius: 999px; font-size: .78rem; }.status.active { color: var(--app-button-green-text); background: var(--app-button-green); }
.notice { padding: .8rem 1rem; border-radius: 6px; }.notice.success { background: var(--app-button-green); color: var(--app-button-green-text); }.notice.error, .warning { background: var(--app-button-amber); color: var(--app-button-amber-text); padding: .8rem; }
.table-wrap { overflow-x: auto; }table { width: 100%; border-collapse: collapse; color: var(--app-text-secondary); }th, td { padding: .65rem; text-align: left; border-bottom: 1px solid var(--app-border); white-space: nowrap; }th { color: var(--app-text-muted); font-size: .76rem; text-transform: uppercase; }
.compact { min-width: 9rem; padding: .4rem; }.number { width: 5.5rem; }.mono { font-family: ui-monospace, monospace; }.matrix-heading, .sub { margin-top: 1.5rem; }.align-start { align-self: flex-start; }
.import-summary { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem; }.split { display: grid; grid-template-columns: minmax(17rem, .8fr) minmax(22rem, 1.2fr); gap: 1rem; }
.import-queue { display: flex; flex-direction: column; border: 1px solid var(--app-border); }.import-queue button { display: flex; justify-content: space-between; gap: 1rem; padding: .6rem; border: 0; border-bottom: 1px solid var(--app-border); background: var(--app-surface-1); color: var(--app-text-secondary); text-align: left; cursor: pointer; }.import-queue button.selected { background: var(--app-surface-2); }.import-queue strong { font-size: .76rem; color: var(--app-text-muted); }.import-queue .imported { color: var(--app-button-green-text); }.import-queue .error { color: var(--app-button-red-text); }
.list-row { display: flex; justify-content: space-between; text-align: left; border: 1px solid var(--app-border); background: var(--app-surface-1); color: var(--app-text-primary); padding: .7rem; cursor: pointer; }.list-row.selected { border-color: var(--app-accent); }
.merge-row, .rule-row { display: flex; align-items: center; gap: .65rem; }.merge-row .control { max-width: 18rem; }.empty { color: var(--app-text-muted); text-align: center; }
h2, h3 { margin: 0; color: var(--app-text-primary); font-size: 1rem; }
@media (max-width: 900px) { .metrics { grid-template-columns: 1fr 1fr; }.form-grid, .import-summary, .split { grid-template-columns: 1fr; }.merge-row, .rule-row { flex-wrap: wrap; } }
</style>