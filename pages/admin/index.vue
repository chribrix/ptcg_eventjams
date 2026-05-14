<template>
  <AdminPageLayout
    title="Admin Dashboard"
    :subtitle="`Welcome, ${user?.user_metadata?.name || user?.email}`"
  >
    <!-- Quick Stats Cards -->
    <div class="admin-card">
      <div class="section-header">
        <h2>Overview</h2>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-content">
            <h3>Custom Events</h3>
            <p class="stat-number">
              {{ statsLoading ? "..." : stats.customEvents }}
            </p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <h3>Registered Players</h3>
            <p class="stat-number">
              {{ statsLoading ? "..." : stats.totalPlayers }}
            </p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">⏰</div>
          <div class="stat-content">
            <h3>Upcoming Events</h3>
            <p class="stat-number">
              {{ statsLoading ? "..." : stats.upcomingEvents }}
            </p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <h3>Completed Events</h3>
            <p class="stat-number">
              {{ statsLoading ? "..." : stats.completedEvents }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="admin-card">
      <div class="section-header">
        <h2>Recent Activity</h2>
      </div>
      <div v-if="activityLoading" class="loading">
        Loading recent activity...
      </div>
      <div v-else-if="recentActivity.length === 0" class="no-data">
        No recent activity
      </div>
      <div v-else class="activity-list">
        <div
          v-for="activity in recentActivity"
          :key="activity.id"
          class="activity-item"
        >
          <div class="activity-icon">📋</div>
          <div class="activity-details">
            <p class="activity-text">{{ activity.description }}</p>
            <p class="activity-time">{{ formatTime(activity.createdAt) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Event History Section -->
    <div class="admin-card history-card">
      <EventHistory :isAdmin="true" />
    </div>
  </AdminPageLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

// Admin user info - middleware handles access control
const { user } = useAdmin();

// Page metadata
definePageMeta({
  layout: "default",
});

useHead({
  title: "Admin Dashboard - PTCG Event Jams",
});

// State
const statsLoading = ref(true);
const activityLoading = ref(true);

const stats = ref({
  customEvents: 0,
  totalPlayers: 0,
  upcomingEvents: 0,
  completedEvents: 0,
});

const recentActivity = ref<
  Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
  }>
>([]);

// Methods
const loadStats = async () => {
  try {
    const response = await $fetch<{
      stats: typeof stats.value;
      recentActivity: typeof recentActivity.value;
    }>("/api/admin/dashboard");

    stats.value = response.stats;
    recentActivity.value = response.recentActivity;
  } catch (error) {
    console.error("Failed to load stats:", error);
  } finally {
    statsLoading.value = false;
  }
};

const loadRecentActivity = async () => {
  try {
    const response = await $fetch<{
      stats: typeof stats.value;
      recentActivity: typeof recentActivity.value;
    }>("/api/admin/dashboard");

    recentActivity.value = response.recentActivity;
  } catch (error) {
    console.error("Failed to load recent activity:", error);
  } finally {
    activityLoading.value = false;
  }
};

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
};

// Lifecycle
onMounted(async () => {
  await Promise.all([loadStats(), loadRecentActivity()]);
});
</script>

<style scoped>
@import "~/assets/css/admin-shared.css";

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--app-border);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  font-size: 1.5rem;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-surface-1);
  border-radius: 10px;
}

.activity-details {
  flex: 1;
}

.activity-text {
  font-size: 0.95rem;
  color: var(--app-text-primary);
  margin-bottom: 0.25rem;
}

.activity-time {
  font-size: 0.875rem;
  color: var(--app-text-muted);
  margin: 0;
}

.history-card {
  background: var(--app-surface-1);
}

.history-card :deep(.event-history) {
  background: var(--app-surface-2);
}
</style>
