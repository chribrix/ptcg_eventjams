<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr><th>Rang</th><th>Spieler</th><th>Punkte</th><th>Top 2</th><th>Punkte-Events</th><th>Serie</th></tr>
      </thead>
      <tbody>
        <tr v-for="standing in standings" :key="standing.playerId" :class="{ viewer: standing.playerId === viewerPlayerId }">
          <td><strong>#{{ standing.rank }}</strong></td>
          <td>{{ standing.displayName }}</td>
          <td><strong>{{ standing.points }}</strong></td>
          <td>{{ standing.topTwoFinishes }}</td>
          <td>{{ standing.scoringParticipations }}</td>
          <td>{{ standing.longestStreak }}</td>
        </tr>
        <tr v-if="standings.length === 0"><td colspan="6" class="empty">Noch keine punktenden Teilnahmen.</td></tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  standings: Array<{
    rank: number;
    playerId: string;
    displayName: string;
    points: number;
    topTwoFinishes: number;
    scoringParticipations: number;
    longestStreak: number;
  }>;
  viewerPlayerId?: string;
}>();
</script>

<style scoped>
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; color: var(--app-text-secondary); }
th, td { padding: .7rem; text-align: left; border-bottom: 1px solid var(--app-border); white-space: nowrap; }
th { color: var(--app-text-muted); font-size: .75rem; text-transform: uppercase; }
.viewer { background: color-mix(in srgb, var(--app-accent) 14%, transparent); }
.viewer td:first-child { border-left: 3px solid var(--app-accent); }
.empty { color: var(--app-text-muted); text-align: center; padding: 2rem; }
</style>