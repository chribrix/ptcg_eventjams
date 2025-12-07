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
        <div class="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2 mb-12">
          <div
            v-for="registration in registrations"
            :key="registration.id"
            class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200"
          >
            <!-- Event Header -->
            <div
              class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0 mb-4"
            >
              <div class="flex-1">
                <div class="flex items-center gap-2 flex-wrap mb-2">
                  <h3 class="text-lg sm:text-xl font-semibold text-gray-900">
                    {{ registration.customEvent.name }}
                  </h3>
                  <span
                    v-if="
                      registration.eventType &&
                      registration.eventType !== 'custom'
                    "
                    class="event-type-badge"
                    :class="`type-${registration.eventType}`"
                  >
                    {{ getEventTypeName(registration.eventType) }}
                  </span>
                </div>
              </div>
              <span
                class="px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap self-start"
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

            <!-- Decklist Section -->
            <div
              v-if="registration.customEvent.requiresDecklist"
              class="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div class="flex justify-between items-center mb-3">
                <h4 class="font-semibold text-gray-900 text-sm sm:text-base">
                  Decklist
                </h4>
                <span
                  v-if="registration.decklist"
                  class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full"
                >
                  ✓ Submitted
                </span>
                <span
                  v-else-if="registration.bringingDecklistOnsite"
                  class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                >
                  📋 Bring On-Site
                </span>
                <span
                  v-else
                  class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full"
                >
                  ⚠ Required
                </span>
              </div>

              <!-- Reserved Status Notice -->
              <div
                v-if="
                  registration.status === 'reserved' &&
                  !registration.decklist &&
                  !registration.bringingDecklistOnsite
                "
                class="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <div class="flex items-center gap-2 mb-1">
                  <ExclamationTriangleIcon class="w-4 h-4 text-yellow-600" />
                  <p class="text-sm font-medium text-yellow-800">
                    Registration Reserved
                  </p>
                </div>
                <p class="text-xs text-yellow-700">
                  Your spot is reserved, but you need to complete your decklist
                  submission to confirm your registration.
                </p>
              </div>

              <div v-if="registration.decklist" class="space-y-3">
                <pre
                  class="bg-white border border-gray-200 rounded p-2 sm:p-3 text-xs sm:text-sm font-mono whitespace-pre-wrap max-h-32 overflow-y-auto"
                  >{{ registration.decklist }}</pre
                >
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    @click="
                      openDecklistModal(registration.id, registration.decklist)
                    "
                    class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors duration-200"
                  >
                    ✏️ Edit Decklist
                  </button>
                  <button
                    @click="setBringingOnsite(registration.id)"
                    class="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors duration-200"
                  >
                    📋 Bring On-Site Instead
                  </button>
                  <button
                    @click="confirmDeleteDecklist(registration.id)"
                    class="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors duration-200"
                  >
                    🗑️ Delete Decklist
                  </button>
                </div>
              </div>

              <div
                v-else-if="registration.bringingDecklistOnsite"
                class="text-center py-4 bg-blue-50 border border-blue-200 rounded"
              >
                <div class="flex items-center justify-center gap-2 mb-2">
                  <ClipboardDocumentIcon class="w-5 h-5 text-blue-600" />
                  <p class="text-blue-800 font-medium text-sm sm:text-base">
                    Bringing Decklist On-Site
                  </p>
                </div>
                <p class="text-blue-700 text-xs sm:text-sm mb-3 px-2">
                  Remember to bring your completed decklist in written or
                  printed form to the event.
                </p>
                <button
                  @click="openDecklistModal(registration.id, '')"
                  class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors duration-200"
                >
                  📝 Submit Online Instead
                </button>
              </div>

              <div
                v-else-if="
                  !registration.decklist && !registration.bringingDecklistOnsite
                "
                class="text-center py-4"
              >
                <p class="text-gray-600 mb-4 text-sm sm:text-base">
                  Choose how to submit your decklist:
                </p>
                <div class="space-y-2 sm:space-y-3">
                  <button
                    @click="openDecklistModal(registration.id, '')"
                    class="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200 text-sm sm:text-base"
                  >
                    📝 Submit Decklist Online
                  </button>
                  <button
                    @click="setBringingOnsite(registration.id)"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200 text-sm sm:text-base"
                  >
                    📋 I'll Bring Decklist On-Site
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Event History Section - Always visible -->
      <div class="mt-12">
        <EventHistory :isAdmin="false" />
      </div>
    </div>

    <!-- Full-Screen Decklist Editor Modal -->
    <Teleport to="body">
      <div
        v-if="showDecklistModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4"
        @click="closeDecklistModal"
      >
        <div
          class="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col"
          @click.stop
        >
          <!-- Modal Header -->
          <div
            class="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200"
          >
            <div>
              <h2 class="text-xl sm:text-2xl font-bold text-gray-900">
                Edit Decklist
              </h2>
              <p class="text-sm text-gray-600 mt-1">
                Format your decklist below
              </p>
            </div>
            <button
              @click="closeDecklistModal"
              class="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Close"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Modal Body with Textarea -->
          <div class="flex-1 p-4 sm:p-6 overflow-hidden flex flex-col">
            <textarea
              v-model="modalDecklistText"
              class="w-full h-full border-2 border-gray-300 rounded-lg p-3 sm:p-4 text-sm sm:text-base font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Paste or type your decklist here...\n\nExample format:\n4 Charizard ex PAL 199\n3 Charmander MEW 4\n2 Charmeleon MEW 5\n4 Rare Candy SVI 191\n..."
            ></textarea>
          </div>

          <!-- Modal Footer -->
          <div
            class="flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50"
          >
            <button
              @click="submitDecklistFromModal"
              :disabled="
                isSubmittingDecklist[currentEditingRegistrationId || '']
              "
              class="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 text-sm sm:text-base"
            >
              {{
                isSubmittingDecklist[currentEditingRegistrationId || ""]
                  ? "💾 Saving..."
                  : "✅ Save Decklist"
              }}
            </button>
            <button
              @click="closeDecklistModal"
              class="flex-1 sm:flex-initial bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 text-sm sm:text-base"
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Decklist Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="showDeleteModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
        @click="closeDeleteModal"
      >
        <div
          class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          @click.stop
        >
          <div class="mb-6">
            <div class="flex items-center gap-3 mb-3">
              <div
                class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"
              >
                <svg
                  class="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900">Delete Decklist?</h3>
            </div>
            <p class="text-gray-600 mb-3">
              Are you sure you want to delete your submitted decklist for
              <span class="font-semibold text-gray-900">{{
                registrationToDelete?.customEvent.name
              }}</span
              >?
            </p>
            <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p class="text-sm text-amber-800">
                ⚠️ <strong>Warning:</strong> This will set your registration
                back to <strong>reserved status</strong>. You'll need to submit
                a new decklist to confirm your registration.
              </p>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3">
            <button
              @click="deleteDecklist"
              :disabled="isDeletingDecklist"
              class="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {{
                isDeletingDecklist
                  ? "🗑️ Deleting..."
                  : "🗑️ Yes, Delete Decklist"
              }}
            </button>
            <button
              @click="closeDeleteModal"
              :disabled="isDeletingDecklist"
              class="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Teleport>
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

// Decklist editing state
const isEditingDecklist = ref<Record<string, boolean>>({});
const decklistText = ref<Record<string, string>>({});
const isSubmittingDecklist = ref<Record<string, boolean>>({});

// Modal state for decklist editor
const showDecklistModal = ref(false);
const currentEditingRegistrationId = ref<string | null>(null);
const modalDecklistText = ref("");

// Modal state for delete confirmation
const showDeleteModal = ref(false);
const registrationToDelete = ref<EventRegistration | null>(null);
const isDeletingDecklist = ref(false);

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

const startEditDecklist = (registrationId: string, currentDecklist: string) => {
  isEditingDecklist.value[registrationId] = true;
  decklistText.value[registrationId] = currentDecklist;
};

const cancelEditDecklist = (registrationId: string) => {
  isEditingDecklist.value[registrationId] = false;
  delete decklistText.value[registrationId];
};

// Modal functions
const openDecklistModal = (registrationId: string, currentDecklist: string) => {
  currentEditingRegistrationId.value = registrationId;
  modalDecklistText.value = currentDecklist;
  showDecklistModal.value = true;
};

const closeDecklistModal = () => {
  showDecklistModal.value = false;
  currentEditingRegistrationId.value = null;
  modalDecklistText.value = "";
};

const submitDecklistFromModal = async () => {
  if (!currentEditingRegistrationId.value) return;

  const registrationId = currentEditingRegistrationId.value;

  try {
    isSubmittingDecklist.value[registrationId] = true;

    const { error: submitError } = await $fetch("/api/dashboard/decklist", {
      method: "PUT",
      body: {
        registrationId,
        decklist: modalDecklistText.value,
      },
    });

    if (submitError) {
      throw new Error(submitError);
    }

    // Update local state
    const registration = registrations.value.find(
      (r) => r.id === registrationId
    );
    if (registration) {
      registration.decklist = modalDecklistText.value;
      registration.status = "registered";
    }

    // Close modal
    closeDecklistModal();
  } catch (err) {
    console.error("Failed to submit decklist:", err);
    error.value =
      err instanceof Error ? err.message : "Failed to submit decklist";
  } finally {
    isSubmittingDecklist.value[registrationId] = false;
  }
};

const submitDecklist = async (registrationId: string) => {
  try {
    isSubmittingDecklist.value[registrationId] = true;

    const { error: submitError } = await $fetch("/api/dashboard/decklist", {
      method: "PUT",
      body: {
        registrationId,
        decklist: decklistText.value[registrationId],
      },
    });

    if (submitError) {
      throw new Error(submitError);
    }

    // Update local state
    const registration = registrations.value.find(
      (r) => r.id === registrationId
    );
    if (registration) {
      registration.decklist = decklistText.value[registrationId];
      registration.status = "registered"; // Update status when decklist is submitted
    }

    // Exit edit mode
    isEditingDecklist.value[registrationId] = false;
    delete decklistText.value[registrationId];
  } catch (err) {
    console.error("Failed to submit decklist:", err);
    error.value =
      err instanceof Error ? err.message : "Failed to submit decklist";
  } finally {
    isSubmittingDecklist.value[registrationId] = false;
  }
};

const setBringingOnsite = async (registrationId: string) => {
  try {
    const { error: submitError } = await $fetch("/api/dashboard/decklist", {
      method: "PUT",
      body: {
        registrationId,
        bringingDecklistOnsite: true,
      },
    });

    if (submitError) {
      throw new Error(submitError);
    }

    // Update local state
    const registration = registrations.value.find(
      (r) => r.id === registrationId
    );
    if (registration) {
      registration.bringingDecklistOnsite = true;
      registration.decklist = null; // Clear any existing decklist
      registration.status = "registered"; // Update status when onsite option is chosen
    }
  } catch (err) {
    console.error("Failed to set bringing onsite:", err);
    error.value =
      err instanceof Error ? err.message : "Failed to update decklist option";
  }
};

const confirmDeleteDecklist = (registrationId: string) => {
  const registration = registrations.value.find((r) => r.id === registrationId);
  if (registration) {
    registrationToDelete.value = registration;
    showDeleteModal.value = true;
  }
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  registrationToDelete.value = null;
};

const deleteDecklist = async () => {
  if (!registrationToDelete.value) return;

  const registrationId = registrationToDelete.value.id;

  try {
    isDeletingDecklist.value = true;
    const { error: submitError } = await $fetch("/api/dashboard/decklist", {
      method: "PUT",
      body: {
        registrationId,
        decklist: null,
        bringingDecklistOnsite: false,
      },
    });

    if (submitError) {
      throw new Error(submitError);
    }

    // Update local state
    const registration = registrations.value.find(
      (r) => r.id === registrationId
    );
    if (registration) {
      registration.decklist = null;
      registration.bringingDecklistOnsite = false;
      registration.status = "reserved"; // Back to reserved status
    }

    // Close modal
    closeDeleteModal();
  } catch (err) {
    console.error("Failed to delete decklist:", err);
    error.value =
      err instanceof Error ? err.message : "Failed to delete decklist";
  } finally {
    isDeletingDecklist.value = false;
  }
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
