<template>
  <div class="min-h-screen bg-[#36393f] py-8 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-8 text-center">
        <h1 class="text-4xl font-bold text-white mb-2">
          {{ t("dashboard.title") }}
        </h1>
        <p class="text-lg text-gray-300">
          {{ t("dashboard.subtitle") }}
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="flex items-center gap-3 text-gray-300">
          <div
            class="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin"
          ></div>
          <span class="text-lg">{{ t("dashboard.loadingRegistrations") }}</span>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-[#2f3136] border border-red-600 rounded-lg p-6 text-center"
      >
        <h3 class="text-xl font-semibold text-red-400 mb-2">
          {{ t("dashboard.errorLoading") }}
        </h3>
        <p class="text-red-300 mb-4">{{ error }}</p>
        <button
          @click="fetchRegistrations"
          class="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 shadow-lg"
        >
          {{ t("dashboard.tryAgain") }}
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="registrations.length === 0"
        class="bg-[#2f3136] rounded-lg shadow-sm border border-[#202225] p-8 text-center"
      >
        <h3 class="text-2xl font-semibold text-white mb-2">{{ t("dashboard.emptyTitle") }}</h3>
        <p class="text-gray-300 mb-6">
          {{ t("dashboard.emptyText") }}
        </p>
        <NuxtLink
          to="/events"
          class="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg"
        >
          Browse Events
        </NuxtLink>
      </div>

      <!-- Current Registrations List -->
      <div v-else>
        <div class="mb-10 rounded-xl border border-[#202225] bg-[#2f3136] p-4 sm:p-6">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-xl font-bold text-white">{{ t("dashboard.timelineTitle") }}</h2>
              <p class="text-sm text-gray-300">{{ timelineRangeLabel }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-lg border border-[#202225] bg-[#40444b] px-3 py-2 text-sm text-gray-200 hover:bg-[#4f545c]"
                @click="shiftTimelineWindow(-14)"
              >
                -2 Wochen
              </button>
              <button
                type="button"
                class="rounded-lg border border-[#202225] bg-[#40444b] px-3 py-2 text-sm text-gray-200 hover:bg-[#4f545c]"
                @click="shiftTimelineWindow(14)"
              >
                +2 Wochen
              </button>
            </div>
          </div>

          <div v-if="timelineEvents.length === 0" class="rounded-lg border border-[#202225] bg-[#36393f] p-4 text-sm text-gray-400">
            {{ t("dashboard.timelineEmpty") }}
          </div>

          <div v-else class="flex gap-3 overflow-x-auto pb-2">
            <article
              v-for="entry in timelineEvents"
              :key="`timeline-${entry.id}`"
              class="min-w-[260px] max-w-[320px] rounded-lg border p-3"
              :class="timelineCardClass(entry)"
            >
              <div class="mb-2 flex items-center justify-between gap-2">
                <span class="rounded-full px-2 py-1 text-xs font-semibold" :class="timelineBadgeClass(entry)">
                  {{ timelineBadgeLabel(entry) }}
                </span>
                <span class="text-xs" :class="entry.isPast ? 'text-gray-500' : 'text-gray-300'">
                  {{ formatTimelineDate(entry.customEvent.eventDate) }}
                </span>
              </div>
              <h3 class="text-sm font-semibold" :class="entry.isPast ? 'text-gray-400' : 'text-white'">
                {{ entry.customEvent.name }}
              </h3>
              <p class="mt-1 text-xs" :class="entry.isPast ? 'text-gray-500' : 'text-gray-300'">
                {{ entry.customEvent.venue }}
              </p>
            </article>
          </div>
        </div>

        <h2 class="text-2xl font-bold text-white mb-6">
          {{ t("dashboard.currentRegistrations") }}
        </h2>
        <div class="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 mb-12">
          <article
            v-for="registration in registrations"
            :key="registration.id"
            class="rounded-lg shadow-sm border p-4 sm:p-6 hover:shadow-lg transition-all duration-200 cursor-pointer block"
            :class="getDashboardEntryCardClass(registration)"
          >
            <!-- Game Type Header -->
            <div
              class="mb-2 pb-1.5 border-b border-opacity-20"
              :class="getGameHeaderClass(registration.customEvent.tagType)"
            >
              <h4
                class="text-xs font-semibold uppercase tracking-wide opacity-70"
                :class="
                  getGameHeaderTextClass(registration.customEvent.tagType)
                "
              >
                {{
                  getGameTypeLabel(
                    registration.customEvent.tagType || "pokemon",
                  )
                }}
              </h4>
            </div>

            <!-- Event Header -->
            <div
              class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-2">
                  <h3
                    class="text-lg sm:text-xl font-semibold text-white truncate"
                  >
                    {{ registration.customEvent.name }}
                  </h3>
                  <span
                    v-for="tag in getDisplayTags(
                      registration.customEvent.tags || null,
                      registration.customEvent.tagType || 'pokemon',
                    )"
                    :key="tag.value"
                    class="event-type-badge flex-shrink-0"
                    :class="tag.badgeClass"
                  >
                    {{ tag.label }}
                  </span>
                </div>
                <!-- Ticket Count Badge -->
                <div
                  v-if="registration.ticketCount > 1"
                  class="flex items-center gap-1 text-sm text-blue-600 font-medium"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                    />
                  </svg>
                  {{ t("dashboard.ticketCount", { count: registration.ticketCount }) }}
                </div>
              </div>
              <span
                class="px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap self-start flex-shrink-0"
                :class="{
                  'bg-green-100 text-green-800':
                    registration.status === 'registered',
                  'bg-yellow-100 text-yellow-800':
                    registration.status === 'reserved',
                  'bg-sky-100 text-sky-800':
                    registration.status === 'bookmarked',
                  'bg-blue-100 text-blue-800':
                    registration.status === 'attended',
                  'bg-red-100 text-red-800': registration.status === 'no-show',
                  'bg-gray-100 text-gray-800':
                    registration.status === 'cancelled',
                }"
              >
                {{ formatStatus(registration.status) }}
              </span>
            </div>

            <div
              v-if="registration.tournamentPlacement"
              class="mb-3 text-sm font-semibold text-emerald-300"
            >
              Platzierung: #{{ registration.tournamentPlacement }}
            </div>

            <!-- Event Details -->
            <div class="space-y-2">
              <div class="flex items-start gap-2 text-gray-300">
                <CalendarIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span class="text-sm break-words">{{
                  formatEventDate(registration.customEvent.eventDate)
                }}</span>
              </div>

              <div class="flex items-start gap-2 text-gray-300">
                <MapPinIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span class="text-sm break-words">{{
                  registration.customEvent.venue
                }}</span>
              </div>

              <div
                v-if="registration.customEvent.participationFee"
                class="flex items-center gap-2 text-gray-300"
              >
                <CurrencyDollarIcon class="w-4 h-4 flex-shrink-0" />
                <span class="text-sm">{{
                  registration.customEvent.participationFee
                }}</span>
              </div>

              <div class="flex items-center gap-2 text-gray-300">
                <ClockIcon class="w-4 h-4 flex-shrink-0" />
                <span class="text-sm">
                  {{
                    registration.entryType === "bookmark"
                      ? t("dashboard.bookmarkedAt")
                      : t("dashboard.registeredAt")
                  }}
                  {{ formatRegistrationDate(registration.registeredAt) }}
                </span>
              </div>
            </div>

            <!-- Edit Booking Button -->
            <div class="mt-4 pt-4 border-t border-[#202225]">
              <div
                v-if="registration.entryType !== 'bookmark'"
                class="grid gap-3 sm:grid-cols-2"
              >
                <NuxtLink
                  :to="`/booking/${registration.id}`"
                  class="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-lg"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  <span>{{ t("dashboard.manageBooking") }}</span>
                </NuxtLink>
                <NuxtLink
                  v-if="registration.customEventId"
                  :to="`/tournaments/${registration.customEventId}`"
                  class="w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-lg"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 17v-6m4 6V7m4 10V4M5 20h14"
                    />
                  </svg>
                  <span>{{ t("dashboard.tournamentView") }}</span>
                </NuxtLink>
              </div>
              <div v-else class="grid gap-3 sm:grid-cols-2">
                <a
                  v-if="registration.externalRegistrationUrl"
                  :href="registration.externalRegistrationUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-lg"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5M7.5 9H6A1.5 1.5 0 004.5 10.5v7.5A1.5 1.5 0 006 19.5h7.5a1.5 1.5 0 001.5-1.5v-1.5"
                    />
                  </svg>
                  <span>{{ t("dashboard.eventDetails") }}</span>
                </a>
                <button
                  type="button"
                  class="w-full border border-[#202225] bg-[#40444b] hover:bg-[#4f545c] text-gray-200 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  @click="removeBookmark(registration)"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 5l14 14M19 5L5 19"
                    />
                  </svg>
                  <span>{{ t("dashboard.remove") }}</span>
                </button>
              </div>
            </div>

            <!-- Decklist Status Notification -->
            <div
              v-if="
                registration.entryType !== 'bookmark' &&
                registration.customEvent.requiresDecklist
              "
              class="mt-4 p-3 sm:p-4 rounded-lg border"
              :class="{
                'bg-[#40444b] border-yellow-500': needsAttention(registration),
                'bg-[#40444b] border-green-500': !needsAttention(registration),
              }"
              @click.prevent.stop
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <ExclamationTriangleIcon
                    v-if="needsAttention(registration)"
                    class="w-5 h-5 text-yellow-400 flex-shrink-0"
                  />
                  <CheckCircleIcon
                    v-else
                    class="w-5 h-5 text-green-400 flex-shrink-0"
                  />
                  <div>
                    <h4
                      class="font-semibold text-sm sm:text-base"
                      :class="{
                        'text-yellow-300': needsAttention(registration),
                        'text-green-300': !needsAttention(registration),
                      }"
                    >
                      {{ t("dashboard.decklistStatus") }}
                    </h4>
                    <p
                      class="text-xs sm:text-sm"
                      :class="{
                        'text-yellow-200': needsAttention(registration),
                        'text-green-200': !needsAttention(registration),
                      }"
                    >
                      <span v-if="needsAttention(registration)">
                        {{ t("dashboard.decklistNeeded", { count: getTicketsNeedingAttention(registration) }) }}
                      </span>
                      <span v-else>{{ t("dashboard.allDecklistsPresent") }}</span>
                    </p>
                  </div>
                </div>
                <span
                  v-if="needsAttention(registration)"
                  class="px-2 py-1 text-xs font-medium bg-yellow-500 text-gray-900 rounded-full flex-shrink-0"
                >
                  {{ t("dashboard.actionRequired") }}
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>

      <!-- Event History Section - Always visible -->
      <div class="mt-12">
        <EventHistory :isAdmin="false" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from "vue";
// Page is automatically protected by auth.global.ts middleware
import {
  CalendarIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
} from "@heroicons/vue/24/outline";
import { onEventBookmarksUpdated } from "~/utils/eventBookmarks";
import { notifyEventBookmarksUpdated } from "~/utils/eventBookmarks";
// Use centralized composables
const { getDisplayTags } = useTagDisplay();
const {
  getCardBackgroundClass,
  getGameTypeLabel,
  getGameHeaderClass,
  getGameHeaderTextClass,
} = useRegistrationCardStyle();

// Use i18n for translations
const { t } = useI18n();

interface EventRegistration {
  id: string;
  entryType?: "registration" | "bookmark";
  customEventId: string | null;
  externalEventId: string | null;
  playerId: string;
  registeredAt: string;
  status: string;
  notes?: string | null;
  decklist?: string | null;
  bringingDecklistOnsite?: boolean | null;
  isExternalEvent?: boolean;
  eventType?: string;
  tournamentPlacement?: number | null;
  externalRegistrationUrl?: string | null;
  ticketCount?: number;
  tickets?: Array<{
    id: string;
    participantName: string | null;
    participantPlayerId: string | null;
    status: string;
    isAnonymous: boolean;
    decklist: string | null;
    bringingDecklistOnsite: boolean;
  }>;
  customEvent: {
    id: string;
    name: string;
    venue: string;
    eventDate: string;
    maxParticipants: number;
    participationFee?: string | number | null;
    description?: string | null;
    registrationDeadline?: string | null;
    requiresDecklist: boolean;
    status: string;
  };
}

const { user } = useAuth();

const registrations = ref<EventRegistration[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const timelineWindowStart = ref<Date>(startOfDay(addDays(new Date(), -28)));
const TIMELINE_WINDOW_DAYS = 42;
let removeBookmarksListener: (() => void) | null = null;

const fetchRegistrations = async () => {
  try {
    isLoading.value = true;
    error.value = null;

    if (!user.value?.id) {
      throw new Error("User not authenticated");
    }

    const { data, error: fetchError } = await $fetch(
      "/api/dashboard/registrations",
      {
        method: "GET",
      },
    );

    if (fetchError) {
      throw new Error(fetchError);
    }

    registrations.value = data || [];
  } catch (err) {
    console.error("Failed to fetch registrations:", err);
    error.value =
      err instanceof Error ? err.message : "Failed to load registrations";
  } finally {
    isLoading.value = false;
  }
};

const removeBookmark = async (registration: EventRegistration) => {
  if (registration.entryType !== "bookmark" || !registration.externalEventId) {
    return;
  }

  const shouldRemove = window.confirm(
    t("dashboard.removeBookmarkConfirm", { eventName: registration.customEvent.name }),
  );

  if (!shouldRemove) {
    return;
  }

  try {
    await $fetch(`/api/events/bookmarks/${registration.externalEventId}`, {
      method: "DELETE",
    });

    registrations.value = registrations.value.filter(
      (entry) => entry.id !== registration.id,
    );
    notifyEventBookmarksUpdated();
  } catch (err) {
    console.error("Failed to remove bookmark:", err);
    error.value =
      err instanceof Error ? err.message : "Failed to remove bookmark";
  }
};

const getDashboardEntryCardClass = (
  registration: EventRegistration,
): string => {
  if (registration.entryType === "bookmark") {
    return "bg-gradient-to-br from-sky-950 via-cyan-950 to-slate-900 border-sky-700/70";
  }

  return getCardBackgroundClass(registration.customEvent.tagType || "pokemon");
};

// Helper functions for ticket status
const needsAttention = (registration: EventRegistration): boolean => {
  if (!registration.tickets || registration.tickets.length === 0) return false;
  return registration.tickets.some(
    (ticket) => !ticket.decklist && !ticket.bringingDecklistOnsite,
  );
};

const getTicketsNeedingAttention = (
  registration: EventRegistration,
): number => {
  if (!registration.tickets) return 0;
  return registration.tickets.filter(
    (ticket) => !ticket.decklist && !ticket.bringingDecklistOnsite,
  ).length;
};

// Format functions
const formatStatus = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ");
};

const formatEventDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRegistrationDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const timelineWindowEnd = computed(() => addDays(timelineWindowStart.value, TIMELINE_WINDOW_DAYS));

const timelineRangeLabel = computed(() => {
  return `${formatTimelineDate(timelineWindowStart.value.toISOString())} - ${formatTimelineDate(timelineWindowEnd.value.toISOString())}`;
});

const timelineEvents = computed(() => {
  const start = startOfDay(timelineWindowStart.value);
  const end = startOfDay(timelineWindowEnd.value);

  return registrations.value
    .filter((entry) => {
      const eventDate = new Date(entry.customEvent.eventDate);
      const day = startOfDay(eventDate);
      return day >= start && day <= end;
    })
    .sort(
      (a, b) =>
        new Date(a.customEvent.eventDate).getTime() -
        new Date(b.customEvent.eventDate).getTime(),
    )
    .map((entry) => ({
      ...entry,
      isPast: startOfDay(new Date(entry.customEvent.eventDate)) < startOfDay(new Date()),
    }));
});

const shiftTimelineWindow = (days: number) => {
  timelineWindowStart.value = startOfDay(addDays(timelineWindowStart.value, days));
};

const timelineBadgeLabel = (entry: EventRegistration & { isPast: boolean }) => {
  return entry.entryType === "bookmark"
    ? t("dashboard.timelineBookmarked")
    : t("dashboard.timelineRegistered");
};

const timelineCardClass = (entry: EventRegistration & { isPast: boolean }) => {
  if (entry.isPast) {
    return "border-[#3b3f46] bg-[#2a2d32]";
  }
  if (entry.entryType === "bookmark") {
    return "border-blue-800 bg-blue-950/40";
  }
  return "border-emerald-800 bg-emerald-950/30";
};

const timelineBadgeClass = (entry: EventRegistration & { isPast: boolean }) => {
  if (entry.isPast) {
    return "bg-gray-700 text-gray-300";
  }
  if (entry.entryType === "bookmark") {
    return "bg-blue-700 text-blue-100";
  }
  return "bg-emerald-700 text-emerald-100";
};

const formatTimelineDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

// Load data on mount
onMounted(() => {
  fetchRegistrations();
  removeBookmarksListener = onEventBookmarksUpdated(() => {
    fetchRegistrations();
  });
});

onBeforeUnmount(() => {
  removeBookmarksListener?.();
});
</script>

<style scoped>
.event-type-badge {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  white-space: nowrap;
}

/* Tag type badges */
.event-type-badge.type-league_cup {
  background-color: #bbf7d0;
  color: #166534;
}

.event-type-badge.type-league_challenge {
  background-color: #bfdbfe;
  color: #1e40af;
}

.event-type-badge.type-local_tournament,
.event-type-badge.type-store_tournament {
  background-color: #e0f2fe;
  color: #075985;
}

.event-type-badge.type-premier_challenge,
.event-type-badge.type-special_event,
.event-type-badge.type-custom {
  background-color: #fed7aa;
  color: #9a3412;
}

.event-type-badge.type-prerelease,
.event-type-badge.type-pre_release {
  background-color: #fef3c7;
  color: #92400e;
}

.event-type-badge.type-midseason_showdown,
.event-type-badge.type-regional_championships {
  background-color: #ddd6fe;
  color: #5b21b6;
}

/* Game badges */
.event-type-badge.game-pokemon {
  background-color: #fef3c7;
  color: #92400e;
}

.event-type-badge.game-riftbound {
  background-color: #fee2e2;
  color: #991b1b;
}

.event-type-badge.game-generic {
  background-color: #e5e7eb;
  color: #374151;
}

/* Format badges */
.event-type-badge.format-standard,
.event-type-badge.format-expanded,
.event-type-badge.format-unlimited {
  background-color: #cffafe;
  color: #155e75;
}

/* Host badges */
.event-type-badge.host {
  background-color: #f3e8ff;
  color: #6b21a8;
}
</style>
