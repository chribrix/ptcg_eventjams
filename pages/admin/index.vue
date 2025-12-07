<template>
  <AdminPageLayout
    title="Admin Dashboard"
    :subtitle="`Welcome, ${user?.user_metadata?.name || user?.email}`"
  >
    <template #actions>
      <!-- Add any header actions here if needed -->
    </template>

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
              {{ statsLoading ? "..." : stats.totalRegistrations }}
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

    <!-- Quick Actions -->
    <div class="admin-card">
      <div class="section-header">
        <h2>Quick Actions</h2>
      </div>
      <div class="admin-grid">
        <NuxtLink to="/admin/custom-events" class="action-card">
          <div class="action-icon">🎯</div>
          <h3>Manage Events</h3>
          <p>Create, edit, and manage custom events</p>
        </NuxtLink>

        <NuxtLink to="/admin/players" class="action-card">
          <div class="action-icon">👤</div>
          <h3>Manage Players</h3>
          <p>View and manage registered players</p>
        </NuxtLink>

        <NuxtLink to="/admin/external-events" class="action-card">
          <div class="action-icon">🔧</div>
          <h3>External Event Overrides</h3>
          <p>Customize pokedata.ovh event details</p>
        </NuxtLink>

        <div class="action-card disabled">
          <div class="action-icon">📊</div>
          <h3>Reports</h3>
          <p>Coming soon...</p>
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
    <div class="admin-card">
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
  totalRegistrations: 0,
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
    // This would be an actual API call to get dashboard stats
    // For now, we'll simulate some data
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate loading

    stats.value = {
      customEvents: 12,
      totalRegistrations: 48,
      upcomingEvents: 8,
      completedEvents: 4,
    };
  } catch (error) {
    console.error("Failed to load stats:", error);
  } finally {
    statsLoading.value = false;
  }
};

const loadRecentActivity = async () => {
  try {
    // This would be an actual API call to get recent activity
    // For now, we'll simulate some data
    await new Promise((resolve) => setTimeout(resolve, 800));

    recentActivity.value = [
      {
        id: "1",
        type: "eventCreated",
        description: 'New event "Weekly Tournament" created',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      },
      {
        id: "2",
        type: "playerRegistered",
        description: 'Player "John Doe" registered for "Monthly Challenge"',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      },
      {
        id: "3",
        type: "eventUpdated",
        description: 'Event "Spring Championship" updated',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
      },
    ];
  } catch (error) {
    console.error("Failed to load recent activity:", error);
  } finally {
    activityLoading.value = false;
  }
};

const getActivityIcon = (type: string): string => {
  switch (type) {
    case "eventCreated":
      return "calendar-plus";
    case "playerRegistered":
      return "user-plus";
    case "eventUpdated":
      return "calendar-edit";
    default:
      return "activity";
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

.action-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  display: block;
  border: 1px solid #e2e8f0;
}

.action-card:hover:not(.disabled) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.action-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  display: block;
}

.action-card h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.action-card p {
  color: #64748b;
  font-size: 0.875rem;
  margin: 0;
}

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
  border-bottom: 1px solid #f1f5f9;
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
  background: #f8fafc;
  border-radius: 10px;
}

.activity-details {
  flex: 1;
}

.activity-text {
  font-size: 0.95rem;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.activity-time {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}
</style>
