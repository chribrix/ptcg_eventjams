<template>
  <div class="event-history rounded-xl border app-border app-surface-0 p-4 sm:p-6">
    <!-- Header -->
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-white">
          {{ t("eventHistory.title") }}
        </h2>
        <p class="mt-1 text-gray-300">
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
          class="w-full sm:w-auto rounded-lg border app-border app-surface-2 px-3 py-2 text-sm text-gray-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
        >
          <option value="">{{ t("eventHistory.allYears") }}</option>
          <option v-for="year in availableYears" :key="year" :value="year">
            {{ year }}
          </option>
        </select>

        <select
          v-model="sortBy"
          @change="sortEvents"
          class="w-full sm:w-auto rounded-lg border app-border app-surface-2 px-3 py-2 text-sm text-gray-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
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
      <div class="flex items-center gap-3 text-gray-300">
        <ArrowPathIcon class="w-5 h-5 animate-spin" />
        <span>{{ t("eventHistory.loadingHistory") }}</span>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="rounded-lg border border-red-700 bg-red-950/40 p-6 text-center"
    >
      <ExclamationTriangleIcon class="w-8 h-8 text-red-500 mx-auto mb-3" />
      <h3 class="mb-2 text-lg font-semibold text-red-300">
        {{ t("eventHistory.failedToLoad") }}
      </h3>
      <p class="mb-4 text-red-200">{{ error }}</p>
      <button
        @click="fetchEvents"
      class="rounded-lg bg-red-700 px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-red-800"
      >
        Try Again
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="events.length === 0"
      class="rounded-lg border app-border app-bg-page p-8 text-center"
    >
      <CalendarDaysIcon class="mx-auto mb-4 h-12 w-12 text-gray-500" />
      <h3 class="mb-2 text-xl font-semibold text-white">
        {{ t("eventHistory.noPastEvents") }}
      </h3>
      <p class="text-gray-300">
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
              <h3 class="mb-2 text-xl font-semibold text-white">
                {{ event.name }}
              </h3>
              <div
                class="flex flex-wrap items-center gap-4 text-sm text-gray-300"
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
                class="px-3 py-1 text-xs font-medium rounded-full"
                :class="{
                    'bg-green-900/50 text-green-200': event.status === 'completed',
                    'bg-red-900/50 text-red-200': event.status === 'cancelled',
                    'bg-gray-700 text-gray-200': ![
                    'completed',
                    'cancelled',
                  ].includes(event.status),
                }"
              >
                {{ formatStatus(event.status) }}
              </span>
            </div>
          </div>

          <!-- Event Description -->
          <p
            v-if="event.description"
            class="mb-4 line-clamp-2 text-sm text-gray-300"
          >
            {{ event.description }}
          </p>
        </div>

        <!-- Participants Summary -->
        <div class="border-t app-border app-surface-0 px-6 pb-4">
          <div class="flex items-center justify-between py-3">
            <div class="flex items-center gap-6 text-sm">
              <!-- Total Participants -->
              <div class="flex items-center gap-2 text-gray-300">
                <UsersIcon class="w-4 h-4" />
                <span class="font-medium">{{ event.totalParticipants }}</span>
                <span class="text-gray-400">
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
                  :class="{
                    'bg-green-500':
                      event.userRegistration.status === 'attended',
                    'bg-red-500': event.userRegistration.status === 'no-show',
                    'bg-gray-500':
                      event.userRegistration.status === 'cancelled',
                  }"
                ></div>
                <span class="text-xs font-medium text-gray-300">
                  {{ formatUserStatus(event.userRegistration.status) }}
                </span>
              </div>

              <!-- Requires Decklist Indicator -->
              <div
                v-if="event.requiresDecklist"
                class="flex items-center gap-1 text-sky-300"
              >
                <DocumentTextIcon class="w-4 h-4" />
                <span class="text-xs font-medium">Decklist Required</span>
              </div>
            </div>

            <!-- Admin Actions -->
            <div v-if="isAdmin" class="flex items-center gap-2">
              <button
                @click="toggleParticipants(event.id)"
                class="text-sm font-medium text-sky-300 transition-colors duration-200 hover:text-sky-200"
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
            <h4 class="mb-3 font-semibold text-white">
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
                  <UserIcon class="h-4 w-4 text-gray-400" />
                  <div>
                    <span class="font-medium text-gray-100">{{
                      participant.player.name
                    }}</span>
                    <span
                      v-if="participant.player.playerId"
                      class="ml-2 text-xs text-gray-400"
                    >
                      ID: {{ participant.player.playerId }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-4 text-sm">
                  <!-- Placement (if available) -->
                  <div
                    v-if="participant.placement"
                    class="font-medium text-amber-300"
                  >
                    #{{ participant.placement }}
                  </div>

                  <!-- Registration Status -->
                  <span
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    :class="{
                        'bg-green-900/50 text-green-200':
                        participant.status === 'attended',
                        'bg-red-900/50 text-red-200':
                        participant.status === 'no-show',
                        'bg-yellow-900/50 text-yellow-200':
                        participant.status === 'registered',
                        'bg-gray-700 text-gray-200':
                        participant.status === 'cancelled',
                    }"
                  >
                    {{ formatUserStatus(participant.status) }}
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="py-4 text-center text-gray-400">
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
</style>
