<template>
  <div class="event-history rounded-xl border app-border app-surface-0 p-4 sm:p-6">
    <!-- Header -->
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold app-text-strong">
          {{ t("eventHistory.title") }}
        </h2>
        <p class="mt-1 app-text-secondary-soft">
          {{
            isAdmin
              ? t("eventHistory.adminSubtitle")
              : t("eventHistory.userSubtitle")
          }}
        </p>
      </div>

      <!-- Filter Controls -->
      <div class="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:space-x-3 sm:gap-3 w-full sm:w-auto">
        <select
          v-model="selectedYear"
          @change="fetchEvents"
          class="app-input w-full sm:w-auto rounded-lg px-3 py-2 text-sm"
        >
          <option value="">{{ t("eventHistory.allYears") }}</option>
          <option v-for="year in availableYears" :key="year" :value="year">
            {{ year }}
          </option>
        </select>

        <select
          v-model="sortBy"
          @change="sortEvents"
          class="app-input w-full sm:w-auto rounded-lg px-3 py-2 text-sm"
        >
          <option value="date-desc">{{ t("eventHistory.newestFirst") }}</option>
          <option value="date-asc">{{ t("eventHistory.oldestFirst") }}</option>
          <option value="name-asc">{{ t("eventHistory.nameAZ") }}</option>
          <option value="name-desc">{{ t("eventHistory.nameZA") }}</option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="flex items-center gap-3 app-text-secondary-soft">
        <ArrowPathIcon class="w-5 h-5 animate-spin" />
        <span>{{ t("eventHistory.loadingHistory") }}</span>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="app-feedback-error rounded-lg p-6 text-center"
    >
      <ExclamationTriangleIcon class="mx-auto mb-3 h-8 w-8" />
      <h3 class="mb-2 text-lg font-semibold">
        {{ t("eventHistory.failedToLoad") }}
      </h3>
      <p class="mb-4">{{ error }}</p>
      <button
        @click="fetchEvents"
        class="app-action-button app-action-danger rounded-lg px-4 py-2 font-medium transition-colors duration-200"
      >
        Try Again
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="events.length === 0"
      class="rounded-lg border app-border app-bg-page p-8 text-center"
    >
      <CalendarDaysIcon class="app-icon-muted mx-auto mb-4 h-12 w-12" />
      <h3 class="app-text-strong mb-2 text-xl font-semibold">
        {{ t("eventHistory.noPastEvents") }}
      </h3>
      <p class="app-text-secondary-soft">
        {{
          isAdmin
            ? t("eventHistory.noEventsAdmin")
            : t("eventHistory.noEventsUser")
        }}
      </p>
    </div>

    <!-- Events List -->
    <div v-else class="space-y-4">
      <div
        v-for="event in sortedEvents"
        :key="event.id"
        class="overflow-hidden rounded-xl border app-border app-bg-page transition-shadow duration-200 hover:shadow-md"
      >
        <!-- Event Header -->
        <div class="p-6 pb-4">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h3 class="app-text-strong mb-2 text-xl font-semibold">
                {{ event.name }}
              </h3>
              <div
                class="app-text-secondary-soft flex flex-wrap items-center gap-4 text-sm"
              >
                <div class="flex items-center gap-1">
                  <CalendarDaysIcon class="w-4 h-4" />
                  <span>{{ formatEventDate(event.eventDate) }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <MapPinIcon class="w-4 h-4" />
                  <span>{{ event.venue }}</span>
                </div>
                <div
                  v-if="event.participationFee"
                  class="flex items-center gap-1"
                >
                  <CurrencyDollarIcon class="w-4 h-4" />
                  <span>{{ event.participationFee }}</span>
                </div>
              </div>
            </div>

            <!-- Event Status Badge -->
            <div class="flex items-center gap-2">
              <span
                class="rounded-full px-3 py-1 text-xs font-medium"
                :class="getEventStatusClass(event.status)"
              >
                {{ formatStatus(event.status) }}
              </span>
            </div>
          </div>

          <!-- Event Description -->
          <p
            v-if="event.description"
            class="app-text-secondary-soft mb-4 line-clamp-2 text-sm"
          >
            {{ event.description }}
          </p>
        </div>

        <!-- Participants Summary -->
        <div class="border-t app-border app-surface-0 px-6 pb-4">
          <div class="flex items-center justify-between py-3">
            <div class="flex items-center gap-6 text-sm">
              <!-- Total Participants -->
              <div class="app-text-secondary-soft flex items-center gap-2">
                <UsersIcon class="w-4 h-4" />
                <span class="font-medium">{{ event.totalParticipants }}</span>
                <span class="app-text-muted-soft">
                  {{ t("common.participants") }}
                </span>
              </div>

              <!-- User's Status (if not admin) -->
              <div
                v-if="!isAdmin && event.userRegistration"
                class="flex items-center gap-2"
              >
                <div
                  class="w-2 h-2 rounded-full"
                  :class="getUserStatusDotClass(event.userRegistration.status)"
                ></div>
                <span class="app-text-secondary-soft text-xs font-medium">
                  {{ formatUserStatus(event.userRegistration.status) }}
                </span>
              </div>

              <!-- Requires Decklist Indicator -->
              <div
                v-if="event.requiresDecklist"
                class="flex items-center gap-1 app-icon-accent"
              >
                <DocumentTextIcon class="w-4 h-4" />
                <span class="text-xs font-medium">Decklist Required</span>
              </div>
            </div>

            <!-- Admin Actions -->
            <div v-if="isAdmin" class="flex items-center gap-2">
              <button
                @click="toggleParticipants(event.id)"
                class="text-sm font-medium app-icon-accent transition-colors duration-200 hover:opacity-80"
              >
                {{
                  expandedEvents.has(event.id)
                    ? t("eventHistory.hideParticipants")
                    : t("eventHistory.viewParticipants")
                }}
              </button>
            </div>
          </div>
        </div>

        <!-- Expanded Participants List (Admin only) -->
        <div
          v-if="isAdmin && expandedEvents.has(event.id)"
          class="border-t app-border app-bg-page"
        >
          <div class="p-4">
            <h4 class="app-text-strong mb-3 font-semibold">
              {{ t("eventHistory.eventParticipants") }}
            </h4>
            <div
              v-if="event.participants && event.participants.length > 0"
              class="space-y-2"
            >
              <div
                v-for="participant in event.participants"
                :key="participant.id"
                class="flex items-center justify-between rounded-lg app-surface-0 px-3 py-2"
              >
                <div class="flex items-center gap-3">
                  <UserIcon class="app-icon-muted h-4 w-4" />
                  <div>
                    <span class="app-text-strong font-medium">{{
                      participant.player.name
                    }}</span>
                    <span
                      v-if="participant.player.playerId"
                      class="app-text-muted-soft ml-2 text-xs"
                    >
                      ID: {{ participant.player.playerId }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-4 text-sm">
                  <!-- Placement (if available) -->
                  <div
                    v-if="participant.placement"
                    class="font-medium"
                    style="color: var(--app-button-amber-text)"
                  >
                    #{{ participant.placement }}
                  </div>

                  <!-- Registration Status -->
                  <span
                    class="rounded-full px-2 py-1 text-xs font-medium"
                    :class="getParticipantStatusClass(participant.status)"
                  >
                    {{ formatUserStatus(participant.status) }}
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="app-text-muted-soft py-4 text-center">
              {{ t("eventHistory.noParticipants") }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  CalendarDaysIcon,
  MapPinIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  UserIcon,
} from "@heroicons/vue/24/outline";

// Use i18n for translations
const { t, locale } = useI18n();
const { user } = useAuth();

interface EventParticipant {
  id: string;
  playerId: string;
  status: string;
  placement?: number;
  registeredAt: string;
  player: {
    id: string;
    name: string;
    playerId?: string;
  };
}

interface EventHistoryItem {
  id: string;
  name: string;
  description: string | null;
  eventDate: string;
  venue: string;
  maxParticipants?: number;
  participationFee?: string | number;
  status: string;
  requiresDecklist: boolean;
  totalParticipants: number;
  participants?: EventParticipant[];
  userRegistration?: {
    id: string;
    status: string;
    placement?: number;
  };
}

const props = defineProps<{
  isAdmin?: boolean;
}>();

// State
const events = ref<EventHistoryItem[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const selectedYear = ref("");
const sortBy = ref("date-desc");
const expandedEvents = ref(new Set<string>());

// Computed properties
const availableYears = computed(() => {
  const years = new Set<number>();
  events.value.forEach((event) => {
    const year = new Date(event.eventDate).getFullYear();
    years.add(year);
  });
  return Array.from(years).sort((a, b) => b - a);
});

const filteredEvents = computed(() => {
  let filtered = [...events.value];

  if (selectedYear.value) {
    const year = parseInt(selectedYear.value);
    filtered = filtered.filter((event) => {
      return new Date(event.eventDate).getFullYear() === year;
    });
  }

  return filtered;
});

const sortedEvents = computed(() => {
  const sorted = [...filteredEvents.value];

  switch (sortBy.value) {
    case "date-desc":
      return sorted.sort(
        (a, b) =>
          new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
      );
    case "date-asc":
      return sorted.sort(
        (a, b) =>
          new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      );
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    default:
      return sorted;
  }
});

// Methods
const fetchEvents = async () => {
  try {
    loading.value = true;
    error.value = null;

    // Guest dashboard: skip protected API and render an empty history state.
    if (!props.isAdmin && !user.value?.id) {
      events.value = [];
      return;
    }

    const endpoint = props.isAdmin
      ? "/api/admin/events/history"
      : "/api/dashboard/event-history";
    const response = await $fetch(endpoint);

    if (response && typeof response === "object" && "error" in response) {
      throw new Error(response.error as string);
    }

    events.value =
      response && typeof response === "object" && "data" in response
        ? (response.data as EventHistoryItem[]) || []
        : (response as EventHistoryItem[]) || [];
  } catch (err) {
    console.error("Failed to fetch event history:", err);
    error.value =
      err instanceof Error ? err.message : "Failed to load event history";
  } finally {
    loading.value = false;
  }
};

const sortEvents = () => {
  // Sorting is handled by computed property
};

const toggleParticipants = (eventId: string) => {
  if (expandedEvents.value.has(eventId)) {
    expandedEvents.value.delete(eventId);
  } else {
    expandedEvents.value.add(eventId);
  }
};

const formatEventDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString(locale.value, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatStatus = (status: string): string => {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ");
};

const formatUserStatus = (status: string): string => {
  if (!status) return "Unknown";
  const statusMap: Record<string, string> = {
    attended: "Attended",
    "no-show": "No Show",
    registered: "Registered",
    cancelled: "Cancelled",
    reserved: "Reserved",
  };
  return statusMap[status] || formatStatus(status);
};

const getEventStatusClass = (status: string) => {
  if (status === "completed") return "app-status-completed";
  if (status === "cancelled") return "app-status-cancelled";
  return "app-status-neutral";
};

const getParticipantStatusClass = (status: string) => {
  if (status === "attended") return "app-status-completed";
  if (status === "no-show") return "app-status-cancelled";
  if (status === "registered") return "app-status-upcoming";
  if (status === "cancelled") return "app-status-neutral";
  return "app-status-neutral";
};

const getUserStatusDotClass = (status: string) => {
  if (status === "attended") return "status-dot-success";
  if (status === "no-show") return "status-dot-danger";
  if (status === "cancelled") return "status-dot-muted";
  return "status-dot-info";
};

// Lifecycle
onMounted(() => {
  fetchEvents();
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.status-dot-success {
  background: var(--app-button-green);
}

.status-dot-danger {
  background: var(--app-button-red);
}

.status-dot-muted {
  background: var(--app-surface-3);
}

.status-dot-info {
  background: var(--app-button-blue);
}
</style>
