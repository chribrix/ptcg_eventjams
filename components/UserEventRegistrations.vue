<template>
  <div class="w-full">
    <h2 class="text-2xl font-bold text-gray-800 mb-4 text-center">
      My Event Registrations
    </h2>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center gap-2 p-4 text-gray-600">
      <div
        class="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"
      ></div>
      <span>Loading your registrations...</span>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="registrations.length === 0"
      class="p-4 text-center text-gray-600"
    >
      <p class="mb-3">No event registrations yet.</p>
      <NuxtLink
        to="/events"
        class="text-blue-600 hover:text-blue-800 font-medium hover:underline"
      >
        Browse Events
      </NuxtLink>
    </div>

    <!-- Registrations List -->
    <div v-else class="space-y-3">
      <div
        v-for="registration in registrations"
        :key="registration.id"
        class="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200"
      >
        <div class="flex justify-between items-center mb-2">
          <div class="flex items-center gap-2">
            <h4 class="text-sm font-semibold text-gray-900">
              {{ registration.customEvent.name }}
            </h4>
            <span
              v-if="registration.status === 'reserved'"
              class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full"
            >
              Reserved
            </span>
          </div>
          <span class="text-xs text-gray-500">
            {{ formatEventDate(registration.customEvent.eventDate) }}
          </span>
        </div>

        <!-- Decklist Alert -->
        <div
          v-if="
            registration.customEvent.requiresDecklist &&
            !registration.decklist &&
            !registration.bringingDecklistOnsite
          "
          class="bg-yellow-50 border border-yellow-300 rounded px-3 py-2 text-xs"
        >
          <div class="flex justify-between items-start mb-1">
            <span class="font-medium text-yellow-800"
              >⚠️ Registration Reserved</span
            >
            <NuxtLink
              to="/dashboard"
              class="text-yellow-600 hover:text-yellow-800 font-medium hover:underline"
            >
              Complete Now
            </NuxtLink>
          </div>
          <p class="text-yellow-700">
            Complete your decklist submission to confirm your spot
          </p>
        </div>

        <div
          v-else-if="
            registration.customEvent.requiresDecklist && registration.decklist
          "
          class="flex items-center bg-green-50 border border-green-300 rounded px-3 py-2 text-xs text-green-800"
        >
          ✓ Decklist submitted
        </div>

        <div
          v-else-if="
            registration.customEvent.requiresDecklist &&
            registration.bringingDecklistOnsite
          "
          class="flex items-center bg-blue-50 border border-blue-300 rounded px-3 py-2 text-xs text-blue-800"
        >
          <span>📋 Bring decklist on-site</span>
        </div>

        <!-- Event Actions -->
        <div class="mt-3 flex justify-between items-center">
          <!-- View Participants Button -->
          <button
            @click="toggleParticipants(registration.customEventId)"
            class="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-300 rounded hover:bg-blue-50 hover:border-blue-400 transition-colors duration-200"
          >
            <span v-if="expandedParticipants[registration.customEventId]">
              Hide Participants
            </span>
            <span v-else> View Other Participants </span>
          </button>

          <!-- Cancel Registration Button -->
          <button
            v-if="canCancelRegistration(registration)"
            @click="confirmCancellation(registration)"
            :disabled="cancelling === registration.id"
            class="px-3 py-1 text-xs font-medium text-red-600 border border-red-300 rounded hover:bg-red-50 hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <span v-if="cancelling === registration.id">Cancelling...</span>
            <span v-else>Cancel Registration</span>
          </button>
          <span
            v-else-if="!canCancelRegistration(registration)"
            class="text-xs text-gray-500 italic"
          >
            {{ getCancellationMessage(registration) }}
          </span>
        </div>

        <!-- Expandable Participants List -->
        <div
          v-if="expandedParticipants[registration.customEventId]"
          class="mt-3 pt-3 border-t border-gray-200"
        >
          <EventParticipants
            :event-id="registration.customEventId"
            :show-decklist-status="registration.customEvent.requiresDecklist"
          />
        </div>
      </div>

      <NuxtLink
        to="/dashboard"
        class="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors duration-200"
      >
        View Full Dashboard
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
interface EventRegistration {
  id: string;
  customEventId: string;
  playerId: string;
  registeredAt: string;
  status: string;
  notes?: string | null;
  decklist?: string | null;
  bringingDecklistOnsite?: boolean | null;
  customEvent: {
    id: string;
    name: string;
    venue: string;
    eventDate: string;
    maxParticipants: number;
    participationFee?: string | null;
    description?: string | null;
    registrationDeadline?: string | null;
    requiresDecklist: boolean;
    status: string;
  };
}

const CANCELLATION_DEADLINE_HOURS = 24;

const registrations = ref<EventRegistration[]>([]);
const isLoading = ref(false);
const cancelling = ref<string | null>(null);
const expandedParticipants = ref<Record<string, boolean>>({});
const supabase = useSupabaseClient();

function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function toggleParticipants(eventId: string): void {
  expandedParticipants.value[eventId] = !expandedParticipants.value[eventId];
}

async function fetchUserRegistrations(): Promise<void> {
  try {
    isLoading.value = true;
    const { data } = await $fetch<{ data: EventRegistration[] }>(
      "/api/dashboard/registrations"
    );
    registrations.value = data || [];
  } catch (error) {
    console.error("Failed to fetch user registrations:", error);
    registrations.value = [];
  } finally {
    isLoading.value = false;
  }
}

function canCancelRegistration(registration: EventRegistration): boolean {
  const eventDate = new Date(registration.customEvent.eventDate);
  const now = new Date();
  const cancellationDeadline = new Date(
    eventDate.getTime() - CANCELLATION_DEADLINE_HOURS * 60 * 60 * 1000
  );

  return (
    eventDate > now &&
    now <= cancellationDeadline &&
    registration.status !== "cancelled"
  );
}

function getCancellationMessage(registration: EventRegistration): string {
  const eventDate = new Date(registration.customEvent.eventDate);
  const now = new Date();

  if (eventDate < now) {
    return "Event has already started";
  }

  const cancellationDeadline = new Date(
    eventDate.getTime() - CANCELLATION_DEADLINE_HOURS * 60 * 60 * 1000
  );
  if (now > cancellationDeadline) {
    return "Cancellation deadline passed (24h before event)";
  }

  if (registration.status === "cancelled") {
    return "Registration cancelled";
  }

  return "";
}

async function confirmCancellation(
  registration: EventRegistration
): Promise<void> {
  const confirmed = confirm(
    `Are you sure you want to cancel your registration for "${registration.customEvent.name}"?\n\n` +
      `Event Date: ${formatEventDate(registration.customEvent.eventDate)}\n\n` +
      "This action cannot be undone."
  );

  if (!confirmed) return;

  try {
    cancelling.value = registration.id;

    await $fetch(
      `/api/dashboard/registrations/${registration.id}/cancel` as string,
      {
        method: "POST" as const,
      }
    );

    registrations.value = registrations.value.filter(
      (r) => r.id !== registration.id
    );

    alert(
      `Successfully cancelled your registration for "${registration.customEvent.name}"`
    );
  } catch (error: unknown) {
    console.error("Failed to cancel registration:", error);

    const errorMessage =
      error &&
      typeof error === "object" &&
      "data" in error &&
      error.data &&
      typeof error.data === "object" &&
      "message" in error.data
        ? String(error.data.message)
        : error instanceof Error
        ? error.message
        : "Failed to cancel registration";
    alert(`Error: ${errorMessage}`);
  } finally {
    cancelling.value = null;
  }
}

onMounted(async () => {
  const { data: session } = await supabase.auth.getSession();
  if (session?.session) {
    await fetchUserRegistrations();
  }
});
</script>
