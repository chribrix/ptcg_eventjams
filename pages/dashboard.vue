<template>
  <div class="min-h-screen app-bg-page py-4 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-5 text-center">
        <h1 class="text-3xl font-bold text-white sm:text-4xl">
          {{ t("dashboard.title") }}
        </h1>
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
        class="app-surface-0 border border-red-600 rounded-lg p-6 text-center"
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
        class="app-surface-0 rounded-lg shadow-sm border app-border p-8 text-center"
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
        <div class="mb-7 rounded-xl border app-border app-surface-0 p-3 sm:p-4">
          <div class="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-bold text-white">{{ t("dashboard.timelinePlanningTitle") }}</h2>
              <p class="text-xs text-gray-300">{{ timelineRangeLabel }}</p>
            </div>
          </div>

          <div class="mb-3 rounded-lg border app-border app-bg-page p-2.5">
            <div class="mb-2 flex items-center justify-between">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-300">
                {{ miniCalendarMonthLabel }}
              </h3>
            </div>
            <div class="mb-1 grid grid-cols-7 gap-1">
              <span
                v-for="weekday in miniCalendarWeekdays"
                :key="`wk-${weekday}`"
                class="text-center text-[10px] font-semibold text-gray-500"
              >
                {{ weekday }}
              </span>
            </div>
            <div class="grid grid-cols-7 gap-1">
              <button
                v-for="day in miniCalendarDays"
                :key="day.key"
                type="button"
                class="h-7 rounded-md border text-[11px] font-semibold"
                :class="miniCalendarDayClass(day)"
                :style="miniCalendarDayStyle(day)"
                :disabled="!day.inMonth"
                @click="day.event ? openTimelineModal(day.event) : null"
              >
                {{ day.label }}
              </button>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              class="rounded-lg app-btn-neutral px-4 py-2.5 text-base font-semibold shadow"
              @click="shiftTimelineWindowByMonth(-1)"
            >
              &lt; Früher
            </button>
            <button
              type="button"
              class="rounded-lg app-btn-neutral px-4 py-2.5 text-base font-semibold shadow"
              @click="shiftTimelineWindowByMonth(1)"
            >
              Später &gt;
            </button>
          </div>
        </div>

        <div
          v-if="selectedTimelineEntry"
          class="fixed inset-0 z-50 flex items-end bg-black/60 p-0 sm:items-center sm:justify-center sm:p-4"
          @click="closeTimelineModal"
        >
          <div
            class="w-full rounded-t-2xl border app-border app-surface-0 p-4 sm:max-w-md sm:rounded-2xl"
            @click.stop
          >
            <div class="mb-3 flex items-start justify-between gap-3">
              <h3 class="text-lg font-bold text-white">{{ selectedTimelineEntry.customEvent.name }}</h3>
              <button
                type="button"
                class="rounded-md app-btn-neutral px-2 py-1 text-sm"
                @click="closeTimelineModal"
              >
                ×
              </button>
            </div>
            <p class="text-sm text-gray-300">{{ formatEventDate(selectedTimelineEntry.customEvent.eventDate) }}</p>
            <p class="mt-1 text-sm text-gray-300">{{ selectedTimelineEntry.customEvent.venue }}</p>
            <p
              v-if="timelineActionError"
              class="mt-3 rounded-md border border-red-600/60 bg-red-900/30 px-3 py-2 text-xs text-red-200"
            >
              {{ timelineActionError }}
            </p>
            <div class="mt-4 grid grid-cols-1 gap-2">
              <a
                :href="routePlannerUrl(selectedTimelineEntry)"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                {{ t("dashboard.openRoutePlanner") }}
              </a>
              <NuxtLink
                v-if="selectedTimelineEntry.customEventId"
                :to="`/events/${selectedTimelineEntry.customEventId}`"
                class="inline-flex items-center justify-center rounded-lg app-btn-neutral px-3 py-2 text-sm font-semibold"
              >
                {{ t("dashboard.timelineEventDetails") }}
              </NuxtLink>
              <a
                v-else-if="selectedTimelineEntry.externalRegistrationUrl"
                :href="selectedTimelineEntry.externalRegistrationUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center rounded-lg app-btn-neutral px-3 py-2 text-sm font-semibold"
              >
                {{ t("dashboard.timelineEventDetails") }}
              </a>
            </div>

            <div class="mt-4 border-t app-border pt-3">
              <template v-if="selectedTimelineEntry.entryType === 'bookmark'">
                <button
                  type="button"
                  class="inline-flex w-full items-center justify-center rounded-lg border border-red-600/70 bg-red-950/40 px-3 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="timelineActionPending"
                  @click="removeTimelineBookmark"
                >
                  {{ timelineActionPending ? t("dashboard.processingAction") : t("dashboard.removeBookmarkAction") }}
                </button>
              </template>
              <template v-else>
                <div
                  v-if="selectedTimelineActiveTickets.length > 1"
                  class="mb-3 rounded-md border app-border app-bg-page p-3"
                >
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <p class="text-xs font-semibold uppercase tracking-wide text-gray-300">
                      {{ t("dashboard.cancelTicketsTitle") }}
                    </p>
                    <button
                      type="button"
                      class="text-xs font-semibold text-sky-300 hover:text-sky-200"
                      @click="toggleAllTimelineTickets"
                    >
                      {{
                        timelineAllActiveSelected
                          ? t("dashboard.unselectAllTickets")
                          : t("dashboard.selectAllTickets")
                      }}
                    </button>
                  </div>
                  <div class="grid gap-2">
                    <label
                      v-for="ticket in selectedTimelineActiveTickets"
                      :key="ticket.id"
                      class="flex items-center gap-2 rounded-md border app-border app-surface-0 px-2 py-2 text-sm text-gray-200"
                    >
                      <input
                        :checked="timelineSelectedTicketIds.includes(ticket.id)"
                        type="checkbox"
                        class="h-4 w-4 rounded border-gray-500 bg-transparent"
                        @change="toggleTimelineTicket(ticket.id)"
                      />
                      <span class="truncate">
                        {{ ticket.participantName || t("dashboard.unnamedTicket") }}
                        <span
                          v-if="ticket.participantPlayerId"
                          class="text-xs text-gray-400"
                        >
                          (#{{ ticket.participantPlayerId }})
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
                <button
                  type="button"
                  class="inline-flex w-full items-center justify-center rounded-lg border border-red-600/70 bg-red-950/40 px-3 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="timelineActionPending || timelineSelectedTicketIds.length === 0"
                  @click="cancelTimelineRegistrationSelection"
                >
                  {{ timelineActionPending ? t("dashboard.processingAction") : t("dashboard.cancelRegistrationAction") }}
                </button>
              </template>
            </div>
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
            <div class="mt-4 pt-4 border-t app-border">
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
                  class="w-full app-btn-neutral font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
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
                'app-surface-2 border-yellow-500': needsAttention(registration),
                'app-surface-2 border-green-500': !needsAttention(registration),
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
import { getEventColor } from "~/utils/eventColors";
import {
  getCustomCalendarEventType,
  getExternalCalendarEventType,
} from "~/utils/calendarEventUtils";
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
    eventType?: string;
    tags?: unknown;
    tagType?: string;
  };
}

const { user } = useAuth();

const registrations = ref<EventRegistration[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const timelineWindowStart = ref<Date>(startOfMonth(new Date()));
const selectedTimelineEntry = ref<(EventRegistration & { isPast: boolean }) | null>(null);
const timelineActionPending = ref(false);
const timelineActionError = ref<string | null>(null);
const timelineSelectedTicketIds = ref<string[]>([]);
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

const timelineWindowEnd = computed(() => endOfMonth(timelineWindowStart.value));
const miniCalendarWeekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const timelineEventsByDay = computed(() => {
  const map = new Map<string, (EventRegistration & { isPast: boolean })>();
  for (const entry of timelineEvents.value) {
    const key = isoDayKey(entry.customEvent.eventDate);
    if (!map.has(key)) {
      map.set(key, entry);
    }
  }
  return map;
});

const miniCalendarMonthStart = computed(() => {
  const d = new Date(timelineWindowStart.value);
  d.setDate(1);
  return startOfDay(d);
});

const miniCalendarMonthLabel = computed(() => {
  return miniCalendarMonthStart.value.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
});

type MiniCalDay = {
  key: string;
  label: string;
  date: Date;
  inMonth: boolean;
  event: (EventRegistration & { isPast: boolean }) | null;
};

const miniCalendarDays = computed<MiniCalDay[]>(() => {
  const monthStart = miniCalendarMonthStart.value;
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const gridStart = addDays(monthStart, -firstWeekday);
  const days: MiniCalDay[] = [];

  for (let i = 0; i < 42; i += 1) {
    const date = addDays(gridStart, i);
    const key = isoDayKey(date);
    days.push({
      key: `${key}-${i}`,
      label: String(date.getDate()),
      date,
      inMonth: date.getMonth() === monthStart.getMonth(),
      event: timelineEventsByDay.value.get(key) || null,
    });
  }

  return days;
});

const timelineRangeLabel = computed(() => {
  return `${formatTimelineDate(timelineWindowStart.value)} - ${formatTimelineDate(timelineWindowEnd.value)}`;
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

const shiftTimelineWindowByMonth = (months: number) => {
  const next = new Date(timelineWindowStart.value);
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  timelineWindowStart.value = startOfMonth(next);
};

const openTimelineModal = (entry: EventRegistration & { isPast: boolean }) => {
  selectedTimelineEntry.value = entry;
  timelineActionError.value = null;
  timelineSelectedTicketIds.value = getActiveTickets(entry).map((ticket) => ticket.id);
};

const closeTimelineModal = () => {
  if (timelineActionPending.value) return;
  selectedTimelineEntry.value = null;
  timelineActionError.value = null;
  timelineSelectedTicketIds.value = [];
};

const getActiveTickets = (
  entry: EventRegistration | (EventRegistration & { isPast: boolean }) | null,
) => {
  if (!entry?.tickets?.length) return [];
  return entry.tickets.filter((ticket) => ticket.status !== "cancelled");
};

const selectedTimelineActiveTickets = computed(() =>
  getActiveTickets(selectedTimelineEntry.value),
);

const timelineAllActiveSelected = computed(() => {
  const activeIds = selectedTimelineActiveTickets.value.map((ticket) => ticket.id);
  return (
    activeIds.length > 0 &&
    activeIds.every((ticketId) =>
      timelineSelectedTicketIds.value.includes(ticketId),
    )
  );
});

const toggleTimelineTicket = (ticketId: string) => {
  if (timelineActionPending.value) return;
  if (timelineSelectedTicketIds.value.includes(ticketId)) {
    timelineSelectedTicketIds.value = timelineSelectedTicketIds.value.filter(
      (id) => id !== ticketId,
    );
    return;
  }
  timelineSelectedTicketIds.value = [...timelineSelectedTicketIds.value, ticketId];
};

const toggleAllTimelineTickets = () => {
  if (timelineActionPending.value) return;
  if (timelineAllActiveSelected.value) {
    timelineSelectedTicketIds.value = [];
    return;
  }
  timelineSelectedTicketIds.value = selectedTimelineActiveTickets.value.map(
    (ticket) => ticket.id,
  );
};

const refreshAfterTimelineMutation = async (targetId: string) => {
  await fetchRegistrations();
  const refreshedEntry = timelineEvents.value.find((entry) => entry.id === targetId);
  if (!refreshedEntry) {
    closeTimelineModal();
    return;
  }
  closeTimelineModal();
};

const removeTimelineBookmark = async () => {
  const entry = selectedTimelineEntry.value;
  if (
    !entry ||
    entry.entryType !== "bookmark" ||
    !entry.externalEventId ||
    timelineActionPending.value
  ) {
    return;
  }

  const confirmed = window.confirm(
    t("dashboard.removeBookmarkConfirm", { eventName: entry.customEvent.name }),
  );
  if (!confirmed) return;

  try {
    timelineActionPending.value = true;
    timelineActionError.value = null;
    await $fetch(`/api/events/bookmarks/${entry.externalEventId}`, {
      method: "DELETE",
    });
    notifyEventBookmarksUpdated();
    await refreshAfterTimelineMutation(entry.id);
  } catch (err) {
    console.error("Failed to remove bookmark from timeline:", err);
    timelineActionError.value =
      err instanceof Error ? err.message : t("dashboard.actionFailed");
  } finally {
    timelineActionPending.value = false;
  }
};

const cancelTimelineRegistrationSelection = async () => {
  const entry = selectedTimelineEntry.value;
  if (!entry || entry.entryType === "bookmark" || timelineActionPending.value) {
    return;
  }

  const activeTickets = getActiveTickets(entry);
  const selectedTickets = activeTickets.filter((ticket) =>
    timelineSelectedTicketIds.value.includes(ticket.id),
  );

  if (selectedTickets.length === 0) {
    timelineActionError.value = t("dashboard.selectAtLeastOneTicket");
    return;
  }

  const cancellingAll = selectedTickets.length === activeTickets.length;
  const confirmationMessage = cancellingAll
    ? t("dashboard.cancelAllTicketsConfirm", { eventName: entry.customEvent.name })
    : t("dashboard.cancelSelectedTicketsConfirm", {
        count: selectedTickets.length,
        eventName: entry.customEvent.name,
      });

  if (!window.confirm(confirmationMessage)) {
    return;
  }

  try {
    timelineActionPending.value = true;
    timelineActionError.value = null;

    if (cancellingAll) {
      await $fetch(`/api/dashboard/registrations/${entry.id}/cancel`, {
        method: "POST",
      });
    } else {
      await Promise.all(
        selectedTickets.map((ticket) =>
          $fetch(`/api/bookings/${entry.id}/tickets/${ticket.id}`, {
            method: "DELETE",
          }),
        ),
      );
    }

    await refreshAfterTimelineMutation(entry.id);
  } catch (err) {
    console.error("Failed to cancel timeline registration:", err);
    timelineActionError.value =
      err instanceof Error ? err.message : t("dashboard.actionFailed");
  } finally {
    timelineActionPending.value = false;
  }
};

const routePlannerUrl = (entry: EventRegistration) => {
  const target = entry.customEvent.venue || entry.customEvent.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`;
};

const formatTimelineDate = (input: string | Date): string => {
  const parsed = input instanceof Date ? new Date(input) : new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return parsed.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const miniCalendarDayClass = (day: MiniCalDay) => {
  if (!day.inMonth) {
    return "border-transparent bg-transparent text-gray-600";
  }

  if (!day.event) {
    return "app-border app-surface-0 text-gray-300";
  }

  if (day.event.isPast) {
    return "border-gray-500 opacity-70";
  }

  if (day.event.entryType === "bookmark") {
    return "border-blue-500";
  }

  if (day.event.status === "reserved") {
    return "border-amber-500";
  }

  return "border-emerald-500";
};

function isoDayKey(input: string | Date): string {
  const d = input instanceof Date ? new Date(input) : new Date(input);
  if (Number.isNaN(d.getTime())) return "invalid";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveMiniCalendarColor(event: EventRegistration & { isPast: boolean }) {
  if (event.entryType === "bookmark") {
    return getEventColor(
      getExternalCalendarEventType({
        type: event.eventType || event.customEvent.eventType || "",
        icon: "",
      }),
    );
  }

  return getEventColor(
    getCustomCalendarEventType({
      eventType: event.customEvent.eventType,
      tags: event.customEvent.tags,
      tagType: event.customEvent.tagType,
    }),
  );
}

const miniCalendarDayStyle = (day: MiniCalDay) => {
  if (!day.inMonth || !day.event) return undefined;
  const palette = resolveMiniCalendarColor(day.event);
  return {
    backgroundColor: palette.bg,
    color: palette.text,
  };
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

function startOfMonth(date: Date): Date {
  const next = new Date(date);
  next.setDate(1);
  return startOfDay(next);
}

function endOfMonth(date: Date): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1, 0);
  return startOfDay(next);
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
