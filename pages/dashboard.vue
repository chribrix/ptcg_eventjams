<template>
  <div class="min-h-screen bg-gray-50 py-8 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-8 text-center">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">
          {{ t("dashboard.title") }}
        </h1>
        <p class="text-lg text-gray-600">
          {{ t("dashboard.subtitle") }}
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="flex items-center gap-3 text-gray-600">
          <div
            class="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"
          ></div>
          <span class="text-lg">{{ t("dashboard.loadingRegistrations") }}</span>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-50 border border-red-200 rounded-lg p-6 text-center"
      >
        <h3 class="text-xl font-semibold text-red-800 mb-2">
          {{ t("dashboard.errorLoading") }}
        </h3>
        <p class="text-red-600 mb-4">{{ error }}</p>
        <button
          @click="fetchRegistrations"
          class="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
        >
          {{ t("dashboard.tryAgain") }}
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="registrations.length === 0"
        class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center"
      >
        <h3 class="text-2xl font-semibold text-gray-900 mb-2">
          No Event Registrations
        </h3>
        <p class="text-gray-600 mb-6">
          You haven't registered for any events yet.
        </p>
        <NuxtLink
          to="/events"
          class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
        >
          Browse Events
        </NuxtLink>
      </div>

      <!-- Current Registrations List -->
      <div v-else>
        <h2 class="text-2xl font-bold text-gray-900 mb-6">
          {{ t("dashboard.currentRegistrations") }}
        </h2>
        <div class="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 mb-12">
          <NuxtLink
            v-for="registration in registrations"
            :key="registration.id"
            :to="`/booking/${registration.id}`"
            class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer block"
          >
            <!-- Event Header -->
            <div
              class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-2">
                  <h3
                    class="text-lg sm:text-xl font-semibold text-gray-900 truncate"
                  >
                    {{ registration.customEvent.name }}
                  </h3>
                  <span
                    v-if="
                      registration.eventType &&
                      registration.eventType !== 'custom'
                    "
                    class="event-type-badge flex-shrink-0"
                    :class="`type-${registration.eventType}`"
                  >
                    {{ getEventTypeName(registration.eventType) }}
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
                  {{ registration.ticketCount }} Tickets
                </div>
              </div>
              <span
                class="px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap self-start flex-shrink-0"
                :class="{
                  'bg-green-100 text-green-800':
                    registration.status === 'registered',
                  'bg-yellow-100 text-yellow-800':
                    registration.status === 'reserved',
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

            <!-- Event Details -->
            <div class="space-y-2">
              <div class="flex items-start gap-2 text-gray-600">
                <CalendarIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span class="text-sm break-words">{{
                  formatEventDate(registration.customEvent.eventDate)
                }}</span>
              </div>

              <div class="flex items-start gap-2 text-gray-600">
                <MapPinIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span class="text-sm break-words">{{
                  registration.customEvent.venue
                }}</span>
              </div>

              <div
                v-if="registration.customEvent.participationFee"
                class="flex items-center gap-2 text-gray-600"
              >
                <CurrencyDollarIcon class="w-4 h-4 flex-shrink-0" />
                <span class="text-sm"
                  >€{{ registration.customEvent.participationFee }}</span
                >
              </div>

              <div class="flex items-center gap-2 text-gray-600">
                <ClockIcon class="w-4 h-4 flex-shrink-0" />
                <span class="text-sm">
                  Registered:
                  {{ formatRegistrationDate(registration.registeredAt) }}
                </span>
              </div>
            </div>

            <!-- Edit Booking Button -->
            <div class="mt-4 pt-4 border-t border-gray-200">
              <button
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
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
                <span>Manage Booking & Tickets</span>
              </button>
            </div>

            <!-- Decklist Status Notification -->
            <div
              v-if="registration.customEvent.requiresDecklist"
              class="mt-4 p-3 sm:p-4 rounded-lg border"
              :class="{
                'bg-yellow-50 border-yellow-200': needsAttention(registration),
                'bg-green-50 border-green-200': !needsAttention(registration),
              }"
              @click.prevent.stop
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <ExclamationTriangleIcon
                    v-if="needsAttention(registration)"
                    class="w-5 h-5 text-yellow-600 flex-shrink-0"
                  />
                  <CheckCircleIcon
                    v-else
                    class="w-5 h-5 text-green-600 flex-shrink-0"
                  />
                  <div>
                    <h4
                      class="font-semibold text-sm sm:text-base"
                      :class="{
                        'text-yellow-900': needsAttention(registration),
                        'text-green-900': !needsAttention(registration),
                      }"
                    >
                      Decklist Status
                    </h4>
                    <p
                      class="text-xs sm:text-sm"
                      :class="{
                        'text-yellow-700': needsAttention(registration),
                        'text-green-700': !needsAttention(registration),
                      }"
                    >
                      <span v-if="needsAttention(registration)">
                        {{ getTicketsNeedingAttention(registration) }} ticket(s)
                        need decklist submission
                      </span>
                      <span v-else> All tickets have decklists </span>
                    </p>
                  </div>
                </div>
                <span
                  v-if="needsAttention(registration)"
                  class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full flex-shrink-0"
                >
                  Action Required
                </span>
              </div>
            </div>
          </NuxtLink>
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
import { getEventTypeName } from "~/utils/eventTypes";

// Use i18n for translations
const { t } = useI18n();

interface EventRegistration {
  id: string;
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
    participationFee?: string | null; // Decimal fields are serialized as strings
    description?: string | null;
    registrationDeadline?: string | null;
    requiresDecklist: boolean;
    status: string;
  };
}

const { $client: supabase } = useNuxtApp();
const { user } = useAuth();

const registrations = ref<EventRegistration[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

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
      }
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

// Helper functions for ticket status
const needsAttention = (registration: EventRegistration): boolean => {
  if (!registration.tickets || registration.tickets.length === 0) return false;
  return registration.tickets.some(
    (ticket) => !ticket.decklist && !ticket.bringingDecklistOnsite
  );
};

const getTicketsNeedingAttention = (
  registration: EventRegistration
): number => {
  if (!registration.tickets) return 0;
  return registration.tickets.filter(
    (ticket) => !ticket.decklist && !ticket.bringingDecklistOnsite
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

// Load data on mount
onMounted(() => {
  fetchRegistrations();
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

.event-type-badge.type-cup {
  background-color: #bbf7d0;
  color: #166534;
}

.event-type-badge.type-challenge {
  background-color: #bfdbfe;
  color: #1e40af;
}

.event-type-badge.type-local {
  background-color: #e0f2fe;
  color: #075985;
}

.event-type-badge.type-custom {
  background-color: #fed7aa;
  color: #9a3412;
}
</style>
