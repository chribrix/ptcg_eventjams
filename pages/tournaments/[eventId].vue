<template>
  <NuxtPage v-if="isQrDisplayRoute" />
  <div v-else class="tm-player-page">
    <div class="tm-player-shell">
      <header class="tm-player-header">
        <p>{{ tournamentName }} Spielerseite</p>
        <h1>{{ playerName }}</h1>
      </header>

      <section v-if="guestAccessRequired && !isImpersonationView" class="tm-player-card tm-guest-access">
        <h2>{{ t("tournamentPlayer.guestAccessTitle") }}</h2>
        <p class="tm-meta">{{ t("tournamentPlayer.guestAccessHelp") }}</p>
        <form class="tm-guest-form" @submit.prevent="unlockGuestAccess">
          <label>
            {{ t("tournamentPlayer.playerId") }}
            <input v-model.trim="guestPlayerId" inputmode="numeric" pattern="[0-9]*" required />
          </label>
          <label>
            {{ t("tournamentPlayer.birthYear") }}
            <input v-model.trim="guestBirthYear" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required />
          </label>
          <button class="btn btn-primary" :disabled="guestAccessLoading">
            {{ t("tournamentPlayer.unlock") }}
          </button>
        </form>
        <p v-if="guestAccessError" class="tm-error">{{ guestAccessError }}</p>
      </section>

      <section
        :key="`match-card-${matchArrivalKey}`"
        class="tm-player-card tm-match-card"
        :class="{ 'tm-match-arrival': !!runData?.currentMatch && matchArrivalKey > 0 }"
      >
        <Transition name="tm-emoji-pop">
          <div v-if="emojiReaction" :key="emojiReactionKey" class="tm-emoji-reaction" aria-live="polite">{{ emojiReaction }}</div>
        </Transition>
        <div v-if="loading && !runData" class="tm-state">{{ t("tournamentPlayer.loadingState") }}</div>
        <div v-else-if="error" class="tm-error">{{ error }}</div>
        <template v-else-if="runData">
          <div v-if="runData.currentMatch" class="tm-current">
            <div class="tm-match-facts">
              <div class="tm-match-fact"><span>Runde</span><strong>{{ runData.currentMatch.roundNumber }}</strong></div>
              <div class="tm-match-fact"><span>Tisch</span><strong>{{ runData.currentMatch.tableNumber || "—" }}</strong></div>
            </div>
            <div class="tm-opponent"><span>Gegen</span><strong>{{ opponentName(runData.currentMatch.opponentUserId) }}</strong></div>
            <div v-if="runData.reports?.ownResult && !correctionMode" class="tm-submitted-result">
              <p>Deine Angabe: <strong>{{ reportedResultLabel(runData.reports.ownResult) }}</strong></p>
              <button class="tm-correct-button" @click="correctionMode = true">Ergebnis korrigieren</button>
            </div>
            <div v-else class="tm-result-actions">
              <button class="tm-result-button tm-win" :disabled="submitting" @click="submitResult('win')">{{ t("tournamentPlayer.win") }}</button>
              <button class="tm-result-button tm-loss" :disabled="submitting" @click="submitResult('loss')">{{ t("tournamentPlayer.loss") }}</button>
              <button class="tm-result-button tm-tie" :disabled="submitting" @click="submitResult('tie')">{{ t("tournamentPlayer.draw") }}</button>
            </div>
            <p v-if="runData.reports?.hasConflict" class="tm-result-conflict">
              Eure Angaben stimmen nicht überein. Bitte besprecht das Ergebnis und korrigiere deine Angabe, falls nötig. Der Veranstalter wurde informiert.
            </p>
            <p v-else-if="runData.reports?.ownResult && !runData.reports?.opponentReported" class="tm-opponent-report">
              Deine Angabe ist gespeichert. Wenn keine abweichende Angabe kommt, wird sie nach einer Minute übernommen.
            </p>
            <p v-else-if="runData.reports?.opponentReported" class="tm-opponent-report">
              Dein Gegner hat <strong>{{ reportedResultLabel(runData.reports.opponentResult!) }}</strong> angegeben. Gib dein Ergebnis aus deiner Sicht an.
            </p>
          </div>
          <div v-else-if="runData.release?.historyExpired" class="tm-state">
            <p>Diese Turnieransicht ist abgelaufen.</p>
          </div>
          <div v-else-if="runData.release?.tournamentEndedAt" class="tm-state">
            <p>Turnier beendet. Deine Rundenhistorie ist noch 24 Stunden verfügbar.</p>
          </div>
          <div v-else-if="runData.release && runData.release.isCurrentRoundReleased === false" class="tm-state">
            <div class="tm-waiting-state">
              <div class="tm-waiting-gif">
                <img
                  class="tm-waiting-gif-still"
                  src="https://media.giphy.com/media/MEF1VadKbQBdmd8LCn/giphy_s.gif"
                  alt="Warten auf die nächste Runde"
                />
                <img
                  v-if="showWaitingGif"
                  :key="waitingGifKey"
                  class="tm-waiting-gif-animation"
                  src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWFpMmx4dzlnMW5lZ2Y5cmFybG5uMGFkcWEzdmtwcHI4MDkyYnQxcyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/MEF1VadKbQBdmd8LCn/giphy.gif"
                  alt=""
                />
              </div>
              <p>Pairings werden hier angezeigt, sobald sie erstellt sind. Du musst diese Seite nicht neu laden.</p>
            </div>
          </div>
          <div v-else class="tm-state">{{ t("tournamentPlayer.noOpenPairing") }}</div>
        </template>
      </section>

      <section v-if="runData?.playerMatches?.length" class="tm-player-card tm-results-history">
        <p>Rundenhistorie</p>
        <ul>
          <li v-for="(match, index) in playerMatchesByRound" :key="`${match.roundNumber}-${index}`">
            <div>
              <strong>Runde {{ match.roundNumber }}</strong>
              <span>gegen {{ opponentName(match.opponentUserId) }} · Tisch {{ match.tableNumber || "—" }}</span>
            </div>
            <strong :class="`tm-history-result ${historyResultClass(match)}`">{{ playerResultLabel(match) }}</strong>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TOURNAMENT_RESULT_REACTIONS } from "~/utils/tournamentResultReactions";

const { t } = useI18n();
type PlayerRun = {
  playerUserId?: string;
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
  reports?: { ownResult?: "win" | "loss" | "tie"; opponentReported?: boolean; opponentResult?: "win" | "loss" | "tie"; hasConflict?: boolean; awaitingBothConfirmations?: boolean };
  release?: {
    pairingsReleasedRound?: number;
    pairingsReleasedRoundsByPod?: Record<string, number>;
    isCurrentRoundReleased?: boolean;
    tournamentEndedAt?: string;
    historyAvailableUntil?: string;
    historyExpired?: boolean;
  };
  stateView?: {
    players?: Array<{ userId: string; displayName?: string; firstName?: string; lastName?: string }>;
    tournament?: { name?: string };
    divisions?: Array<{ category: string; standings?: Array<{ userId: string; matchPoints: number; wins: number; losses: number; ties: number }> }>;
  };
};

const route = useRoute();
const eventId = computed(() => String(route.params.eventId || ""));
const isQrDisplayRoute = computed(() => route.path.endsWith("/qr"));
const viewerToken = computed(() => (typeof route.query.viewer === "string" ? route.query.viewer : ""));
const isImpersonationView = computed(() => viewerToken.value.length > 0);

const loading = ref(false);
const submitting = ref(false);
const error = ref<string | null>(null);
const guestAccessRequired = ref(false);
const guestAccessLoading = ref(false);
const guestAccessError = ref<string | null>(null);
const guestPlayerId = ref("");
const guestBirthYear = ref("");
const runData = ref<PlayerRun | null>(null);
const matchArrivalKey = ref(0);
const emojiReaction = ref("");
const emojiReactionKey = ref(0);
const correctionMode = ref(false);
const showWaitingGif = ref(false);
const waitingGifKey = ref(0);
let pollTimer: ReturnType<typeof setInterval> | null = null;
let eventStream: EventSource | null = null;
let emojiReactionTimer: ReturnType<typeof setTimeout> | null = null;
let waitingGifCycleTimer: ReturnType<typeof setTimeout> | null = null;
let waitingGifHideTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => runData.value?.currentMatch?.roundNumber,
  (roundNumber, previousRoundNumber) => {
    if (roundNumber && roundNumber !== previousRoundNumber) matchArrivalKey.value += 1;
  },
);

watch(
  () => runData.value?.reports?.ownResult,
  () => { correctionMode.value = false; },
);

const tournamentName = computed(() => runData.value?.stateView?.tournament?.name || "Chrispyjams Turnier");
const playerName = computed(() => {
  const player = runData.value?.stateView?.players?.find((entry) => entry.userId === runData.value?.playerUserId);
  return player?.displayName || "Spieler";
});

const isWaitingForPairings = computed(() =>
  !!runData.value && !runData.value.currentMatch && runData.value.release?.isCurrentRoundReleased === false,
);

const stopWaitingGif = () => {
  if (waitingGifCycleTimer) clearTimeout(waitingGifCycleTimer);
  if (waitingGifHideTimer) clearTimeout(waitingGifHideTimer);
  waitingGifCycleTimer = null;
  waitingGifHideTimer = null;
  showWaitingGif.value = false;
};

const playWaitingGif = () => {
  showWaitingGif.value = true;
  waitingGifKey.value += 1;
  waitingGifHideTimer = setTimeout(() => {
    showWaitingGif.value = false;
    waitingGifHideTimer = null;
  }, 5_000);
  waitingGifCycleTimer = setTimeout(playWaitingGif, 10_000);
};

watch(isWaitingForPairings, (isWaiting) => {
  stopWaitingGif();
  if (isWaiting) playWaitingGif();
});

const playerMatchesByRound = computed(() =>
  (runData.value?.playerMatches || [])
    .slice()
    .sort((a, b) => b.roundNumber - a.roundNumber),
);

const playerResultLabel = (match: PlayerRun["playerMatches"][number]) => {
  if (match.outcomeLabel === "pending") return "Offen";
  if (match.outcomeLabel === "draw_or_split") return "Unentschieden";
  if (match.outcomeLabel === "bye") return "Sieg";
  if (match.outcomeLabel === "double_loss_or_no_result") return "Kein Ergebnis";
  const isPlayer1 = match.player1UserId === runData.value?.playerUserId;
  if (match.outcomeLabel === "player1_win") return isPlayer1 ? "Sieg" : "Niederlage";
  if (match.outcomeLabel === "player2_win") return isPlayer1 ? "Niederlage" : "Sieg";
  return "—";
};

const reportedResultLabel = (result: "win" | "loss" | "tie") => ({
  win: "Sieg",
  loss: "Niederlage",
  tie: "Unentschieden",
}[result]);

const historyResultClass = (match: PlayerRun["playerMatches"][number]) => {
  const result = playerResultLabel(match);
  if (result === "Sieg") return "is-win";
  if (result === "Niederlage" || result === "Kein Ergebnis") return "is-loss";
  if (result === "Unentschieden") return "is-tie";
  return "is-pending";
};

const opponentName = (userId?: string) => {
  if (!userId) return "BYE";
  const players = runData.value?.stateView?.players || [];
  const found = players.find((player) => player.userId === userId);
  if (!found) return userId;
  return found.displayName || `${found.firstName || ""} ${found.lastName || ""}`.trim() || userId;
};

const playReaction = (result: "win" | "loss" | "tie") => {
  const reactions = TOURNAMENT_RESULT_REACTIONS[result];
  emojiReaction.value = reactions[Math.floor(Math.random() * reactions.length)] || "✨";
  emojiReactionKey.value += 1;
  if (emojiReactionTimer) clearTimeout(emojiReactionTimer);
  emojiReactionTimer = setTimeout(() => {
    emojiReaction.value = "";
    emojiReactionTimer = null;
  }, 1600);
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
    guestAccessRequired.value = false;
  } catch (err: any) {
    const status = err?.response?.status || err?.status || err?.statusCode || err?.data?.statusCode;
    if (!isImpersonationView.value && (status === 401 || status === 403)) {
      guestAccessRequired.value = true;
      if (!silent) error.value = null;
    } else if (!silent) {
      error.value = err?.data?.statusMessage || t("tournamentPlayer.errorLoad");
    }
  } finally {
    loading.value = false;
  }
};

const unlockGuestAccess = async () => {
  if (!eventId.value) return;
  guestAccessLoading.value = true;
  guestAccessError.value = null;
  try {
    await $fetch(`/api/tournaments/${eventId.value}/tom-bridge/guest-access`, {
      method: "POST",
      body: { playerId: guestPlayerId.value, birthYear: guestBirthYear.value },
    });
    await loadRun();
    startEventStream();
  } catch (err: any) {
    guestAccessError.value = err?.data?.statusMessage || t("tournamentPlayer.errorGuestAccess");
  } finally {
    guestAccessLoading.value = false;
  }
};

const submitResult = async (result: "win" | "loss" | "tie") => {
  if (!eventId.value || !runData.value?.currentMatch) return;
  submitting.value = true;
  error.value = null;
  playReaction(result);
  try {
    const body = {
      roundNumber: runData.value.currentMatch.roundNumber,
      divisionCategory: runData.value.currentMatch.divisionCategory,
      tableNumber: runData.value.currentMatch.tableNumber,
      player1UserId: runData.value.currentMatch.player1UserId,
      player2UserId: runData.value.currentMatch.player2UserId,
      result,
    };
    await $fetch(isImpersonationView.value
      ? `/api/admin/tournaments/${eventId.value}/tom-bridge/viewer-report`
      : `/api/tournaments/${eventId.value}/tom-bridge/report`, {
      method: "POST",
      body: isImpersonationView.value ? { ...body, viewer: viewerToken.value } : body,
    });
    await loadRun(true);
    correctionMode.value = false;
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
  stopWaitingGif();
  if (emojiReactionTimer) clearTimeout(emojiReactionTimer);
});
</script>

<style scoped>
@import "~/assets/css/admin-shared.css";
.tm-player-page { min-height: 100%; background: transparent; color: var(--app-text-primary); padding: clamp(1rem, 3vw, 2.5rem) 1rem; }
.tm-player-shell { width: min(100%, 680px); margin: 0 auto; display: grid; gap: 1rem; }
.tm-player-header { padding: 0.35rem 0 0.55rem; }
.tm-player-header h1 { margin: 0.15rem 0 0; font-size: clamp(1.55rem, 6vw, 2.05rem); font-weight: 600; line-height: 1.1; color: var(--app-text-muted); }
.tm-player-header p { margin: 0; color: var(--app-text-muted); font-size: 0.85rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.tm-player-card { background: var(--app-surface-1); border: 1px solid var(--app-border); border-radius: 16px; padding: clamp(1rem, 4vw, 1.6rem); box-shadow: 0 8px 24px rgb(0 0 0 / 8%); }
.tm-match-card { position: relative; padding: clamp(1.2rem, 4vw, 1.75rem); }
.tm-match-arrival { animation: tm-rainbow-led 3.2s ease-out both; }
.tm-guest-access { border-color: var(--app-accent); }
.tm-guest-form { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; gap: 0.75rem; align-items: end; }
.tm-guest-form label { display: grid; gap: 0.3rem; font-weight: 700; color: var(--app-text-secondary); }
.tm-guest-form input { border: 1px solid var(--app-border); border-radius: 10px; padding: 0.65rem 0.75rem; background: var(--app-surface-0); color: var(--app-text-primary); font: inherit; }
.tm-match-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.tm-match-fact { display: grid; gap: 0.2rem; padding: 0.95rem 1rem; border-radius: 12px; background: var(--app-surface-2); border: 1px solid var(--app-border); }
.tm-match-fact span, .tm-opponent span { color: var(--app-text-muted); font-size: 0.82rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
.tm-match-fact strong { color: var(--app-text-primary); font-size: clamp(2rem, 10vw, 3.2rem); line-height: 1; }
.tm-opponent { display: grid; gap: 0.35rem; margin-top: 1.35rem; text-align: center; }
.tm-opponent strong { color: var(--app-text-primary); font-size: clamp(1.7rem, 7.5vw, 2.7rem); line-height: 1.08; overflow-wrap: anywhere; }
.tm-result-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; margin: 1.75rem auto 0; max-width: 520px; }
.tm-result-button { min-height: 4rem; border: 1px solid var(--app-border); border-radius: 12px; padding: 0.65rem 0.35rem; font: inherit; font-size: clamp(0.88rem, 4vw, 1.05rem); font-weight: 800; line-height: 1.1; cursor: pointer; transition: transform 120ms ease, filter 120ms ease; }
.tm-result-button:not(:disabled):active { transform: scale(0.98); }
.tm-result-button:disabled { cursor: not-allowed; opacity: 1; filter: saturate(0.55) brightness(0.92); }
.tm-win { background: #67d979; border-color: #28783a; color: #102b17; }
.tm-win:not(:disabled):hover { background: #4cc962; }
.tm-loss { background: #ff8b86; border-color: #9b2927; color: #41110f; }
.tm-tie { background: var(--app-surface-2); color: var(--app-text-primary); }
.tm-tie { grid-column: 1 / -1; width: min(100%, 250px); justify-self: center; }
:global(html[data-theme="dark"]) .tm-win { background: #15803d; border-color: #166534; color: #ffffff; }
:global(html[data-theme="dark"]) .tm-win:not(:disabled):hover { background: #166534; }
:global(html[data-theme="dark"]) .tm-loss { background: var(--app-button-red); border-color: var(--app-button-red-border); color: var(--app-button-red-text); }
.tm-submitted-result { display: grid; justify-items: center; gap: 0.8rem; margin: 1.75rem auto 0; text-align: center; }
.tm-submitted-result p { margin: 0; color: var(--app-text-secondary); font-size: 1rem; }
.tm-submitted-result strong { color: var(--app-text-primary); }
.tm-correct-button { border: 1px solid var(--app-border); border-radius: 10px; padding: 0.65rem 1rem; background: var(--app-surface-2); color: var(--app-text-primary); font: inherit; font-weight: 700; cursor: pointer; }
.tm-correct-button:hover { border-color: var(--app-accent); }
.tm-opponent-report { margin: 1rem 0 0; color: var(--app-text-secondary); font-size: 0.9rem; line-height: 1.4; }
.tm-opponent-report strong { color: var(--app-text-primary); }
.tm-result-conflict { margin: 1rem 0 0; padding: 0.8rem 0.9rem; border: 1px solid var(--app-feedback-error-border); border-radius: 10px; background: var(--app-feedback-error-bg); color: var(--app-feedback-error-text); font-size: 0.9rem; font-weight: 650; line-height: 1.4; }
.tm-emoji-reaction { position: absolute; z-index: 2; top: 50%; left: 50%; pointer-events: none; font-size: clamp(3.5rem, 16vw, 6rem); line-height: 1; filter: drop-shadow(0 8px 14px rgb(0 0 0 / 35%)); transform: translate(-50%, -50%); }
.tm-emoji-pop-enter-active { animation: tm-emoji-burst 1.6s ease-out both; }
.tm-emoji-pop-leave-active { transition: opacity 180ms ease; }
.tm-emoji-pop-leave-to { opacity: 0; }
.tm-results-history p { margin: 0; color: var(--app-text-muted); font-size: 0.82rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
.tm-results-history ul { display: grid; gap: 0.5rem; margin: 0.8rem 0 0; padding: 0; list-style: none; }
.tm-results-history li { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.75rem 0; border-top: 1px solid var(--app-border); color: var(--app-text-secondary); }
.tm-results-history li > div { display: grid; gap: 0.18rem; min-width: 0; }
.tm-results-history li > div strong { color: var(--app-text-primary); }
.tm-results-history li > div span { overflow: hidden; color: var(--app-text-muted); font-size: 0.88rem; text-overflow: ellipsis; white-space: nowrap; }
.tm-history-result { flex: 0 0 auto; font-size: 0.9rem; }
.tm-history-result.is-win { color: var(--app-button-green-text); }
.tm-history-result.is-loss { color: var(--app-button-red-text); }
.tm-history-result.is-tie, .tm-history-result.is-pending { color: var(--app-text-secondary); }
@keyframes tm-rainbow-led {
  0% { border-color: #ff3864; box-shadow: 0 0 0 2px rgb(255 56 100 / 70%), 0 0 20px 4px rgb(255 56 100 / 48%); }
  18% { border-color: #ffb703; box-shadow: 0 0 0 2px rgb(255 183 3 / 70%), 0 0 24px 5px rgb(255 183 3 / 48%); }
  36% { border-color: #5eead4; box-shadow: 0 0 0 2px rgb(94 234 212 / 70%), 0 0 24px 5px rgb(94 234 212 / 48%); }
  54% { border-color: #60a5fa; box-shadow: 0 0 0 2px rgb(96 165 250 / 70%), 0 0 24px 5px rgb(96 165 250 / 48%); }
  72% { border-color: #c084fc; box-shadow: 0 0 0 2px rgb(192 132 252 / 70%), 0 0 24px 5px rgb(192 132 252 / 48%); }
  88% { border-color: #fb7185; box-shadow: 0 0 0 2px rgb(251 113 133 / 55%), 0 0 18px 3px rgb(251 113 133 / 35%); }
  100% { border-color: var(--app-border); box-shadow: 0 8px 24px rgb(0 0 0 / 8%); }
}
@keyframes tm-emoji-burst {
  0% { opacity: 0; transform: translate(-50%, -20%) scale(0.35) rotate(-12deg); }
  20% { opacity: 1; transform: translate(-50%, -55%) scale(1.18) rotate(8deg); }
  70% { opacity: 1; transform: translate(-50%, -85%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -120%) scale(0.8); }
}
@media (prefers-reduced-motion: reduce) { .tm-match-arrival { animation: none; } }
.tm-state { color: var(--app-text-muted); text-align: center; padding: 2rem 0; }
.tm-waiting-state { display: grid; justify-items: center; gap: 0.85rem; }
.tm-waiting-state p { max-width: 30rem; margin: 0; line-height: 1.5; }
.tm-waiting-gif { position: relative; width: min(239px, 64vw); overflow: hidden; border-radius: 12px; background: var(--app-surface-2); }
.tm-waiting-gif-still { display: block; width: 100%; height: auto; }
.tm-waiting-gif-animation { display: block; width: 100%; height: 100%; object-fit: cover; }
.tm-waiting-gif-animation { position: absolute; inset: 0; }
.tm-error { background: var(--app-feedback-error-bg); color: var(--app-feedback-error-text); padding: 0.8rem; border: 1px solid var(--app-feedback-error-border); border-radius: 10px; }
.tm-meta { color: var(--app-text-muted); font-size: 0.9rem; margin-top: 0.35rem; }
@media (max-width: 420px) { .tm-result-actions { gap: 0.4rem; } .tm-result-button { min-height: 3.7rem; font-size: 0.8rem; } }
@media (max-width: 640px) { .tm-guest-form { grid-template-columns: 1fr; } }
</style>
