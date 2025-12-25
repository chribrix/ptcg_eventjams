<template>
  <div
    :class="
      compact
        ? ''
        : 'bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm overflow-hidden'
    "
  >
    <!-- Header (only in non-compact mode) -->
    <div
      v-if="!compact"
      class="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div
            class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"
          >
            <UsersIcon class="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-white">Participants</h3>
            <p class="text-indigo-100 text-sm">
              {{ participants.length }}
              {{ participants.length === 1 ? "player" : "players" }} registered
            </p>
          </div>
        </div>
        <button
          @click="refreshParticipants"
          class="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
          title="Refresh participants"
        >
          <ArrowPathIcon class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" :class="compact ? 'p-2' : 'p-4'">
      <div class="flex items-center gap-2 text-gray-600">
        <div
          class="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"
        ></div>
        <span>Loading participants...</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" :class="compact ? 'p-2' : 'p-4'">
      <div class="text-red-600 text-sm">
        Failed to load participants: {{ error }}
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="
        participants.length === 0 && cancelledParticipants.length === 0
      "
      :class="
        compact
          ? 'p-2 text-center text-gray-500'
          : 'p-4 text-center text-gray-500'
      "
    >
      <p>No participants registered yet.</p>
    </div>

    <!-- Participants List -->
    <div v-else :class="compact ? '' : 'p-6'">
      <!-- Active Participants -->
      <div v-if="participants.length > 0" class="grid gap-4">
        <div
          v-for="participant in participants"
          :key="participant.id"
          :class="
            compact
              ? 'group bg-gray-50 rounded-lg border border-gray-200 p-3 hover:bg-gray-100 transition-all duration-200'
              : 'group bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200'
          "
        >
          <div
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full"
          >
            <div
              class="flex items-center space-x-3 sm:space-x-4 min-w-0"
              :class="compact ? '' : ''"
            >
              <div class="relative flex-shrink-0">
                <!-- Player Avatar with status indicator -->
                <div
                  v-if="participant.isAnonymous"
                  :class="
                    compact
                      ? 'w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-md'
                      : 'w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg'
                  "
                >
                  <UserGroupIcon :class="compact ? 'w-4 h-4' : 'w-5 h-5'" />
                </div>
                <div
                  v-else
                  :class="
                    compact
                      ? 'w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-md'
                      : 'w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg'
                  "
                >
                  {{ getInitials(participant.playerName) }}
                </div>
                <div
                  v-if="!participant.isAnonymous"
                  :class="[
                    getStatusIndicatorClass(participant.status),
                    compact ? 'w-2.5 h-2.5' : 'w-3 h-3',
                  ]"
                  class="absolute -bottom-1 -right-1 rounded-full border-2 border-white shadow-sm"
                ></div>
              </div>

              <!-- Player Info -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center space-x-2">
                  <UserIcon
                    v-if="!participant.isAnonymous"
                    :class="compact ? 'w-3 h-3' : 'w-4 h-4'"
                    class="text-gray-400 flex-shrink-0"
                  />
                  <p
                    :class="[
                      compact ? 'font-medium' : 'font-semibold',
                      participant.isAnonymous
                        ? 'text-gray-500'
                        : 'text-gray-900',
                    ]"
                  >
                    {{ participant.playerName }}
                  </p>
                </div>
                <div
                  v-if="!compact && !participant.isAnonymous"
                  class="flex items-center space-x-2 mt-1"
                >
                  <ClockIcon class="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <p class="text-xs text-gray-500">
                    Registered
                    {{ formatRegistrationDate(participant.registeredAt) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Status Indicators (not shown for anonymous group) -->
            <div
              v-if="!participant.isAnonymous"
              class="flex items-center flex-shrink-0 ml-auto sm:ml-0"
            >
              <!-- Registration Status -->
              <span
                :class="getParticipantStatusBadgeClass(participant)"
                class="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
              >
                <div
                  :class="getParticipantStatusDotClass(participant)"
                  class="w-2 h-2 rounded-full mr-2"
                ></div>
                {{ getParticipantStatusLabel(participant) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Cancelled Participants Section (Admin Only) -->
      <div v-if="cancelledParticipants.length > 0 && isAdmin" class="mt-6">
        <div class="flex items-center space-x-2 mb-3">
          <div class="h-px flex-1 bg-gray-300"></div>
          <h4
            class="text-sm font-semibold text-gray-600 uppercase tracking-wide"
          >
            Cancelled
          </h4>
          <div class="h-px flex-1 bg-gray-300"></div>
        </div>
        <div class="grid gap-4">
          <div
            v-for="participant in cancelledParticipants"
            :key="participant.id"
            :class="
              compact
                ? 'group bg-gray-50 rounded-lg border border-gray-200 p-3 opacity-60'
                : 'group bg-white rounded-xl border border-gray-200 p-4 opacity-60'
            "
          >
            <div
              class="flex items-start sm:items-center justify-between gap-3 flex-wrap"
            >
              <div
                class="flex items-center min-w-0 flex-1"
                :class="compact ? 'space-x-3' : 'space-x-4'"
              >
                <div class="relative flex-shrink-0">
                  <!-- Player Avatar -->
                  <div
                    :class="
                      compact
                        ? 'w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-md'
                        : 'w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg'
                    "
                  >
                    {{ getInitials(participant.playerName) }}
                  </div>
                </div>

                <!-- Player Info -->
                <div class="min-w-0 flex-1">
                  <div class="flex items-center space-x-2">
                    <UserIcon
                      :class="compact ? 'w-3 h-3' : 'w-4 h-4'"
                      class="text-gray-400 flex-shrink-0"
                    />
                    <p
                      :class="
                        compact
                          ? 'font-medium text-gray-600 truncate line-through'
                          : 'font-semibold text-gray-600 truncate line-through'
                      "
                    >
                      {{ participant.playerName }}
                    </p>
                  </div>
                  <div v-if="!compact" class="flex items-center space-x-2 mt-1">
                    <ClockIcon class="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <p class="text-xs text-gray-500">
                      Registered
                      {{ formatRegistrationDate(participant.registeredAt) }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Cancelled Badge -->
              <div class="flex items-center flex-shrink-0">
                <span
                  class="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 whitespace-nowrap"
                >
                  <div class="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                  Cancelled
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  UsersIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  UserIcon,
} from "@heroicons/vue/24/outline";

interface Participant {
  id: string;
  status: "registered" | "reserved" | "cancelled";
  registeredAt: string;
  playerName: string;
  hasDecklistSubmitted: boolean;
  isBringingDecklistOnsite: boolean;
  isAnonymous: boolean;
}

interface ParticipantsResponse {
  event: {
    id: string;
    name: string;
  };
  participants: Participant[];
  cancelledParticipants?: Participant[];
}

interface Props {
  eventId: string;
  showDecklistStatus?: boolean;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showDecklistStatus: false,
  compact: false,
});

const participants = ref<Participant[]>([]);
const cancelledParticipants = ref<Participant[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Check if user is admin
const { checkAdminStatus } = useAdmin();
const isAdmin = ref(false);

onMounted(async () => {
  isAdmin.value = await checkAdminStatus();
});

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatRegistrationDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays === 0) {
    return "today";
  } else if (diffInDays === 1) {
    return "yesterday";
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
}

async function fetchParticipants(): Promise<void> {
  if (!props.eventId) return;

  try {
    isLoading.value = true;
    error.value = null;

    const response = await $fetch<ParticipantsResponse>(
      `/api/events/${props.eventId}/participants`
    );

    participants.value = response.participants || [];
    cancelledParticipants.value = response.cancelledParticipants || [];
  } catch (err: unknown) {
    console.error("Failed to fetch participants:", err);
    error.value =
      err instanceof Error ? err.message : "Failed to load participants";
    participants.value = [];
  } finally {
    isLoading.value = false;
  }
}

async function refreshParticipants(): Promise<void> {
  await fetchParticipants();
}

function getParticipantStatusLabel(participant: Participant): string {
  // If event doesn't require decklist, just show registration status
  if (!props.showDecklistStatus) {
    return participant.status === "registered" ? "Registered" : "Reserved";
  }

  // If event requires decklist, check decklist submission regardless of registration status
  if (
    participant.hasDecklistSubmitted ||
    participant.isBringingDecklistOnsite
  ) {
    return "Registered";
  }

  // If event requires decklist but user hasn't submitted it
  return "No deck submitted";
}

function getParticipantStatusBadgeClass(participant: Participant): string {
  // If event doesn't require decklist, just show registration status
  if (!props.showDecklistStatus) {
    return participant.status === "registered"
      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
      : "bg-amber-100 text-amber-800 border border-amber-200";
  }

  // If event requires decklist, check decklist submission regardless of registration status
  if (
    participant.hasDecklistSubmitted ||
    participant.isBringingDecklistOnsite
  ) {
    return "bg-emerald-100 text-emerald-800 border border-emerald-200";
  }

  // If event requires decklist but user hasn't submitted it
  return "bg-amber-100 text-amber-800 border border-amber-200";
}

function getParticipantStatusDotClass(participant: Participant): string {
  // If event doesn't require decklist, just show registration status
  if (!props.showDecklistStatus) {
    return participant.status === "registered"
      ? "bg-emerald-500"
      : "bg-amber-500";
  }

  // If event requires decklist, check decklist submission regardless of registration status
  if (
    participant.hasDecklistSubmitted ||
    participant.isBringingDecklistOnsite
  ) {
    return "bg-emerald-500";
  }

  // If event requires decklist but user hasn't submitted it
  return "bg-amber-500";
}

function getRegistrationBadgeClass(status: string): string {
  return status === "registered"
    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
    : "bg-amber-100 text-amber-800 border border-amber-200";
}

function getStatusDotClass(status: string): string {
  return status === "registered" ? "bg-emerald-500" : "bg-amber-500";
}

function getStatusIndicatorClass(status: string): string {
  return status === "registered"
    ? "bg-emerald-500 shadow-emerald-500/50"
    : "bg-amber-500 shadow-amber-500/50";
}

// Fetch participants when component mounts or eventId changes
watchEffect(() => {
  if (props.eventId) {
    fetchParticipants();
  }
});

// Expose refresh function for parent components
defineExpose({
  refresh: fetchParticipants,
});
</script>
