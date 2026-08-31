<template>
  <main class="league-page">
    <header class="league-header">
      <div>
        <p class="eyebrow">Crows & Owls League</p>
        <h1>{{ data?.season.name || "Liga-Rangliste" }}</h1>
        <p v-if="data">{{ formatDate(data.season.startsOn) }} – {{ formatDate(data.season.endsOn) }}</p>
      </div>
      <TrophyIcon class="trophy" />
    </header>

    <section v-if="pending" class="state">Rangliste wird geladen …</section>
    <section v-else-if="error" class="state denied">
      <LockClosedIcon class="state-icon" />
      <h2>Keine Liga-Freigabe</h2>
      <p>{{ accessMessage }}</p>
      <NuxtLink to="/profile" class="profile-link">Spieler-ID im Profil prüfen</NuxtLink>
    </section>
    <template v-else-if="data">
      <section class="summary">
        <div><span>Dein Rang</span><strong>{{ viewerStanding ? `#${viewerStanding.rank}` : "–" }}</strong></div>
        <div><span>Deine Punkte</span><strong>{{ viewerStanding?.points ?? 0 }}</strong></div>
        <div><span>Liga-Events</span><strong>{{ data.events.length }}</strong></div>
        <div><span>Aktive Wertung</span><strong>{{ data.standings.length }}</strong></div>
      </section>

      <section class="content-section">
        <h2>Standings</h2>
        <LeagueStandingsTable :standings="data.standings" :viewer-player-id="data.viewerLeaguePlayerId" />
      </section>

      <section v-if="viewerMatrix" class="content-section">
        <h2>Deine Saison</h2>
        <div class="event-grid">
          <div v-for="(event, index) in data.events" :key="event.id" class="event-result">
            <span>{{ formatDate(event.eventDate) }}</span>
            <strong>{{ viewerMatrix.points[index] === null ? "–" : `${viewerMatrix.points[index]} P` }}</strong>
            <small>{{ event.name }}</small>
          </div>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { LockClosedIcon, TrophyIcon } from "@heroicons/vue/24/outline";

definePageMeta({ layout: "default" });
useHead({ title: "Liga-Rangliste - ChrispyJams" });

type LeagueData = {
  season: { id: string; name: string; startsOn: string; endsOn: string };
  viewerLeaguePlayerId: string;
  standings: Array<{ rank: number; playerId: string; displayName: string; points: number; topTwoFinishes: number; scoringParticipations: number; longestStreak: number }>;
  events: Array<{ id: string; name: string; eventDate: string }>;
  matrix: Array<{ playerId: string; displayName: string; totalPoints: number; points: Array<number | null> }>;
};

const { data, pending, error } = await useFetch<LeagueData>("/api/league/standings");
const viewerStanding = computed(() => data.value?.standings.find((standing) => standing.playerId === data.value?.viewerLeaguePlayerId));
const viewerMatrix = computed(() => data.value?.matrix.find((row) => row.playerId === data.value?.viewerLeaguePlayerId));
const accessMessage = computed(() => (error.value as any)?.data?.statusMessage || "Nur aktive Liga-Spieler mit passender Spieler-ID können die Standings sehen.");
const formatDate = (value: string) => new Intl.DateTimeFormat("de-AT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
</script>

<style scoped>
.league-page { max-width: 76rem; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; }
.league-header { display: flex; justify-content: space-between; align-items: center; min-height: 11rem; padding: 2rem; border-bottom: 4px solid var(--app-accent); background: var(--app-surface-0); color: var(--app-text-primary); }
.eyebrow { text-transform: uppercase; font-size: .75rem; letter-spacing: .08em; color: var(--app-accent); font-weight: 800; }
h1 { font-size: clamp(2rem, 5vw, 4rem); line-height: 1; margin: .5rem 0; letter-spacing: 0; }h2 { margin: 0 0 1rem; color: var(--app-text-primary); font-size: 1.2rem; }
.league-header p:last-child { color: var(--app-text-muted); }.trophy { width: 5rem; color: var(--app-accent); }
.summary { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--app-border); background: var(--app-surface-0); }
.summary div { padding: 1rem 1.25rem; border-right: 1px solid var(--app-border); }.summary div:last-child { border: 0; }.summary span { display: block; color: var(--app-text-muted); font-size: .76rem; text-transform: uppercase; }.summary strong { font-size: 1.6rem; color: var(--app-text-primary); }
.content-section, .state { padding: 1.25rem; background: var(--app-surface-0); border: 1px solid var(--app-border); }
.state { min-height: 16rem; display: grid; place-content: center; text-align: center; color: var(--app-text-muted); }.state-icon { width: 2.5rem; margin: 0 auto .75rem; }.state h2 { margin-bottom: .25rem; }.profile-link { color: var(--app-accent); font-weight: 700; margin-top: .75rem; }
.event-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr)); gap: .5rem; }.event-result { border-left: 3px solid var(--app-accent); padding: .75rem; background: var(--app-surface-1); }.event-result span, .event-result small { display: block; color: var(--app-text-muted); }.event-result strong { color: var(--app-text-primary); font-size: 1.2rem; }.event-result small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 700px) { .league-header { min-height: 8rem; padding: 1.25rem; }.trophy { width: 3rem; }.summary { grid-template-columns: 1fr 1fr; }.summary div:nth-child(2) { border-right: 0; }.summary div:nth-child(-n+2) { border-bottom: 1px solid var(--app-border); } }
</style>