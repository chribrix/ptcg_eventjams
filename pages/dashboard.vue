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
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <div
            v-for="registration in registrations"
            :key="registration.id"
            class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <!-- Event Header -->
            <div class="flex justify-between items-start mb-4">
              <h3 class="text-xl font-semibold text-gray-900">
                {{ registration.customEvent.name }}
              </h3>
              <span
                class="px-2 py-1 text-xs font-medium rounded-full"
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
            <div class="space-y-3">
              <div class="flex items-center gap-2 text-gray-600">
                <CalendarIcon class="w-4 h-4 flex-shrink-0" />
                <span class="text-sm">{{
                  formatEventDate(registration.customEvent.eventDate)
                }}</span>
              </div>

              <div class="flex items-center gap-2 text-gray-600">
                <MapPinIcon class="w-4 h-4 flex-shrink-0" />
                <span class="text-sm">{{
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
              class="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div class="flex justify-between items-center mb-3">
                <h4 class="font-semibold text-gray-900">Decklist</h4>
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

              <div
                v-if="
                  registration.decklist && !isEditingDecklist[registration.id]
                "
                class="space-y-3"
              >
                <pre
                  class="bg-white border border-gray-200 rounded p-3 text-sm font-mono whitespace-pre-wrap"
                  >{{ registration.decklist }}</pre
                >
                <div class="flex flex-wrap gap-2">
                  <button
                    @click="
                      startEditDecklist(registration.id, registration.decklist)
                    "
                    class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors duration-200"
                  >
                    Edit Decklist
                  </button>
                  <button
                    @click="setBringingOnsite(registration.id)"
                    class="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors duration-200"
                  >
                    Bring On-Site Instead
                  </button>
                  <button
                    @click="deleteDecklist(registration.id)"
                    class="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors duration-200"
                  >
                    Delete Decklist
                  </button>
                </div>
              </div>

              <div
                v-else-if="
                  registration.bringingDecklistOnsite &&
                  !isEditingDecklist[registration.id]
                "
                class="text-center py-4 bg-blue-50 border border-blue-200 rounded"
              >
                <div class="flex items-center justify-center gap-2 mb-2">
                  <ClipboardDocumentIcon class="w-5 h-5 text-blue-600" />
                  <p class="text-blue-800 font-medium">
                    Bringing Decklist On-Site
                  </p>
                </div>
                <p class="text-blue-700 text-sm mb-3">
                  Remember to bring your completed decklist in written or
                  printed form to the event.
                </p>
                <button
                  @click="startEditDecklist(registration.id, '')"
                  class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors duration-200"
                >
                  Submit Online Instead
                </button>
              </div>

              <div
                v-else-if="
                  !registration.decklist &&
                  !registration.bringingDecklistOnsite &&
                  !isEditingDecklist[registration.id]
                "
                class="text-center py-4"
              >
                <p class="text-gray-600 mb-4">
                  Choose how to submit your decklist:
                </p>
                <div class="space-y-3">
                  <button
                    @click="startEditDecklist(registration.id, '')"
                    class="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
                  >
                    Submit Decklist Online
                  </button>
                  <button
                    @click="setBringingOnsite(registration.id)"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
                  >
                    I'll Bring Decklist On-Site
                  </button>
                </div>
              </div>

              <!-- Decklist Editor -->
              <div v-if="isEditingDecklist[registration.id]" class="space-y-3">
                <textarea
                  v-model="decklistText[registration.id]"
                  class="w-full border border-gray-300 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Enter your decklist here..."
                  rows="10"
                ></textarea>
                <div class="flex gap-2">
                  <button
                    @click="submitDecklist(registration.id)"
                    :disabled="isSubmittingDecklist[registration.id]"
                    class="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
                  >
                    {{
                      isSubmittingDecklist[registration.id]
                        ? "Saving..."
                        : "Save Decklist"
                    }}
                  </button>
                  <button
                    @click="cancelEditDecklist(registration.id)"
                    class="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
                  >
                    Cancel
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

// Use i18n for translations
const { t } = useI18n();

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

const deleteDecklist = async (registrationId: string) => {
  const confirmed = confirm(
    "Are you sure you want to delete your submitted decklist? This will set your registration back to reserved status."
  );

  if (!confirmed) return;

  try {
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
  } catch (err) {
    console.error("Failed to delete decklist:", err);
    error.value =
      err instanceof Error ? err.message : "Failed to delete decklist";
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
