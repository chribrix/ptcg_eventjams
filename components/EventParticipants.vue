<template>
  <div
    class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm overflow-hidden"
  >
    <!-- Header -->
    <div class="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
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
    <div v-if="isLoading" class="p-4">
      <div class="flex items-center gap-2 text-gray-600">
        <div
          class="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"
        ></div>
        <span>Loading participants...</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-4">
      <div class="text-red-600 text-sm">
        Failed to load participants: {{ error }}
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="participants.length === 0"
      class="p-4 text-center text-gray-500"
    >
      <p>No participants registered yet.</p>
    </div>

    <!-- Participants List -->
    <div v-else class="p-6">
      <div class="grid gap-4">
        <div
          v-for="participant in participants"
          :key="participant.id"
          class="group bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="relative flex-shrink-0">
                <!-- Player Avatar with status indicator -->
                <div
                  class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg"
                >
                  {{ getInitials(participant.playerName) }}
                </div>
                <div
                  :class="getStatusIndicatorClass(participant.status)"
                  class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                ></div>
              </div>

              <!-- Player Info -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center space-x-2">
                  <UserIcon class="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <p class="font-semibold text-gray-900 truncate">
                    {{ participant.playerName }}
                  </p>
                </div>
                <div class="flex items-center space-x-2 mt-1">
                  <ClockIcon class="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <p class="text-xs text-gray-500">
                    Registered
                    {{ formatRegistrationDate(participant.registeredAt) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Status Indicators -->
            <div class="flex items-center space-x-3">
              <!-- Registration Status -->
              <span
                :class="getRegistrationBadgeClass(participant.status)"
                class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
              >
                <div
                  :class="getStatusDotClass(participant.status)"
                  class="w-2 h-2 rounded-full mr-2"
                ></div>
                {{
                  participant.status === "registered" ? "Confirmed" : "Reserved"
                }}
              </span>

              <!-- Decklist Status (if event requires decklist) -->
              <div v-if="showDecklistStatus" class="flex items-center">
                <span
                  v-if="participant.hasDecklistSubmitted"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200"
                  title="Decklist submitted online"
                >
                  <CheckCircleIcon class="w-3 h-3" />
                  Online
                </span>
                <span
                  v-else-if="participant.isBringingDecklistOnsite"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200"
                  title="Bringing decklist on-site"
                >
                  <DocumentTextIcon class="w-3 h-3" />
                  On-site
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200"
                  title="Decklist pending"
                >
                  <ExclamationTriangleIcon class="w-3 h-3" />
                  Pending
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
  status: "registered" | "reserved";
  registeredAt: string;
  playerName: string;
  hasDecklistSubmitted: boolean;
  isBringingDecklistOnsite: boolean;
}

interface ParticipantsResponse {
  event: {
    id: string;
    name: string;
  };
  participants: Participant[];
}

interface Props {
  eventId: string;
  showDecklistStatus?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showDecklistStatus: false,
});

const participants = ref<Participant[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

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
