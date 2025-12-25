<template>
  <div class="event-history">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">
          {{ t("eventHistory.title") }}
        </h2>
        <p class="text-gray-600 mt-1">
          {{
            isAdmin
              ? t("eventHistory.adminSubtitle")
              : t("eventHistory.userSubtitle")
          }}
        </p>
      </div>

      <!-- Filter Controls -->
      <div class="flex items-center space-x-3">
        <select
          v-model="selectedYear"
          @change="fetchEvents"
          class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">{{ t("eventHistory.allYears") }}</option>
          <option v-for="year in availableYears" :key="year" :value="year">
            {{ year }}
          </option>
        </select>

        <select
          v-model="sortBy"
          @change="sortEvents"
          class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      <div class="flex items-center gap-3 text-gray-600">
        <ArrowPathIcon class="w-5 h-5 animate-spin" />
        <span>{{ t("eventHistory.loadingHistory") }}</span>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="bg-red-50 border border-red-200 rounded-lg p-6 text-center"
    >
      <ExclamationTriangleIcon class="w-8 h-8 text-red-500 mx-auto mb-3" />
      <h3 class="text-lg font-semibold text-red-800 mb-2">
        {{ t("eventHistory.failedToLoad") }}
      </h3>
      <p class="text-red-600 mb-4">{{ error }}</p>
      <button
        @click="fetchEvents"
        class="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
      >
        Try Again
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="events.length === 0"
      class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center"
    >
      <CalendarDaysIcon class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-xl font-semibold text-gray-900 mb-2">
        {{ t("eventHistory.noPastEvents") }}
      </h3>
      <p class="text-gray-600">
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
        class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200"
      >
        <!-- Event Header -->
        <div class="p-6 pb-4">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h3 class="text-xl font-semibold text-gray-900 mb-2">
                {{ event.name }}
              </h3>
              <div
                class="flex flex-wrap items-center gap-4 text-sm text-gray-600"
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
                  <span>€{{ event.participationFee }}</span>
                </div>
              </div>
            </div>

            <!-- Event Status Badge -->
            <div class="flex items-center gap-2">
              <span
                class="px-3 py-1 text-xs font-medium rounded-full"
                :class="{
                  'bg-green-100 text-green-800': event.status === 'completed',
                  'bg-red-100 text-red-800': event.status === 'cancelled',
                  'bg-gray-100 text-gray-800': ![
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
            class="text-gray-700 text-sm mb-4 line-clamp-2"
          >
            {{ event.description }}
          </p>
        </div>

        <!-- Participants Summary -->
        <div class="px-6 pb-4 border-t border-gray-100 bg-gray-50">
          <div class="flex items-center justify-between py-3">
            <div class="flex items-center gap-6 text-sm">
              <!-- Total Participants -->
              <div class="flex items-center gap-2 text-gray-600">
                <UsersIcon class="w-4 h-4" />
                <span class="font-medium">{{ event.totalParticipants }}</span>
                <span class="text-gray-500">
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
                <span class="text-xs font-medium text-gray-600">
                  {{ formatUserStatus(event.userRegistration.status) }}
                </span>
              </div>

              <!-- Requires Decklist Indicator -->
              <div
                v-if="event.requiresDecklist"
                class="flex items-center gap-1 text-blue-600"
              >
                <DocumentTextIcon class="w-4 h-4" />
                <span class="text-xs font-medium">Decklist Required</span>
              </div>
            </div>

            <!-- Admin Actions -->
            <div v-if="isAdmin" class="flex items-center gap-2">
              <button
                @click="toggleParticipants(event.id)"
                class="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-200"
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
          class="border-t border-gray-200 bg-white"
        >
          <div class="p-4">
            <h4 class="font-semibold text-gray-900 mb-3">
              {{ t("eventHistory.eventParticipants") }}
            </h4>
            <div
              v-if="event.participants && event.participants.length > 0"
              class="space-y-2"
            >
              <div
                v-for="participant in event.participants"
                :key="participant.id"
                class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
              >
                <div class="flex items-center gap-3">
                  <UserIcon class="w-4 h-4 text-gray-500" />
                  <div>
                    <span class="font-medium text-gray-900">{{
                      participant.player.name
                    }}</span>
                    <span
                      v-if="participant.player.playerId"
                      class="text-xs text-gray-500 ml-2"
                    >
                      ID: {{ participant.player.playerId }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-4 text-sm">
                  <!-- Placement (if available) -->
                  <div
                    v-if="participant.placement"
                    class="text-amber-600 font-medium"
                  >
                    #{{ participant.placement }}
                  </div>

                  <!-- Registration Status -->
                  <span
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    :class="{
                      'bg-green-100 text-green-800':
                        participant.status === 'attended',
                      'bg-red-100 text-red-800':
                        participant.status === 'no-show',
                      'bg-yellow-100 text-yellow-800':
                        participant.status === 'registered',
                      'bg-gray-100 text-gray-800':
                        participant.status === 'cancelled',
                    }"
                  >
                    {{ formatUserStatus(participant.status) }}
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="text-center text-gray-500 py-4">
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
const { t } = useI18n();

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
  return new Date(dateString).toLocaleDateString("en-US", {
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
