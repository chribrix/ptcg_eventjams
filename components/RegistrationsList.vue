<template>
  <div class="my-registrations-wrapper">
    <h2 class="section-title">My Registrations</h2>

    <!-- Loading State -->
    <div v-if="isLoading" class="dashboard-loading">
      <div class="spinner"></div>
      <span>Loading your registrations...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="registrations.length === 0" class="dashboard-empty">
      <p>No event registrations yet.</p>
      <NuxtLink to="/events" class="browse-events-link">
        Browse Events
      </NuxtLink>
    </div>

    <!-- Registrations List -->
    <div v-else class="registrations-summary">
      <div
        v-for="registration in registrations"
        :key="registration.id"
        class="registration-card-summary"
      >
        <div class="registration-header">
          <h4>{{ registration.customEvent.name }}</h4>
          <span class="event-date">
            {{ formatEventDate(registration.customEvent.eventDate) }}
          </span>
        </div>

        <!-- Decklist Alert -->
        <div
          v-if="
            registration.customEvent.requiresDecklist && !registration.decklist
          "
          class="decklist-alert"
        >
          ⚠️ Decklist required - not submitted yet
          <NuxtLink :to="`/dashboard`" class="action-link">
            Submit Now
          </NuxtLink>
        </div>

        <div
          v-else-if="
            registration.customEvent.requiresDecklist && registration.decklist
          "
          class="decklist-complete"
        >
          ✓ Decklist submitted
        </div>
      </div>

      <NuxtLink to="/dashboard" class="view-dashboard-link">
        View Full Dashboard
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
interface EventRegistration {
  id: string;
  customEventId: string;
  playerId: string;
  registeredAt: string;
  status: string;
  notes?: string | null;
  decklist?: string | null;
  customEvent: {
    id: string;
    name: string;
    venue: string;
    eventDate: string;
    maxParticipants: number;
    participationFee?: string | null;
    description?: string | null;
    registrationDeadline?: string | null;
    requiresDecklist: boolean;
    status: string;
  };
}

const registrations = ref<EventRegistration[]>([]);
const isLoading = ref<boolean>(false);
const supabase = useSupabaseClient();

const formatEventDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const fetchUserRegistrations = async () => {
  try {
    isLoading.value = true;
    const { data } = await $fetch<{ data: EventRegistration[] }>(
      "/api/dashboard/registrations"
    );
    registrations.value = data || [];
  } catch (error) {
    console.error("Failed to fetch user registrations:", error);
    registrations.value = [];
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  const { data: session } = await supabase.auth.getSession();
  if (session?.session) {
    // Fetch user registrations if logged in
    await fetchUserRegistrations();
  }
});
</script>

<style scoped>
.my-registrations-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
  text-align: center;
}

.dashboard-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  color: #6b7280;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.dashboard-empty {
  padding: 1rem;
  text-align: center;
  color: #6b7280;
}

.browse-events-link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

.browse-events-link:hover {
  text-decoration: underline;
}

.registrations-summary {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.registration-card-summary {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  transition: all 0.2s;
}

.registration-card-summary:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.registration-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.registration-header h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
}

.event-date {
  font-size: 0.75rem;
  color: #6b7280;
}

.decklist-alert {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 0.25rem;
  padding: 0.5rem;
  font-size: 0.75rem;
  color: #92400e;
}

.decklist-complete {
  display: flex;
  align-items: center;
  background: #ecfdf5;
  border: 1px solid #10b981;
  border-radius: 0.25rem;
  padding: 0.5rem;
  font-size: 0.75rem;
  color: #047857;
}

.action-link {
  color: #f59e0b;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.75rem;
}

.action-link:hover {
  text-decoration: underline;
}

.view-dashboard-link {
  display: block;
  text-align: center;
  padding: 0.75rem;
  background: #3b82f6;
  color: white;
  text-decoration: none;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  transition: background-color 0.2s;
}

.view-dashboard-link:hover {
  background: #2563eb;
}
</style>
