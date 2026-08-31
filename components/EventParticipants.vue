<template>
  <div
    :class="
      compact
        ? ''
        : 'app-panel rounded-2xl overflow-hidden'
    "
  >
    <!-- Header (only in non-compact mode) -->
    <div
      v-if="!compact"
      class="border-b app-border app-surface-1 px-6 py-4"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center app-surface-2"
          >
            <UsersIcon class="w-5 h-5 app-icon-accent" />
          </div>
          <div>
            <h3 class="app-heading-2">{{ t("participants.title") }}</h3>
            <p class="app-meta-text">
              {{ t("participants.countLabel", { count: participants.length }) }}
            </p>
          </div>
        </div>
        <button
          @click="refreshParticipants"
          class="app-btn-neutral p-2 rounded-lg"
          :title="t('participants.refreshTooltip')"
        >
          <ArrowPathIcon class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" :class="compact ? 'p-2' : 'p-4'">
      <div class="flex items-center gap-2 app-text-secondary-soft">
        <div
          class="w-4 h-4 border-2 app-border border-t-[var(--app-accent)] rounded-full animate-spin"
        ></div>
        <span>{{ t("participants.loading") }}</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" :class="compact ? 'p-2' : 'p-4'">
      <div class="app-feedback-danger rounded-lg p-3 text-sm">
        {{ t("participants.errorLoading", { error }) }}
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="
        participants.length === 0 && cancelledParticipants.length === 0
      "
      :class="
        compact
          ? 'p-2 text-center app-text-muted-soft'
          : 'p-4 text-center app-text-muted-soft'
      "
    >
      <p>{{ t("participants.empty") }}</p>
    </div>

    <!-- Participants List -->
    <div v-else :class="compact ? '' : 'p-5'">
      <!-- Active Participants -->
      <div v-if="participants.length > 0" :class="compact ? 'grid gap-2' : 'divide-y app-border'">
        <div
          v-for="participant in participants"
          :key="participant.id"
          :class="
            compact
              ? 'group app-surface-1 rounded-lg border app-border p-3 transition-colors duration-200 hover:border-[var(--app-accent)]'
              : 'group py-3 first:pt-0 last:pb-0'
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
                    class="app-icon-muted flex-shrink-0"
                  />
                  <p
                    :class="[
                      compact ? 'font-medium' : 'app-heading-3',
                      participant.isAnonymous ? 'app-text-muted-soft' : '',
                    ]"
                  >
                    {{ participant.playerName }}
                  </p>
                </div>
                <div
                  v-if="!compact && !participant.isAnonymous"
                  class="flex items-center space-x-2 mt-1"
                >
                  <ClockIcon class="w-3 h-3 app-icon-muted flex-shrink-0" />
                  <p class="app-meta-text">
                    {{ t("participants.registeredOn", { date: formatRegistrationDate(participant.registeredAt) }) }}
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
                class="app-badge"
              >
                <div
                  :class="getParticipantStatusDotClass(participant)"
                  class="w-2 h-2 rounded-full"
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
          <div class="h-px flex-1 app-border border-t"></div>
          <h4
            class="text-xs font-semibold app-text-muted-soft uppercase tracking-wide"
          >
            {{ t("participants.cancelledSectionTitle") }}
          </h4>
          <div class="h-px flex-1 app-border border-t"></div>
        </div>
        <div class="grid gap-3">
          <div
            v-for="participant in cancelledParticipants"
            :key="participant.id"
            :class="
              compact
                ? 'group app-surface-1 rounded-lg border app-border p-3 opacity-60'
                : 'group app-surface-1 rounded-xl border app-border p-4 opacity-60'
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
                      class="app-icon-muted flex-shrink-0"
                    />
                    <p
                      :class="
                        compact
                          ? 'font-medium app-text-muted-soft truncate line-through'
                          : 'app-heading-3 app-text-muted-soft truncate line-through'
                      "
                    >
                      {{ participant.playerName }}
                    </p>
                  </div>
                  <div v-if="!compact" class="flex items-center space-x-2 mt-1">
                    <ClockIcon class="w-3 h-3 app-icon-muted flex-shrink-0" />
                    <p class="app-meta-text">
                      {{ t("participants.registeredOn", { date: formatRegistrationDate(participant.registeredAt) }) }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Cancelled Badge -->
              <div class="flex items-center flex-shrink-0">
                <span
                  class="app-badge app-status-cancelled"
                >
                  {{ t("participants.cancelledBadge") }}
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
const { t, locale } = useI18n();

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
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffInDays === 0) {
    return t("participants.today");
  } else if (diffInDays === 1) {
    return t("participants.yesterday");
  } else if (diffInDays < 7) {
    return t("participants.daysAgo", { count: diffInDays });
  } else {
    return date.toLocaleDateString(locale.value.startsWith("de") ? "de-DE" : "en-US", {
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
      `/api/events/${props.eventId}/participants`,
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
    return participant.status === "registered"
      ? t("participants.statusRegistered")
      : t("participants.statusReserved");
  }

  // If event requires decklist, check decklist submission regardless of registration status
  if (
    participant.hasDecklistSubmitted ||
    participant.isBringingDecklistOnsite
  ) {
    return t("participants.statusRegistered");
  }

  // If event requires decklist but user hasn't submitted it
  return t("participants.statusNoDeckSubmitted");
}

function getParticipantStatusBadgeClass(participant: Participant): string {
  // If event doesn't require decklist, just show registration status
  if (!props.showDecklistStatus) {
    return participant.status === "registered"
      ? "app-status-completed"
      : "app-status-ongoing";
  }

  // If event requires decklist, check decklist submission regardless of registration status
  if (
    participant.hasDecklistSubmitted ||
    participant.isBringingDecklistOnsite
  ) {
    return "app-status-completed";
  }

  // If event requires decklist but user hasn't submitted it
  return "app-status-ongoing";
}

function getParticipantStatusDotClass(participant: Participant): string {
  // If event doesn't require decklist, just show registration status
  if (!props.showDecklistStatus) {
    return participant.status === "registered"
      ? "bg-[var(--app-button-green)]"
      : "bg-[var(--app-button-amber)]";
  }

  // If event requires decklist, check decklist submission regardless of registration status
  if (
    participant.hasDecklistSubmitted ||
    participant.isBringingDecklistOnsite
  ) {
    return "bg-[var(--app-button-green)]";
  }

  // If event requires decklist but user hasn't submitted it
  return "bg-[var(--app-button-amber)]";
}

function getRegistrationBadgeClass(status: string): string {
  return status === "registered" ? "app-status-completed" : "app-status-ongoing";
}

function getStatusDotClass(status: string): string {
  return status === "registered"
    ? "bg-[var(--app-button-green)]"
    : "bg-[var(--app-button-amber)]";
}

function getStatusIndicatorClass(status: string): string {
  return status === "registered"
    ? "bg-[var(--app-button-green)] shadow-[var(--app-button-green)]/50"
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
