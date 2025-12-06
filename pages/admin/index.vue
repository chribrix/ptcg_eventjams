<template>
  <div class="admin-dashboard">
    <div class="dashboard-header">
      <h1>Admin Dashboard</h1>
      <p class="welcome-message">
        Welcome, {{ user?.user_metadata?.name || user?.email }}
      </p>
    </div>

    <div class="dashboard-grid">
      <!-- Quick Stats Cards -->
      <div class="stats-section">
        <h2>Overview</h2>
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
      <div class="actions-section">
        <h2>Quick Actions</h2>
        <div class="action-grid">
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
      <div class="activity-section">
        <h2>Recent Activity</h2>
        <div class="activity-list">
          <div v-if="activityLoading" class="loading">
            Loading recent activity...
          </div>
          <div v-else-if="recentActivity.length === 0" class="no-activity">
            No recent activity
          </div>
          <div v-else>
            <div
              v-for="activity in recentActivity"
              :key="activity.id"
              class="activity-item"
            >
              <div class="activity-icon">
                {{ getActivityIcon(activity.type) }}
              </div>
              <div class="activity-content">
                <p class="activity-text">{{ activity.description }}</p>
                <p class="activity-time">
                  {{ formatTime(activity.createdAt) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Event History Section -->
    <div class="mt-12">
      <EventHistory :isAdmin="true" />
    </div>
  </div>
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
.admin-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.dashboard-header {
  margin-bottom: 2rem;
  text-align: center;
}

.dashboard-header h1 {
  font-size: 2.5rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.welcome-message {
  color: #6b7280;
  font-size: 1.1rem;
}

.dashboard-grid {
  display: grid;
  gap: 2rem;
  grid-template-columns: 1fr;
}

.stats-section h2,
.actions-section h2,
.activity-section h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  font-size: 2rem;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 50%;
}

.stat-content h3 {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.stat-number {
  font-size: 1.875rem;
  font-weight: bold;
  color: #1f2937;
  margin: 0;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.action-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  display: block;
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
}

.action-card h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.action-card p {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
}

.activity-list {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  font-size: 1.5rem;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 50%;
}

.activity-text {
  font-size: 0.875rem;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.activity-time {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
}

.loading,
.no-activity {
  text-align: center;
  color: #6b7280;
  padding: 2rem;
}

@media (min-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 2fr 1fr;
    grid-template-areas:
      "stats actions"
      "activity activity";
  }

  .stats-section {
    grid-area: stats;
  }

  .actions-section {
    grid-area: actions;
  }

  .activity-section {
    grid-area: activity;
  }
}
</style>
