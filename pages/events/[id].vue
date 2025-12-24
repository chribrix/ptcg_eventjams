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
            class="px-4 sm:px-6 py-6 sm:py-8 bg-gradient-to-r from-blue-600 to-blue-700 text-white"
          >
            <h1 class="text-2xl sm:text-3xl font-bold mb-2 break-words">
              {{ event.name }}
            </h1>
            <div
              class="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 text-blue-100"
            >
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
          <div class="px-4 sm:px-6 py-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div
                v-if="event.participationFee"
                class="flex items-center gap-2 text-gray-700 text-sm sm:text-base"
              >
                <span class="font-medium">Entry Fee:</span>
                <span>{{ event.participationFee }}</span>
              </div>
              <div
                v-if="event.registrationDeadline"
                class="flex items-center gap-2 text-gray-700 text-sm sm:text-base"
              >
                <span class="font-medium">Registration Deadline:</span>
                <span class="break-words">{{
                  formatEventDate(event.registrationDeadline)
                }}</span>
              </div>
              <div
                class="flex items-center gap-2 text-gray-700 text-sm sm:text-base"
              >
                <span class="font-medium">Decklist Required:</span>
                <span
                  :class="
                    event.requiresDecklist ? 'text-orange-600' : 'text-gray-500'
                  "
                >
                  {{ event.requiresDecklist ? "Yes" : "No" }}
                </span>
              </div>
              <div
                class="flex items-center gap-2 text-gray-700 text-sm sm:text-base"
              >
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
              <h3 class="font-medium text-gray-900 mb-2 text-sm sm:text-base">
                Description
              </h3>
              <p
                class="text-gray-700 whitespace-pre-wrap text-sm sm:text-base break-words"
              >
                {{ event.description }}
              </p>
            </div>
          </div>
        </div>

        <!-- Registration Section -->
        <div
          class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6"
        >
          <div v-if="user" class="space-y-4">
            <h2 class="text-lg sm:text-xl font-semibold text-gray-900">
              Registration
            </h2>

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
                    v-if="userRegistration.decklist && userRegistration.decklist !== 'has_decklist'"
                    class="bg-white rounded p-3 mb-3"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-sm font-medium text-gray-700"
                        >Your Decklist:</span
                      >
                      <div class="flex gap-2">
                        <button
                          @click="showEditDecklistModal = true"
                          class="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                        >
                          ✎ Edit
                        </button>
                        <span
                          class="text-xs text-green-600 bg-green-50 px-2 py-1 rounded"
                          >✓ Submitted</span
                        >
                      </div>
                    </div>
                    <pre
                      class="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded max-h-32 overflow-y-auto"
                      >{{ userRegistration.decklist }}</pre
                    >
                  </div>

                  <!-- Bringing Onsite -->
                  <div
                    v-else-if="userRegistration.bringingDecklistOnsite"
                    class="bg-green-50 border border-green-200 rounded p-3 mb-3"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2 text-green-800">
                        <svg
                          class="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clip-rule="evenodd"
                          ></path>
                        </svg>
                        <span class="text-sm font-medium"
                          >Bringing decklist on-site</span
                        >
                      </div>
                      <button
                        @click="showEditDecklistModal = true"
                        class="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                      >
                        ✎ Change
                      </button>
                    </div>
                  </div>

                  <!-- Pending Decklist -->
                  <div
                    v-else
                    class="bg-amber-50 border border-amber-200 rounded p-3 mb-3"
                  >
                    <div class="text-amber-800 text-sm mb-3">
                      ⚠️ Decklist required - Your registration is reserved until
                      you submit a decklist
                    </div>
                    <button
                      @click="showEditDecklistModal = true"
                      class="text-sm text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded font-medium"
                    >
                      Submit Decklist Now
                    </button>
                    <button
                      @click="showEditDecklistModal = true"
                      class="text-sm text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded font-medium"
                    >
                      Submit Decklist Now
                    </button>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex flex-col sm:flex-row gap-3 mt-4">
                  <NuxtLink
                    :to="`/booking/${userRegistration.id}`"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center font-medium text-sm sm:text-base"
                  >
                    {{
                      event.requiresDecklist &&
                      !userRegistration.decklist &&
                      !userRegistration.bringingDecklistOnsite
                        ? "Submit Decklist"
                        : "Edit Registration"
                    }}
                  </NuxtLink>
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

    <!-- Edit Decklist Modal -->
    <div
      v-if="showEditDecklistModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      @click="showEditDecklistModal = false"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <div class="p-6">
          <h3 class="text-xl font-bold text-gray-900 mb-4">
            Submit/Edit Decklist
          </h3>

          <div class="space-y-4">
            <!-- Bringing Onsite Checkbox -->
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded">
              <input
                v-model="editDecklistForm.bringingOnsite"
                type="checkbox"
                id="bringingOnsite"
                class="w-4 h-4 text-blue-600"
              />
              <label for="bringingOnsite" class="text-sm font-medium text-gray-700">
                I will bring my decklist on-site
              </label>
            </div>

            <!-- Decklist Textarea (hidden if bringing onsite) -->
            <div v-if="!editDecklistForm.bringingOnsite">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Decklist
              </label>
              <textarea
                v-model="editDecklistForm.decklist"
                rows="12"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="Paste your decklist here..."
              ></textarea>
              <p class="text-xs text-gray-500 mt-1">
                Paste your decklist in PTCGL or LimitlessTCG format
              </p>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button
              @click="showEditDecklistModal = false"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              @click="saveDecklist"
              :disabled="isSavingDecklist || (!editDecklistForm.bringingOnsite && !editDecklistForm.decklist)"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {{ isSavingDecklist ? "Saving..." : "Save Decklist" }}
            </button>
          </div>
        </div>
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
  ticketId?: string; // First ticket ID for single-ticket registrations
}

const { id } = useRoute().params;
const supabase = useSupabaseClient();
const user = useSupabaseUser();

const event = ref<CustomEvent | null>(null);
const registrationCount = ref(0);
const userRegistration = ref<UserRegistration | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const showEditDecklistModal = ref(false);
const editDecklistForm = ref({
  decklist: "",
  bringingOnsite: false,
});
const isSavingDecklist = ref(false);

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
          decklist: registration.tickets?.[0]?.decklist || registration.decklist,
          bringingDecklistOnsite: registration.tickets?.[0]?.bringingDecklistOnsite || registration.bringingDecklistOnsite,
          ticketId: registration.tickets?.[0]?.id, // Store first ticket ID
        }
      : null;
  } catch (err: unknown) {
    console.error("Failed to fetch user registration:", err);
    // Don't show error for this, as it's not critical
  }
}

function openEditDecklistModal(): void {
  if (!userRegistration.value) return;
  
  editDecklistForm.value = {
    decklist: userRegistration.value.decklist === 'has_decklist' ? '' : (userRegistration.value.decklist || ""),
    bringingOnsite: userRegistration.value.bringingDecklistOnsite || false,
  };
  showEditDecklistModal.value = true;
}

async function saveDecklist(): Promise<void> {
  if (!userRegistration.value || isSavingDecklist.value) return;
if (!userRegistration.value.ticketId) {
    alert("Ticket ID not found. Please refresh the page.");
    return;
  }

  try {
    isSavingDecklist.value = true;

    await $fetch(`/api/dashboard/decklist`, {
      method: "PUT",
      body: {
        registrationId: userRegistration.value.id,
        ticketId: userRegistration.value.ticketId,
        decklist: editDecklistForm.value.bringingOnsite
          ? null
          : editDecklistForm.value.decklist,
        bringingDecklistOnsite: editDecklistForm.value.bringingOnsite,
      },
    });

    // Refresh registration data
    await fetchUserRegistration();
    showEditDecklistModal.value = false;
  } catch (err: unknown) {
    console.error("Failed to save decklist:", err);
    alert("Failed to save decklist. Please try again.");
  } finally {
    isSavingDecklist.value = false;
  }
}

async function cancelRegistration(): Promise<void> {
  if (!userRegistration.value || isCancelling.value) return;

  try {
    isCancelling.value = true;

    await $fetch(
      `/api/dashboard/registrations/${userRegistration.value.id}/cancel`,
      {
        method: "POST",
      }
    );

    // Refresh data
    await fetchUserRegistration();
    await fetchEventDetails();

    cancelSuccess.value = true;
  } catch (err: unknown) {
    console.error("Failed to cancel registration:", err);
    cancelSuccess.value = false;
    alert("Failed to cancel registration. Please try again.");
  } finally {
    isCancelling.value = false;
    showCancelModal.value = false;
  }
}

function openCancelModal(): void {
  showCancelModal.value = true;
  cancelSuccess.value = false;
}

function closeCancelModal(): void {
  showCancelModal.value = false;
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
