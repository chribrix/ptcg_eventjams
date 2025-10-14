<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200">
    <div class="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">
          Registered Participants
        </h3>
        <span class="text-sm text-gray-600">
          {{ participants.length }}
          {{ participants.length === 1 ? "player" : "players" }}
        </span>
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
    <div v-else class="divide-y divide-gray-100">
      <div
        v-for="participant in participants"
        :key="participant.id"
        class="px-4 py-3 hover:bg-gray-50 transition-colors duration-150"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <!-- Player Avatar -->
            <div
              class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium"
            >
              {{ getInitials(participant.playerName) }}
            </div>

            <!-- Player Info -->
            <div>
              <div class="font-medium text-gray-900">
                {{ participant.playerName }}
              </div>
              <div class="text-xs text-gray-500">
                Registered
                {{ formatRegistrationDate(participant.registeredAt) }}
              </div>
            </div>
          </div>

          <!-- Status Indicators -->
          <div class="flex items-center gap-2">
            <!-- Registration Status -->
            <span
              :class="{
                'bg-green-100 text-green-800':
                  participant.status === 'registered',
                'bg-yellow-100 text-yellow-800':
                  participant.status === 'reserved',
              }"
              class="px-2 py-1 text-xs font-medium rounded-full"
            >
              {{
                participant.status === "registered" ? "Confirmed" : "Reserved"
              }}
            </span>

            <!-- Decklist Status (if event requires decklist) -->
            <div v-if="showDecklistStatus" class="text-xs">
              <span
                v-if="participant.hasDecklistSubmitted"
                class="inline-flex items-center gap-1 text-green-600"
                title="Decklist submitted online"
              >
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
                Online
              </span>
              <span
                v-else-if="participant.isBringingDecklistOnsite"
                class="inline-flex items-center gap-1 text-blue-600"
                title="Bringing decklist on-site"
              >
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
                On-site
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 text-gray-400"
                title="Decklist pending"
              >
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
                Pending
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
