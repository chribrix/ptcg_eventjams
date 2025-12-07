<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="flex items-center gap-2 p-4 text-gray-600 bg-white rounded-lg shadow"
      >
        <div
          class="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"
        ></div>
        <span>Loading event details...</span>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-50 border border-red-200 rounded-lg p-4"
      >
        <div class="text-red-600">Failed to load event: {{ error }}</div>
      </div>

      <!-- Event Details -->
      <div v-else-if="event" class="space-y-6">
        <!-- Event Header -->
        <div
          class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
        >
          <div
            class="px-6 py-8 bg-gradient-to-r from-blue-600 to-blue-700 text-white"
          >
            <h1 class="text-3xl font-bold mb-2">{{ event.name }}</h1>
            <div class="flex flex-wrap gap-4 text-blue-100">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
                {{ formatEventDate(event.eventDate) }}
              </div>
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
                {{ event.venue }}
              </div>
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"
                  ></path>
                </svg>
                {{ registrationCount }} / {{ event.maxParticipants }} registered
              </div>
            </div>
          </div>

          <!-- Event Info -->
          <div class="px-6 py-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-if="event.participationFee"
                class="flex items-center gap-2 text-gray-700"
              >
                <span class="font-medium">Entry Fee:</span>
                <span>{{ event.participationFee }}</span>
              </div>
              <div
                v-if="event.registrationDeadline"
                class="flex items-center gap-2 text-gray-700"
              >
                <span class="font-medium">Registration Deadline:</span>
                <span>{{ formatEventDate(event.registrationDeadline) }}</span>
              </div>
              <div class="flex items-center gap-2 text-gray-700">
                <span class="font-medium">Decklist Required:</span>
                <span
                  :class="
                    event.requiresDecklist ? 'text-orange-600' : 'text-gray-500'
                  "
                >
                  {{ event.requiresDecklist ? "Yes" : "No" }}
                </span>
              </div>
              <div class="flex items-center gap-2 text-gray-700">
                <span class="font-medium">Status:</span>
                <span :class="getStatusColor(event.status)">
                  {{ event.status }}
                </span>
              </div>
            </div>

            <div
              v-if="event.description"
              class="mt-4 pt-4 border-t border-gray-200"
            >
              <h3 class="font-medium text-gray-900 mb-2">Description</h3>
              <p class="text-gray-700 whitespace-pre-wrap">
                {{ event.description }}
              </p>
            </div>
          </div>
        </div>

        <!-- Registration Section -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div v-if="user" class="space-y-4">
            <h2 class="text-xl font-semibold text-gray-900">Registration</h2>

            <!-- User Registration Status -->
            <div v-if="userRegistration" class="space-y-4">
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-3">
                  <div>
                    <div class="font-medium text-blue-900">
                      You are registered for this event
                    </div>
                    <div class="text-sm text-blue-700">
                      Status:
                      {{
                        userRegistration.status === "registered"
                          ? "Confirmed"
                          : userRegistration.status === "reserved"
                          ? "Reserved (Pending Decklist)"
                          : userRegistration.status
                      }}
                    </div>
                  </div>
                </div>

                <!-- Decklist Section (if event requires it) -->
                <div
                  v-if="event.requiresDecklist"
                  class="mt-4 pt-4 border-t border-blue-200"
                >
                  <h4 class="font-medium text-blue-900 mb-2">
                    Decklist Status
                  </h4>

                  <!-- Decklist Submitted -->
                  <div
                    v-if="userRegistration.decklist"
                    class="bg-white rounded p-3 mb-3"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-sm font-medium text-gray-700"
                        >Your Decklist:</span
                      >
                      <span
                        class="text-xs text-green-600 bg-green-50 px-2 py-1 rounded"
                        >✓ Submitted</span
                      >
                    </div>
                    <pre
                      class="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded max-h-32 overflow-y-auto"
                      >{{ userRegistration.decklist }}</pre
                    >
                  </div>

                  <!-- Bringing Onsite -->
                  <div
                    v-else-if="userRegistration.bringingDecklistOnsite"
                    class="bg-amber-50 border border-amber-200 rounded p-3 mb-3"
                  >
                    <div class="flex items-center gap-2 text-amber-800">
                      <svg
                        class="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clip-rule="evenodd"
                        ></path>
                      </svg>
                      <span class="text-sm font-medium"
                        >Bringing decklist on-site</span
                      >
                    </div>
                  </div>

                  <!-- Pending Decklist -->
                  <div
                    v-else
                    class="bg-amber-50 border border-amber-200 rounded p-3 mb-3"
                  >
                    <div class="text-amber-800 text-sm mb-2">
                      ⚠️ Decklist required - Your registration is reserved until
                      you submit a decklist
                    </div>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex gap-3 mt-4">
                  <NuxtLink
                    to="/dashboard"
                    class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center font-medium"
                  >
                    {{
                      event.requiresDecklist &&
                      !userRegistration.decklist &&
                      !userRegistration.bringingDecklistOnsite
                        ? "Submit Decklist"
                        : "Edit Registration"
                    }}
                  </NuxtLink>
                  <button
                    @click="cancelRegistration"
                    :disabled="isCancelling"
                    class="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ isCancelling ? "Cancelling..." : "Cancel Registration" }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Register Button -->
            <div v-else class="flex justify-center">
              <NuxtLink
                :to="`/events/register/${event.id}`"
                class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                :class="{
                  'opacity-50 cursor-not-allowed':
                    registrationCount >= event.maxParticipants,
                }"
              >
                <span v-if="registrationCount >= event.maxParticipants"
                  >Event Full</span
                >
                <span v-else>Register for Event</span>
              </NuxtLink>
            </div>
          </div>

          <!-- Login Required -->
          <div v-else class="text-center">
            <p class="text-gray-600 mb-4">
              Please log in to register for this event.
            </p>
            <NuxtLink
              to="/login"
              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Log In
            </NuxtLink>
          </div>
        </div>

        <!-- Participants List -->
        <EventParticipants
          :event-id="event.id"
          :show-decklist-status="event.requiresDecklist"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface CustomEvent {
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
}

interface EventResponse {
  event: CustomEvent;
  registrationCount: number;
}

interface UserRegistration {
  id: string;
  status: string;
  decklist?: string | null;
  bringingDecklistOnsite?: boolean;
}

const { id } = useRoute().params;
const supabase = useSupabaseClient();
const user = useSupabaseUser();

const event = ref<CustomEvent | null>(null);
const registrationCount = ref(0);
const userRegistration = ref<UserRegistration | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isCancelling = ref(false);

function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "upcoming":
      return "text-green-600";
    case "ongoing":
      return "text-blue-600";
    case "completed":
      return "text-gray-600";
    case "cancelled":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}

async function fetchEventDetails(): Promise<void> {
  if (!id || Array.isArray(id)) return;

  try {
    isLoading.value = true;
    error.value = null;

    const response = await $fetch<EventResponse>(`/api/events/${id}`);
    event.value = response.event;
    registrationCount.value = response.registrationCount;
  } catch (err: unknown) {
    console.error("Failed to fetch event details:", err);
    error.value = err instanceof Error ? err.message : "Failed to load event";
  } finally {
    isLoading.value = false;
  }
}

async function fetchUserRegistration(): Promise<void> {
  if (!id || Array.isArray(id) || !user.value) return;

  try {
    const { data } = await $fetch<{ data: any[] }>(
      "/api/dashboard/registrations"
    );
    // Check both customEventId and externalEventId, and also check the nested customEvent.id
    const registration = data?.find(
      (r) =>
        r.customEventId === id ||
        r.externalEventId === id ||
        r.customEvent?.id === id
    );
    userRegistration.value = registration
      ? {
          id: registration.id,
          status: registration.status,
          decklist: registration.decklist,
          bringingDecklistOnsite: registration.bringingDecklistOnsite,
        }
      : null;
  } catch (err: unknown) {
    console.error("Failed to fetch user registration:", err);
    // Don't show error for this, as it's not critical
  }
}

async function cancelRegistration(): Promise<void> {
  if (!userRegistration.value || isCancelling.value) return;

  if (
    !confirm(
      "Are you sure you want to cancel your registration for this event?"
    )
  ) {
    return;
  }

  try {
    isCancelling.value = true;

    await $fetch(`/api/events/${id}/cancel`, {
      method: "POST",
      body: { registrationId: userRegistration.value.id },
    });

    // Refresh data
    await fetchUserRegistration();
    await fetchEventDetails();

    alert("Registration cancelled successfully");
  } catch (err: unknown) {
    console.error("Failed to cancel registration:", err);
    alert("Failed to cancel registration. Please try again.");
  } finally {
    isCancelling.value = false;
  }
}

// Fetch event details on mount
onMounted(async () => {
  await fetchEventDetails();
  if (user.value) {
    await fetchUserRegistration();
  }
});

// Watch for user login/logout
watch(user, async (newUser) => {
  if (newUser) {
    await fetchUserRegistration();
  } else {
    userRegistration.value = null;
  }
});
</script>
