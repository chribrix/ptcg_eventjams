<template>
  <div class="tm-player-page">
    <div class="tm-player-shell">
      <header class="tm-player-header">
        <h1>{{ t("tournamentPlayer.title") }}</h1>
        <p v-if="runData">
          {{ runData.score.wins }}-{{ runData.score.losses }}-{{ runData.score.ties }} • {{ t("tournamentPlayer.points", { count: runData.score.points }) }}
        </p>
      </header>

      <section class="tm-player-card">
        <div class="tm-player-row">
          <h2>{{ t("tournamentPlayer.currentRound") }}</h2>
          <button class="btn btn-secondary btn-small" :disabled="loading" @click="loadRun(true)">{{ t("tournamentPlayer.refresh") }}</button>
        </div>

        <div v-if="loading && !runData" class="tm-state">{{ t("tournamentPlayer.loadingState") }}</div>
        <div v-else-if="error" class="tm-error">{{ error }}</div>
        <template v-else-if="runData">
          <div v-if="runData.currentMatch" class="tm-current">
            <p><strong>{{ t("tournamentPlayer.roundLabel") }}</strong> {{ runData.currentMatch.roundNumber }}</p>
            <p><strong>{{ t("tournamentPlayer.divisionLabel") }}</strong> {{ runData.currentMatch.divisionCategory || "—" }}</p>
            <p class="tm-current-keyline"><strong>{{ t("tournamentPlayer.tableLabel") }}</strong> {{ runData.currentMatch.tableNumber || "—" }}</p>
            <p class="tm-current-keyline"><strong>{{ t("tournamentPlayer.opponentLabel") }}</strong> {{ opponentName(runData.currentMatch.opponentUserId) }}</p>
            <p><strong>{{ t("tournamentPlayer.statusLabel") }}</strong> {{ formatOutcomeLabel(runData.currentMatch.outcomeLabel) }}</p>
            <p v-if="runData.reports?.opponentReported" class="tm-warning">{{ t("tournamentPlayer.opponentReported") }}</p>
            <p class="tm-meta">{{ t("tournamentPlayer.disputeWindow", { seconds: runData.reports?.disputeWindowSeconds || 30 }) }}</p>
            <p v-if="isImpersonationView" class="tm-meta">{{ t("tournamentPlayer.impersonationView") }}</p>
            <div class="tm-actions">
              <button class="btn btn-primary" :disabled="submitting || isImpersonationView" @click="submitResult('win')">{{ t("tournamentPlayer.win") }}</button>
              <button class="btn btn-danger" :disabled="submitting || isImpersonationView" @click="submitResult('loss')">{{ t("tournamentPlayer.loss") }}</button>
              <button class="btn btn-secondary" :disabled="submitting || isImpersonationView" @click="submitResult('tie')">{{ t("tournamentPlayer.draw") }}</button>
            </div>
          </div>
          <div v-else-if="runData.release && runData.release.isCurrentRoundReleased === false" class="tm-state">
            {{ t("tournamentPlayer.pairingsNotReleased") }}
          </div>
          <div v-else class="tm-state">{{ t("tournamentPlayer.noOpenPairing") }}</div>
        </template>
      </section>

      <section class="tm-player-card">
        <h2>{{ t("tournamentPlayer.myRounds") }}</h2>
        <div class="admin-table-wrapper" v-if="runData">
          <table class="admin-table">
            <thead>
              <tr><th>{{ t("tournamentPlayer.round") }}</th><th>{{ t("tournamentPlayer.division") }}</th><th>{{ t("tournamentPlayer.opponent") }}</th><th>{{ t("tournamentPlayer.table") }}</th><th>{{ t("tournamentPlayer.result") }}</th></tr>
            </thead>
            <tbody>
              <tr
                v-for="(match, idx) in sortedPlayerMatches"
                :key="`${match.roundNumber}-${idx}`"
                :class="rowClass(match)"
              >
                <td>{{ match.roundNumber }}</td>
                <td>{{ match.divisionCategory || "—" }}</td>
                <td>{{ opponentName(match.opponentUserId) }}</td>
                <td>{{ match.tableNumber || "—" }}</td>
                <td>{{ formatOutcomeLabel(match.outcomeLabel) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
type PlayerRun = {
  playerMatches: Array<{
    roundNumber: number;
    divisionCategory?: string;
    opponentUserId?: string;
    tableNumber?: number;
    outcomeLabel: string;
    player1UserId?: string;
    player2UserId?: string;
  }>;
  score: { wins: number; losses: number; ties: number; points: number };
  currentMatch: {
    roundNumber: number;
    divisionCategory?: string;
    opponentUserId?: string;
    tableNumber?: number;
    outcomeLabel: string;
    player1UserId?: string;
    player2UserId?: string;
  } | null;
  reports?: { opponentReported?: boolean; disputeWindowSeconds?: number };
  release?: { pairingsReleasedRound?: number; isCurrentRoundReleased?: boolean };
  stateView?: { players?: Array<{ userId: string; displayName?: string; firstName?: string; lastName?: string }> };
};

const route = useRoute();
const eventId = computed(() => String(route.params.eventId || ""));
const viewerToken = computed(() => (typeof route.query.viewer === "string" ? route.query.viewer : ""));
const isImpersonationView = computed(() => viewerToken.value.length > 0);

const loading = ref(false);
const submitting = ref(false);
const error = ref<string | null>(null);
const runData = ref<PlayerRun | null>(null);
let pollTimer: ReturnType<typeof setInterval> | null = null;
let eventStream: EventSource | null = null;

const sortedPlayerMatches = computed(() => {
  const matches = runData.value?.playerMatches ? [...runData.value.playerMatches] : [];
  const currentRound = runData.value?.currentMatch?.roundNumber;
  return matches.sort((a, b) => {
    const aCurrent = currentRound !== undefined && a.roundNumber === currentRound;
    const bCurrent = currentRound !== undefined && b.roundNumber === currentRound;
    if (aCurrent && !bCurrent) return -1;
    if (!aCurrent && bCurrent) return 1;
    return b.roundNumber - a.roundNumber;
  });
});

const isCurrentRoundMatch = (match: PlayerRun["playerMatches"][number]) => {
  return !!runData.value?.currentMatch && match.roundNumber === runData.value.currentMatch.roundNumber;
};

const formatOutcomeLabel = (label: string) => {
  if (label === "pending") return t("tournamentPlayer.outcomes.pending");
  if (label === "player1_win" || label === "player2_win") return t("tournamentPlayer.outcomes.winLossRecorded");
  if (label === "draw_or_split") return t("tournamentPlayer.outcomes.draw");
  if (label === "bye") return t("tournamentPlayer.outcomes.byeWin");
  if (label === "double_loss_or_no_result") return t("tournamentPlayer.outcomes.doubleGameLoss");
  return label;
};

const rowClass = (match: PlayerRun["playerMatches"][number]) => {
  const classes: Record<string, boolean> = {
    "tm-current-row": isCurrentRoundMatch(match),
    "tm-draw-row": match.outcomeLabel === "draw_or_split",
    "tm-dgl-row": match.outcomeLabel === "double_loss_or_no_result",
  };
  return classes;
};

const opponentName = (userId?: string) => {
  if (!userId) return "BYE";
  const players = runData.value?.stateView?.players || [];
  const found = players.find((player) => player.userId === userId);
  if (!found) return userId;
  return found.displayName || `${found.firstName || ""} ${found.lastName || ""}`.trim() || userId;
};

const loadRun = async (silent = false) => {
  if (!eventId.value) return;
  if (!silent) loading.value = true;
  error.value = null;
  try {
    if (isImpersonationView.value) {
      const response = await $fetch<{ success: boolean; run: PlayerRun }>(`/api/admin/tournaments/${eventId.value}/tom-bridge/player-view?viewer=${encodeURIComponent(viewerToken.value)}`);
      runData.value = response.run;
    } else {
      const response = await $fetch<{ success: boolean; run: PlayerRun }>(`/api/tournaments/${eventId.value}/tom-bridge/me`);
      runData.value = response.run;
    }
  } catch (err: any) {
    error.value = err?.data?.statusMessage || t("tournamentPlayer.errorLoad");
  } finally {
    loading.value = false;
  }
};

const submitResult = async (result: "win" | "loss" | "tie") => {
  if (!eventId.value || !runData.value?.currentMatch) return;
  submitting.value = true;
  error.value = null;
  try {
    await $fetch(`/api/tournaments/${eventId.value}/tom-bridge/report`, {
      method: "POST",
      body: {
        roundNumber: runData.value.currentMatch.roundNumber,
        divisionCategory: runData.value.currentMatch.divisionCategory,
        tableNumber: runData.value.currentMatch.tableNumber,
        player1UserId: runData.value.currentMatch.player1UserId,
        player2UserId: runData.value.currentMatch.player2UserId,
        result,
      },
    });
    await loadRun(true);
  } catch (err: any) {
    error.value = err?.data?.statusMessage || t("tournamentPlayer.errorSubmit");
  } finally {
    submitting.value = false;
  }
};

const startPolling = () => {
  stopPolling();
  pollTimer = setInterval(() => {
    loadRun(true);
  }, 5000);
};

const stopPolling = () => {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
};

const startEventStream = () => {
  stopEventStream();
  if (!eventId.value) return;
  const streamPath = isImpersonationView.value
    ? `/api/admin/tournaments/${eventId.value}/tom-bridge/stream`
    : `/api/tournaments/${eventId.value}/tom-bridge/stream`;
  eventStream = new EventSource(streamPath, { withCredentials: true });
  eventStream.onmessage = async () => {
    await loadRun(true);
  };
  eventStream.onerror = () => {
    stopEventStream();
  };
};

const stopEventStream = () => {
  if (!eventStream) return;
  eventStream.close();
  eventStream = null;
};

onMounted(async () => {
  await loadRun();
  startEventStream();
  startPolling();
});

onBeforeUnmount(() => {
  stopPolling();
  stopEventStream();
});
</script>

<style scoped>
@import "~/assets/css/admin-shared.css";
.tm-player-page { min-height: 100vh; background: #f1f5f9; padding: 1rem; }
.tm-player-shell { max-width: 960px; margin: 0 auto; display: grid; gap: 1rem; }
.tm-player-header { background: #0f172a; color: #f8fafc; border-radius: 12px; padding: 1rem; }
.tm-player-header h1 { margin: 0; font-size: 1.4rem; }
.tm-player-header p { margin: 0.35rem 0 0; color: #cbd5e1; }
.tm-player-card { background: #ffffff; border: 1px solid #dbe2ea; border-radius: 12px; padding: 1rem; }
.tm-player-row { display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; margin-bottom: 0.6rem; }
.tm-current p { margin: 0.2rem 0; }
.tm-current-keyline { font-size: 1.03rem; font-weight: 700; color: #0f172a; }
.tm-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.8rem; }
.tm-state { color: #64748b; }
.tm-error { background: #fef2f2; color: #b91c1c; padding: 0.7rem; border: 1px solid #fecaca; border-radius: 8px; }
.tm-warning { color: #b45309; font-weight: 600; margin-top: 0.4rem; }
.tm-meta { color: #64748b; font-size: 0.9rem; margin-top: 0.35rem; }
.tm-current-row { background: #ecfeff; }
.tm-draw-row { background: #fef9c3; }
.tm-dgl-row { background: #fee2e2; color: #991b1b; font-weight: 600; }
</style>
