<template>
  <AdminPageLayout title="Tournament Management" subtitle="Import TOM and manage rounds/divisions">
    <div class="tm-layout">
      <section class="admin-card tm-selector-panel">
        <div class="section-header tm-header">
          <h2>Turnier auswählen</h2>
          <button class="btn btn-secondary btn-small" :disabled="listLoading" @click="loadEvents">Refresh</button>
        </div>
        <div class="tm-selector-controls">
          <input
            v-model="tournamentSearch"
            type="text"
            class="tm-input"
            placeholder="Turniername oder Venue suchen"
          />
          <select
            v-model="selectedEventId"
            class="tm-select"
            :disabled="listLoading || filteredEvents.length === 0"
            @change="onSelectEventChange"
          >
            <option v-if="filteredEvents.length === 0" value="">Keine Turniere gefunden</option>
            <option
              v-for="entry in filteredEvents"
              :key="entry.id"
              :value="entry.id"
            >
              {{ entry.name }} · {{ formatDate(entry.eventDate) }}
            </option>
          </select>
        </div>
      </section>

      <section class="admin-card tm-control-panel">
        <div v-if="detailsLoading" class="tm-state">Loading tournament details...</div>
        <div v-else-if="detailsError" class="tm-error">{{ detailsError }}</div>
        <div v-else-if="!selectedEvent" class="tm-state">Select a tournament.</div>
        <template v-else>
          <div class="tm-title-row">
            <div>
              <h2 class="tm-title">{{ selectedEvent.name }}</h2>
              <p class="tm-subtitle">{{ selectedEvent.venue }} • {{ formatDate(selectedEvent.eventDate) }}</p>
            </div>
            <span class="status-pill large" :class="statusClass(selectedEvent.status)">{{ selectedEvent.status }}</span>
          </div>

          <div class="tm-import-panel">
            <h3>TOM Source of Truth</h3>
            <div class="tm-import-actions">
              <input ref="fileInputRef" type="file" accept=".tdf,.xml,text/xml" @change="onTomFileSelected" />
              <button class="btn btn-primary" :disabled="tomImporting || !pendingTomXml" @click="importTomXml">Import TOM XML</button>
              <button class="btn btn-primary" :disabled="tomLoading || !tomStateLoaded" @click="releaseCurrentRound">Runde starten</button>
              <button class="btn btn-secondary" :disabled="tomLoading" @click="loadTomState">Reload</button>
              <button class="btn btn-info" :disabled="!tomStateLoaded || hasPendingCurrentRound" @click="exportTomXml('current')">Export Current</button>
              <button class="btn btn-info" :disabled="!tomStateLoaded" @click="exportTomXml('source')">Export Source</button>
            </div>
            <p v-if="pendingTomFileName" class="tm-meta">Selected file: {{ pendingTomFileName }}</p>
            <p v-if="latestImportInfo" class="tm-meta">
              Last import: {{ latestImportInfo.fileName || "unknown file" }} ({{ latestImportInfo.snapshotKind }}{{ latestImportInfo.roundNumber ? ` r${latestImportInfo.roundNumber}` : "" }})
            </p>
            <p v-if="tomMetadata?.pairingsReleasedRound" class="tm-meta">
              Released round for players: {{ tomMetadata.pairingsReleasedRound }}
            </p>
            <p v-if="tomRefreshing" class="tm-meta">Live-Update aktiv …</p>
            <p v-if="tomSuccessMessage" class="tm-success-inline">{{ tomSuccessMessage }}</p>
            <div v-if="tomMetadata?.snapshotArchive?.length" class="tm-snapshot-list">
              <p class="tm-meta">Snapshot Exports:</p>
              <div class="tm-actions">
                <button
                  v-for="snapshot in tomMetadata.snapshotArchive"
                  :key="snapshot.id"
                  class="btn btn-small btn-secondary"
                  @click="exportTomXml('snapshot', snapshot.id)"
                >
                  {{ snapshot.fileName || `${snapshot.snapshotKind} r${snapshot.roundNumber || ''}` }}
                </button>
              </div>
            </div>
            <p v-if="tomStateError" class="tm-error-inline">{{ tomStateError }}</p>
          </div>

          <div v-if="!tomStateLoaded" class="tm-state">No TOM imported yet.</div>
          <template v-else>
            <div class="tm-tabs">
              <button class="tm-tab" :class="{ active: activeTomTab === 'overview' }" @click="setActiveTab('overview')">Overview</button>
              <button class="tm-tab" :class="{ active: activeTomTab === 'roster' }" @click="setActiveTab('roster')">Roster</button>
              <button
                v-for="round in tomRoundsDetailed"
                :key="`round-${round.number}`"
                class="tm-tab"
                :class="{ active: activeTomTab === `round-${round.number}` }"
                @click="setActiveTab(`round-${round.number}`)"
              >
                {{ roundTabLabel(round) }}
              </button>
            </div>

            <div v-if="activeTomTab === 'overview'" class="tm-overview">
              <div v-for="division in tomDivisions" :key="division.category" class="tm-overview-division">
                <h4 class="tm-overview-title">{{ division.category }} • Round {{ division.currentRound?.number ?? "—" }}</h4>
                <div class="admin-table-wrapper">
                  <table class="admin-table">
                    <thead>
                      <tr><th>#</th><th>Player</th><th>MP</th><th>WLT</th><th>Opp Win %</th><th>Opp Opp Win %</th></tr>
                    </thead>
                    <tbody>
                      <tr v-for="(entry, idx) in division.standings || []" :key="`${division.category}-${entry.userId}`">
                        <td>{{ idx + 1 }}</td>
                        <td>{{ entry.displayName }}</td>
                        <td>{{ entry.matchPoints }}</td>
                        <td>{{ entry.wins }}-{{ entry.losses }}-{{ entry.ties }}</td>
                        <td>{{ entry.opponentWinPercent.toFixed(2) }}%</td>
                        <td>{{ entry.opponentOpponentWinPercent.toFixed(2) }}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div v-if="activeTomTab === 'roster'">
              <p class="tm-meta">Click player row for impersonation demo view.</p>
              <div class="admin-table-wrapper">
                <table class="admin-table">
                  <thead>
                    <tr><th>TOM User ID</th><th>Name</th><th>Birth Date</th><th>Division(s)</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="player in tomPlayers"
                      :key="player.userId"
                      class="tm-roster-row"
                      :class="{ active: demoPlayer?.userId === player.userId }"
                      @click="openDemoPlayer(player)"
                    >
                      <td class="mono">{{ player.userId }}</td>
                      <td>{{ player.displayName }}</td>
                      <td>{{ player.birthDate || '—' }}</td>
                      <td>{{ player.divisions?.length ? player.divisions.join(', ') : '—' }}</td>
                      <td>
                        <button class="btn btn-small btn-info" @click.stop="openFullPlayerView(player)">Turnieransicht</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="demoPlayer" class="tm-demo-panel">
                <h4>Impersonation Demo: {{ demoPlayer.displayName }}</h4>
                <div v-if="demoLoading" class="tm-state">Loading player run...</div>
                <div v-else-if="demoError" class="tm-error-inline">{{ demoError }}</div>
                <template v-else-if="demoRun">
                  <p class="tm-meta">WLT: {{ demoRun.score.wins }}-{{ demoRun.score.losses }}-{{ demoRun.score.ties }} • Points: {{ demoRun.score.points }}</p>
                  <p class="tm-meta" v-if="demoRun.reports?.opponentReported">Opponent has submitted a result.</p>
                  <div class="admin-table-wrapper">
                    <table class="admin-table">
                      <thead>
                        <tr><th>Round</th><th>Division</th><th>Opponent</th><th>Table</th><th>Result</th></tr>
                      </thead>
                      <tbody>
                        <tr v-for="(m, i) in demoRun.playerMatches" :key="`${m.roundNumber}-${i}`">
                          <td>{{ m.roundNumber }}</td>
                          <td>{{ m.divisionCategory || '—' }}</td>
                          <td>{{ playerNameByTomId(m.opponentUserId) }}</td>
                          <td>{{ m.tableNumber || '—' }}</td>
                          <td>{{ m.outcomeLabel }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </template>
              </div>
            </div>

            <div v-if="activeRoundView" class="admin-table-wrapper">
              <table class="admin-table">
                <thead>
                  <tr><th>Division</th><th>Table</th><th>Player 1</th><th>Player 2</th><th>Outcome</th><th>Reports</th><th>Set Result</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(match, idx) in activeRoundView.matches" :key="`${activeRoundView.number}-${match.tableNumber || idx}`">
                    <td>{{ match.divisionCategory || '—' }}</td>
                    <td>{{ match.tableNumber || '—' }}</td>
                    <td :class="playerCellClass(match, 'p1')">{{ playerNameByTomId(match.player1UserId) }}</td>
                    <td :class="playerCellClass(match, 'p2')">{{ playerNameByTomId(match.player2UserId) }}</td>
                    <td :class="outcomeCellClass(match)">{{ match.outcomeLabel }}</td>
                    <td>
                      <span class="status-pill" :class="reportStatusClass(activeRoundView.number, match)">
                        {{ reportStatusLabel(activeRoundView.number, match) }}
                      </span>
                      <div class="tm-report-lines" v-if="reportsForMatch(activeRoundView.number, match).length">
                        <p
                          v-for="(entry, ridx) in reportsForMatch(activeRoundView.number, match)"
                          :key="`${activeRoundView.number}-${match.tableNumber || idx}-report-${ridx}`"
                          class="tm-report-line"
                        >
                          {{ reportSummaryLine(entry) }}
                          <span v-if="pendingSecondsLeft(entry) !== null"> ({{ pendingSecondsLeft(entry) }}s)</span>
                        </p>
                      </div>
                      <div
                        v-if="reportStatusForMatch(activeRoundView.number, match) === 'conflicted'"
                        class="tm-actions tm-conflict-actions"
                      >
                        <button class="btn btn-small btn-primary" :disabled="tomResultSaving" @click="resolveConflict(activeRoundView.number, match, 1)">Accept P1</button>
                        <button class="btn btn-small btn-info" :disabled="tomResultSaving" @click="resolveConflict(activeRoundView.number, match, 2)">Accept P2</button>
                        <button class="btn btn-small btn-secondary" :disabled="tomResultSaving" @click="resolveConflict(activeRoundView.number, match, 3)">Draw</button>
                        <button class="btn btn-small btn-danger" :disabled="tomResultSaving" @click="resolveConflict(activeRoundView.number, match, 8)">DGL</button>
                      </div>
                    </td>
                    <td>
                      <div class="tm-actions">
                        <button class="btn btn-small btn-primary" :disabled="tomResultSaving" @click="setTomMatchOutcome(activeRoundView.number, match, 1)">P1</button>
                        <button class="btn btn-small btn-info" :disabled="tomResultSaving" @click="setTomMatchOutcome(activeRoundView.number, match, 2)">P2</button>
                        <button class="btn btn-small btn-secondary" :disabled="tomResultSaving" @click="setTomMatchOutcome(activeRoundView.number, match, 3)">Draw</button>
                        <button class="btn btn-small btn-danger" :disabled="tomResultSaving" @click="setTomMatchOutcome(activeRoundView.number, match, 8)">DGL</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </template>
      </section>
    </div>
  </AdminPageLayout>
</template>

<script setup lang="ts">
// types

type EventListEntry = { id: string; name: string; venue: string; eventDate: string; status: string; maxParticipants: number; _count?: { registrations: number } };
type SelectedEvent = { id: string; name: string; venue: string; eventDate: string; status: string };
type TomPlayerView = { userId: string; displayName: string; birthDate?: string; divisions?: string[] };
type TomMatchView = { tableNumber?: number; player1UserId?: string; player2UserId?: string; outcome: number; outcomeLabel: string; divisionCategory?: string };
type TomDivisionStanding = {
  userId: string;
  displayName: string;
  matchPoints: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  opponentWinPercent: number;
  opponentOpponentWinPercent: number;
};
type TomDivisionView = { category: string; standings?: TomDivisionStanding[]; currentRound: { number: number; matches: TomMatchView[] } | null };
type TomRoundView = { number: number; type?: number; stage?: number; matches: TomMatchView[] };
type PlayerRunResponse = { score: { wins: number; losses: number; ties: number; points: number }; playerMatches: Array<{ roundNumber: number; divisionCategory?: string; opponentUserId?: string; tableNumber?: number; outcomeLabel: string }>; reports?: { opponentReported?: boolean } };
type TomReportStatus = "pending" | "conflicted" | "finalized" | "admin_overridden";
type TomReportMeta = {
  roundNumber: number;
  divisionCategory?: string;
  tableNumber?: number;
  player1UserId?: string;
  player2UserId?: string;
  status: TomReportStatus;
  reporterUserId?: string;
  reporterResult?: "win" | "loss" | "tie";
  createdAt?: string;
  conflictNote?: string;
};
type TomMetadata = {
  reports?: TomReportMeta[];
  importHistory?: Array<{ fileName?: string; snapshotKind?: string; roundNumber?: number; importedAt?: string }>;
  pairingsReleasedRound?: number;
  snapshotArchive?: Array<{
    id: string;
    fileName?: string;
    snapshotKind?: string;
    roundNumber?: number;
    importedAt?: string;
  }>;
};

const listLoading = ref(true);
const detailsLoading = ref(false);
const statusSaving = ref(false);
const detailsError = ref<string | null>(null);

const events = ref<EventListEntry[]>([]);
const selectedEventId = ref<string | null>(null);
const selectedEvent = ref<SelectedEvent | null>(null);
const tournamentSearch = ref("");
const route = useRoute();
const router = useRouter();

const tomStateLoaded = ref(false);
const tomLoading = ref(false);
const tomRefreshing = ref(false);
const tomImporting = ref(false);
const tomResultSaving = ref(false);
const tomStateError = ref<string | null>(null);
const tomSuccessMessage = ref<string | null>(null);
const tomImportedAt = ref<string | null>(null);
const tomUpdatedAt = ref<string | null>(null);
const tomMetadata = ref<TomMetadata | null>(null);
const tomPlayers = ref<TomPlayerView[]>([]);
const tomDivisions = ref<TomDivisionView[]>([]);
const tomRoundsDetailed = ref<TomRoundView[]>([]);
const tomCurrentRoundNumber = ref<number | null>(null);
const activeTomTab = ref<string>("overview");
const tomStateFingerprint = ref<string | null>(null);
const userPinnedTab = ref<string>("overview");
let tomStateRequestSeq = 0;

const pendingTomXml = ref<string | null>(null);
const pendingTomFileName = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const demoPlayer = ref<TomPlayerView | null>(null);
const demoRun = ref<PlayerRunResponse | null>(null);
const demoLoading = ref(false);
const demoError = ref<string | null>(null);
let nowTickTimer: ReturnType<typeof setInterval> | null = null;
const nowTick = ref(Date.now());
let adminStateStream: EventSource | null = null;
let lastAdminStreamUpdatedAt = "";
let tomRefreshInFlight = false;
let tomRefreshQueued = false;

const setActiveTab = (tab: string) => {
  activeTomTab.value = tab;
  userPinnedTab.value = tab;
};

const filteredEvents = computed(() => {
  const query = tournamentSearch.value.trim().toLowerCase();
  if (!query) return events.value;
  return events.value.filter((entry) =>
    `${entry.name} ${entry.venue}`.toLowerCase().includes(query),
  );
});

const syncSelectedEventToQuery = async (eventId: string | null) => {
  const nextQuery = { ...route.query };
  if (eventId) {
    nextQuery.eventId = eventId;
  } else {
    delete nextQuery.eventId;
  }
  await router.replace({ query: nextQuery });
};

const loadEvents = async () => {
  listLoading.value = true;
  try {
    const response = await $fetch<{ events: EventListEntry[] }>("/api/admin/custom-events?page=1&limit=100");
    events.value = response.events || [];
    const queryEventId = typeof route.query.eventId === "string" ? route.query.eventId : null;
    const initialEventId =
      queryEventId && events.value.some((entry) => entry.id === queryEventId)
        ? queryEventId
        : selectedEventId.value && events.value.some((entry) => entry.id === selectedEventId.value)
          ? selectedEventId.value
          : events.value[0]?.id || null;
    if (initialEventId) {
      await selectEvent(initialEventId);
    }
  } finally {
    listLoading.value = false;
  }
};

const selectEvent = async (eventId: string) => {
  if (!eventId) return;
  if (selectedEventId.value === eventId && selectedEvent.value) return;
  selectedEventId.value = eventId;
  await syncSelectedEventToQuery(eventId);
  activeTomTab.value = "overview";
  userPinnedTab.value = "overview";
  pendingTomXml.value = null;
  pendingTomFileName.value = null;
  demoPlayer.value = null;
  demoRun.value = null;
  if (fileInputRef.value) fileInputRef.value.value = "";
  await loadSelectedEventDetails();
  startAdminStateStream();
};

const onSelectEventChange = async () => {
  if (!selectedEventId.value) return;
  await selectEvent(selectedEventId.value);
};

const loadSelectedEventDetails = async () => {
  if (!selectedEventId.value) return;
  detailsLoading.value = true;
  detailsError.value = null;
  try {
    const response = await $fetch<{ success: boolean; event: SelectedEvent }>(`/api/admin/events/${selectedEventId.value}/details`);
    if (!response.success) {
      detailsError.value = "Failed to load tournament details.";
      return;
    }
    selectedEvent.value = response.event;
    await loadTomState();
  } catch (error: any) {
    detailsError.value = error?.data?.statusMessage || "Failed to load tournament details.";
  } finally {
    detailsLoading.value = false;
  }
};

const loadTomState = async (
  optionsOrEvent: { background?: boolean } | Event = {},
) => {
  if (!selectedEventId.value) return;
  const requestId = ++tomStateRequestSeq;
  const eventIdAtRequestStart = selectedEventId.value;
  const background =
    typeof optionsOrEvent === "object" &&
    optionsOrEvent !== null &&
    "background" in optionsOrEvent &&
    optionsOrEvent.background === true;
  if (background) {
    tomRefreshing.value = true;
  } else {
    tomLoading.value = true;
    tomStateError.value = null;
  }
  try {
    const response = await $fetch<{ success: boolean; hasTomState: boolean; importedAt?: string; updatedAt?: string; metadata?: TomMetadata; state?: { players: TomPlayerView[]; divisions: TomDivisionView[]; roundsDetailed: TomRoundView[]; currentRound: { number: number; matches: TomMatchView[] } | null } }>(`/api/admin/tournaments/${selectedEventId.value}/tom-bridge/state`);
    if (requestId !== tomStateRequestSeq || selectedEventId.value !== eventIdAtRequestStart) {
      return;
    }
    const nextFingerprint = response.hasTomState
      ? `${response.updatedAt || "none"}:${response.state?.currentRound?.number || 0}:${response.state?.players?.length || 0}:${response.state?.roundsDetailed?.length || 0}:${response.metadata?.reports?.length || 0}`
      : "no-state";

    if (
      response.hasTomState &&
      tomStateFingerprint.value === nextFingerprint
    ) {
      if (activeTomTab.value === "roster" && demoPlayer.value && demoRun.value) {
        // Keep demo view fresh only when user actively opened it.
        await fetchDemoPlayerRun(demoPlayer.value.userId);
      }
      return;
    }

    tomStateFingerprint.value = nextFingerprint;
    tomStateLoaded.value = response.hasTomState;
    if (!response.hasTomState || !response.state) {
      tomPlayers.value = [];
      tomDivisions.value = [];
      tomRoundsDetailed.value = [];
      tomCurrentRoundNumber.value = null;
      tomMetadata.value = null;
      tomStateFingerprint.value = "no-state";
      return;
    }
    tomImportedAt.value = response.importedAt || null;
    tomUpdatedAt.value = response.updatedAt || null;
    tomMetadata.value = response.metadata || null;
    tomPlayers.value = response.state.players;
    tomDivisions.value = response.state.divisions || [];
    tomRoundsDetailed.value = response.state.roundsDetailed || [];
    tomCurrentRoundNumber.value = response.state.currentRound?.number || null;
    if (response.state.currentRound?.number) {
      const currentRoundTab = `round-${response.state.currentRound.number}`;
      const preferredTab = userPinnedTab.value || activeTomTab.value;
      const isCurrentTabValid =
        preferredTab === "overview" ||
        preferredTab === "roster" ||
        tomRoundsDetailed.value.some(
          (round) => `round-${round.number}` === preferredTab,
        );
      if (!isCurrentTabValid) {
        activeTomTab.value = currentRoundTab;
        userPinnedTab.value = currentRoundTab;
      } else if (preferredTab !== activeTomTab.value) {
        activeTomTab.value = preferredTab;
      }
    }
    if (activeTomTab.value === "roster" && demoPlayer.value) {
      await fetchDemoPlayerRun(demoPlayer.value.userId);
    }
  } catch (error: any) {
    if (!background) {
      tomStateError.value = error?.data?.statusMessage || "Failed to load TOM state.";
    }
  } finally {
    if (background) {
      tomRefreshing.value = false;
    } else {
      tomLoading.value = false;
    }
  }
};

const requestTomStateRefresh = async () => {
  if (!selectedEventId.value || tomImporting.value || tomResultSaving.value) {
    return;
  }
  if (tomRefreshInFlight) {
    tomRefreshQueued = true;
    return;
  }

  tomRefreshInFlight = true;
  try {
    do {
      tomRefreshQueued = false;
      await loadTomState({ background: true });
    } while (tomRefreshQueued);
  } finally {
    tomRefreshInFlight = false;
  }
};

const onTomFileSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target?.files?.[0];
  if (!file) {
    pendingTomXml.value = null;
    pendingTomFileName.value = null;
    return;
  }
  pendingTomXml.value = await file.text();
  pendingTomFileName.value = file.name;
};

const importTomXml = async () => {
  if (!selectedEventId.value || !pendingTomXml.value) return;
  tomImporting.value = true;
  tomStateError.value = null;
  tomSuccessMessage.value = null;
  try {
    await $fetch(`/api/admin/tournaments/${selectedEventId.value}/tom-bridge/import`, { method: "POST", body: { xml: pendingTomXml.value, fileName: pendingTomFileName.value || undefined } });
    pendingTomXml.value = null;
    pendingTomFileName.value = null;
    if (fileInputRef.value) fileInputRef.value.value = "";
    await loadTomState();
  } catch (error: any) {
    tomStateError.value = error?.data?.statusMessage || "Failed to import TOM XML.";
  } finally {
    tomImporting.value = false;
  }
};

const releaseCurrentRound = async () => {
  if (!selectedEventId.value) return;
  tomLoading.value = true;
  tomStateError.value = null;
  tomSuccessMessage.value = null;
  try {
    const result = await $fetch<{ success: boolean; releasedRound: number }>(`/api/admin/tournaments/${selectedEventId.value}/tom-bridge/release-round`, {
      method: "POST",
    });
    tomSuccessMessage.value = `Runde ${result.releasedRound} wurde für Spieler freigegeben.`;
    await loadTomState();
  } catch (error: any) {
    tomStateError.value = error?.data?.statusMessage || "Failed to release current round.";
  } finally {
    tomLoading.value = false;
  }
};

const exportTomXml = async (mode: "current" | "source" | "snapshot" = "current", snapshotId?: string) => {
  if (!selectedEventId.value) return;
  const params = new URLSearchParams();
  params.set("mode", mode);
  if (mode === "snapshot" && snapshotId) {
    params.set("snapshotId", snapshotId);
  }
  const response = await fetch(`/api/admin/tournaments/${selectedEventId.value}/tom-bridge/export?${params.toString()}`, { credentials: "include" });
  if (!response.ok) {
    tomStateError.value = mode === "current"
      ? "Failed to export current TOM results."
      : "Failed to export TOM snapshot.";
    return;
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tournament_${selectedEventId.value}_${mode}.tdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const setTomMatchOutcome = async (roundNumber: number, match: TomMatchView, outcome: number) => {
  if (!selectedEventId.value) return;
  tomResultSaving.value = true;
  try {
    await $fetch(`/api/admin/tournaments/${selectedEventId.value}/tom-bridge/apply-results`, {
      method: "POST",
      body: { updates: [{ roundNumber, tableNumber: match.tableNumber, player1UserId: match.player1UserId, player2UserId: match.player2UserId, divisionCategory: match.divisionCategory, outcome }] },
    });
    await loadTomState();
  } finally {
    tomResultSaving.value = false;
  }
};

const resolveConflict = async (roundNumber: number, match: TomMatchView, outcome: number) => {
  if (!selectedEventId.value) return;
  tomResultSaving.value = true;
  try {
    await $fetch(`/api/admin/tournaments/${selectedEventId.value}/tom-bridge/resolve-report`, {
      method: "POST",
      body: {
        update: {
          roundNumber,
          tableNumber: match.tableNumber,
          player1UserId: match.player1UserId,
          player2UserId: match.player2UserId,
          divisionCategory: match.divisionCategory,
          outcome,
        },
      },
    });
    await loadTomState();
  } finally {
    tomResultSaving.value = false;
  }
};

const activeRoundView = computed<TomRoundView | null>(() => {
  if (!activeTomTab.value.startsWith("round-")) return null;
  const roundNumber = Number.parseInt(activeTomTab.value.replace("round-", ""), 10);
  return tomRoundsDetailed.value.find((round) => round.number === roundNumber) || null;
});

const hasPendingCurrentRound = computed(() => {
  if (!tomCurrentRoundNumber.value) return false;
  const currentRound = tomRoundsDetailed.value.find(
    (round) => round.number === tomCurrentRoundNumber.value,
  );
  return !!currentRound?.matches?.some((match) => match.outcome === 0);
});

const roundTabLabel = (round: TomRoundView) => {
  const typeLabel = round.type === 1 ? "Top Cut" : "Swiss";
  return `Runde ${round.number} · ${typeLabel}`;
};

const latestImportInfo = computed(() => {
  const history = tomMetadata.value?.importHistory || [];
  if (!history.length) return null;
  return history[history.length - 1];
});

const updateTournamentStatus = async (status: "upcoming" | "ongoing" | "on_hold" | "completed" | "cancelled") => {
  if (!selectedEvent.value) return;
  statusSaving.value = true;
  try {
    await $fetch(`/api/admin/custom-events?id=${selectedEvent.value.id}`, { method: "PUT", body: { status } });
    await Promise.all([loadEvents(), loadSelectedEventDetails()]);
  } finally {
    statusSaving.value = false;
  }
};

const playerNameByTomId = (userId?: string) => {
  if (!userId) return "—";
  const found = tomPlayers.value.find((p) => p.userId === userId);
  return found?.displayName || userId;
};

const playerCellClass = (match: TomMatchView, side: "p1" | "p2") => {
  if (match.outcome === 3) return "draw-cell";
  if (match.outcome === 8) return "dgl-cell";
  if (match.outcome === 1 && side === "p1") return "winner-cell";
  if (match.outcome === 2 && side === "p2") return "winner-cell";
  if (match.outcome === 5 && side === "p1") return "winner-cell";
  return "";
};

const outcomeCellClass = (match: TomMatchView) => {
  if (match.outcome === 3) return "draw-cell";
  if (match.outcome === 8) return "dgl-cell";
  return "";
};

const reportStatusForMatch = (roundNumber: number, match: TomMatchView): TomReportStatus | null => {
  const reports = tomMetadata.value?.reports || [];
  const related = reports.filter((report) =>
    report.roundNumber === roundNumber &&
    (report.divisionCategory || "") === (match.divisionCategory || "") &&
    (report.tableNumber ?? null) === (match.tableNumber ?? null) &&
    (report.player1UserId || "") === (match.player1UserId || "") &&
    (report.player2UserId || "") === (match.player2UserId || ""),
  );
  if (related.length === 0) return null;
  if (related.some((report) => report.status === "conflicted")) return "conflicted";
  if (related.some((report) => report.status === "pending")) return "pending";
  if (related.some((report) => report.status === "admin_overridden")) return "admin_overridden";
  return "finalized";
};

const reportsForMatch = (roundNumber: number, match: TomMatchView): TomReportMeta[] => {
  const reports = tomMetadata.value?.reports || [];
  return reports.filter((report) =>
    report.roundNumber === roundNumber &&
    (report.divisionCategory || "") === (match.divisionCategory || "") &&
    (report.tableNumber ?? null) === (match.tableNumber ?? null) &&
    (report.player1UserId || "") === (match.player1UserId || "") &&
    (report.player2UserId || "") === (match.player2UserId || ""),
  );
};

const reportStatusLabel = (roundNumber: number, match: TomMatchView) => {
  const status = reportStatusForMatch(roundNumber, match);
  if (!status) return "none";
  if (status === "pending") return "pending";
  if (status === "conflicted") return "conflict";
  if (status === "admin_overridden") return "admin";
  return "final";
};

const reportStatusClass = (roundNumber: number, match: TomMatchView) => {
  const status = reportStatusForMatch(roundNumber, match);
  if (status === "pending") return "status-hold";
  if (status === "conflicted") return "status-cancelled";
  if (status === "admin_overridden") return "status-upcoming";
  if (status === "finalized") return "status-ongoing";
  return "";
};

const reportSummaryLine = (report: TomReportMeta) => {
  const reporter = playerNameByTomId(report.reporterUserId);
  const result = report.reporterResult || "reported";
  return `${reporter}: ${result}`;
};

const pendingSecondsLeft = (report: TomReportMeta) => {
  if (!report.createdAt || report.status !== "pending") return null;
  const left = Math.ceil((new Date(report.createdAt).getTime() + 30_000 - nowTick.value) / 1000);
  return Math.max(0, left);
};

const fetchDemoPlayerRun = async (playerUserId: string) => {
  if (!selectedEventId.value) return;
  demoLoading.value = true;
  demoError.value = null;
  try {
    const response = await $fetch<{ success: boolean; run: PlayerRunResponse }>(`/api/admin/tournaments/${selectedEventId.value}/tom-bridge/player-view?playerUserId=${encodeURIComponent(playerUserId)}`);
    demoRun.value = response.run;
  } catch (error: any) {
    demoError.value = error?.data?.statusMessage || "Failed to load player run.";
  } finally {
    demoLoading.value = false;
  }
};

const openDemoPlayer = async (player: TomPlayerView) => {
  demoPlayer.value = player;
  await fetchDemoPlayerRun(player.userId);
};

const openFullPlayerView = (player: TomPlayerView) => {
  if (!selectedEventId.value) return;
  $fetch<{ success: boolean; url: string }>(
    `/api/admin/tournaments/${selectedEventId.value}/tom-bridge/viewer-token?playerUserId=${encodeURIComponent(player.userId)}`,
  )
    .then((response) => {
      window.open(response.url, "_blank", "noopener,noreferrer");
    })
    .catch(() => {
      tomStateError.value = "Konnte Turnieransicht-Link nicht erzeugen.";
    });
};

const startNowTickTimer = () => {
  stopNowTickTimer();
  nowTickTimer = setInterval(() => {
    nowTick.value = Date.now();
  }, 1000);
};

const stopNowTickTimer = () => {
  if (nowTickTimer) {
    clearInterval(nowTickTimer);
    nowTickTimer = null;
  }
};

const startAdminStateStream = () => {
  stopAdminStateStream();
  if (!selectedEventId.value) return;
  lastAdminStreamUpdatedAt = "";
  adminStateStream = new EventSource(
    `/api/admin/tournaments/${selectedEventId.value}/tom-bridge/stream`,
    { withCredentials: true },
  );
  adminStateStream.onmessage = async (event) => {
    try {
      const payload = JSON.parse(event.data || "{}") as { updatedAt?: string; heartbeat?: number };
      if (payload.updatedAt) {
        if (payload.updatedAt === lastAdminStreamUpdatedAt) {
          return;
        }
        lastAdminStreamUpdatedAt = payload.updatedAt;
        await requestTomStateRefresh();
      }
    } catch {
      // ignore malformed stream payload
    }
  };
  adminStateStream.onerror = () => {
    stopAdminStateStream();
  };
};

const stopAdminStateStream = () => {
  if (!adminStateStream) return;
  adminStateStream.close();
  adminStateStream = null;
};

const formatDate = (value: string) => new Date(value).toLocaleString("de-DE", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

const statusClass = (status: string) => {
  if (status === "ongoing") return "status-ongoing";
  if (status === "on_hold") return "status-hold";
  if (status === "completed") return "status-completed";
  if (status === "cancelled") return "status-cancelled";
  return "status-upcoming";
};

onMounted(async () => {
  await loadEvents();
  startNowTickTimer();
  startAdminStateStream();
});

onBeforeUnmount(() => {
  stopNowTickTimer();
  stopAdminStateStream();
});
</script>

<style scoped>
@import "~/assets/css/admin-shared.css";
.tm-layout { display: grid; grid-template-columns: 1fr; gap: 1rem; }
.tm-header { display: flex; justify-content: space-between; align-items: center; }
.tm-selector-panel, .tm-control-panel { min-height: auto; }
.tm-selector-controls { display: grid; grid-template-columns: minmax(240px, 1fr) minmax(260px, 420px); gap: 0.6rem; }
.tm-input, .tm-select {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
  font-size: 0.9rem;
  background: var(--app-surface-1);
  color: var(--app-text-primary);
}
.tm-input:focus, .tm-select:focus { outline: none; border-color: var(--app-accent); box-shadow: 0 0 0 3px var(--app-focus-ring); }
.tm-title-row { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 1rem; }
.tm-title { margin: 0; font-size: 1.35rem; color: var(--app-text-primary); }
.tm-subtitle { margin: 0.3rem 0 0; color: var(--app-text-muted); }
.tm-import-panel { border: 1px solid var(--app-border); background: var(--app-surface-1); border-radius: 10px; padding: 0.8rem; margin-bottom: 1rem; }
.tm-import-actions { display: flex; flex-wrap: wrap; gap: 0.55rem; align-items: center; }
.tm-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
.tm-tab { border: 1px solid var(--app-border); background: var(--app-surface-1); color: var(--app-text-secondary); border-radius: 999px; padding: 0.35rem 0.8rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.tm-tab.active { border-color: var(--app-button-blue-border); background: var(--app-badge-info-bg); color: var(--app-badge-info-text); }
.tm-overview { display: grid; gap: 0.9rem; }
.tm-overview-division { border: 1px solid var(--app-border); border-radius: 10px; padding: 0.7rem; background: var(--app-surface-1); }
.tm-overview-title { margin: 0 0 0.6rem; color: var(--app-text-primary); font-size: 1rem; }
.tm-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.tm-roster-row { cursor: pointer; }
.tm-roster-row.active { background: var(--app-feedback-info-bg); }
.tm-demo-panel { margin-top: 0.8rem; padding: 0.8rem; border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-surface-1); }
.tm-report-lines { margin-top: 0.35rem; }
.tm-report-line { margin: 0; color: var(--app-text-muted); font-size: 0.75rem; }
.winner-cell { background: var(--app-badge-success-bg); color: var(--app-badge-success-text); font-weight: 700; }
.draw-cell { background: var(--app-badge-warning-bg); color: var(--app-badge-warning-text); font-weight: 600; }
.dgl-cell { background: var(--app-badge-error-bg); color: var(--app-badge-error-text); font-weight: 700; }
.status-pill { display: inline-flex; border-radius: 999px; padding: 0.2rem 0.65rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
.status-pill.large { font-size: 0.82rem; padding: 0.3rem 0.85rem; }
.status-upcoming { background: var(--app-badge-info-bg); color: var(--app-badge-info-text); }
.status-ongoing { background: var(--app-badge-success-bg); color: var(--app-badge-success-text); }
.status-hold { background: var(--app-badge-warning-bg); color: var(--app-badge-warning-text); }
.status-completed { background: var(--app-surface-2); color: var(--app-text-secondary); }
.status-cancelled { background: var(--app-badge-error-bg); color: var(--app-badge-error-text); }
.tm-state { color: var(--app-text-muted); padding: 1rem 0; }
.tm-error { background: var(--app-feedback-error-bg); color: var(--app-feedback-error-text); padding: 0.8rem; border-radius: 10px; border: 1px solid var(--app-feedback-error-border); }
.tm-error-inline { color: var(--app-feedback-error-text); margin-top: 0.6rem; font-size: 0.875rem; }
.tm-success-inline { color: var(--app-feedback-success-text); margin-top: 0.6rem; font-size: 0.875rem; font-weight: 600; }
.tm-meta { margin: 0 0 0.6rem; color: var(--app-text-muted); font-size: 0.85rem; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
@media (max-width: 960px) {
  .tm-selector-controls { grid-template-columns: 1fr; }
}
</style>
