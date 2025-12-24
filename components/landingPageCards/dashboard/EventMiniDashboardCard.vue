<template>
  <div class="flex flex-col h-full space-y-6">
    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="flex flex-col items-center justify-center py-12 space-y-4"
    >
      <div class="relative">
        <div
          class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"
        ></div>
        <div
          class="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-purple-600 rounded-full animate-spin"
          style="animation-delay: 0.1s"
        ></div>
      </div>
      <div class="text-center">
        <p class="text-gray-600 font-medium">Loading your registrations...</p>
        <p class="text-gray-400 text-sm">Please wait a moment</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!registrations.length" class="text-center py-16">
      <div
        class="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center"
      >
        <TicketIcon class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">
        No registrations yet
      </h3>
      <p class="text-gray-500 mb-8 max-w-md mx-auto">
        You haven't registered for any events yet. Start exploring tournaments
        in your area!
      </p>
      <NuxtLink
        to="/events"
        class="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <MagnifyingGlassIcon
          class="w-5 h-5 mr-2 group-hover:scale-110 transition-transform"
        />
        Browse Events
        <ArrowRightIcon
          class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
        />
      </NuxtLink>
    </div>

    <!-- Registration Cards -->
    <div v-else class="flex flex-col h-full">
      <!-- Scroll Indicator Header -->
      <div v-if="registrations.length > 2" class="mb-3 px-1">
        <div
          class="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
        >
          <div class="flex items-center text-sm text-emerald-700 font-medium">
            <span class="mr-2">{{ registrations.length }} registrations</span>
          </div>
          <div
            class="flex items-center space-x-1 text-emerald-600 animate-bounce"
          >
            <ChevronUpIcon class="w-4 h-4" />
            <span class="text-xs font-semibold">Scroll to view all</span>
            <ChevronDownIcon class="w-4 h-4" />
          </div>
        </div>
      </div>

      <!-- Registrations List Container - Fixed Height with Scroll -->
      <div
        ref="scrollContainer"
        :class="[
          'flex-1 overflow-y-auto max-h-[30rem] pr-1 space-y-4 relative border border-emerald-200 rounded-lg p-2',
          shouldShowScrollbar
            ? 'scrollbar-always-visible'
            : 'scrollbar-prominent',
        ]"
        @scroll="handleScroll"
      >
        <TransitionGroup name="registration" tag="div" class="space-y-4">
          <RegistrationMiniEntry
            v-for="registration in registrations"
            :key="registration.id"
            :registration="registration"
            :cancelling="cancelling"
            @cancel="confirmCancellation"
          />
        </TransitionGroup>
      </div>

      <!-- Dashboard Link -->
      <div class="pt-4 flex-shrink-0">
        <NuxtLink
          to="/dashboard"
          class="group flex items-center justify-center w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-800 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <ChartBarSquareIcon
            class="w-5 h-5 mr-2 group-hover:scale-110 transition-transform"
          />
          View Full Dashboard
          <ArrowRightIcon
            class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
          />
        </NuxtLink>
      </div>
    </div>

    <!-- Cancellation Modal -->
    <div
      v-if="showCancelModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      @click="closeCancelModal"
    >
      <div
        class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
        @click.stop
      >
        <div class="mb-4">
          <h3 class="text-xl font-bold text-gray-900 mb-2">
            Cancel Registration
          </h3>
          <p class="text-gray-600">
            Are you sure you want to cancel your registration for
            <span class="font-semibold text-gray-900">{{
              registrationToCancel?.customEvent.name
            }}</span
            >?
          </p>
          <div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p class="text-sm text-amber-800">
              <strong>Event Date:</strong>
              {{
                registrationToCancel
                  ? formatEventDate(registrationToCancel.customEvent.eventDate)
                  : ""
              }}
            </p>
          </div>
          <p class="text-sm text-red-600 mt-3">
            ⚠️ This action cannot be undone. You can re-register later if spots
            are still available.
          </p>

          <!-- Error Message -->
          <div
            v-if="cancelError"
            class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <p class="text-sm text-red-800">
              <strong>Error:</strong> {{ cancelError }}
            </p>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            @click="closeCancelModal"
            :disabled="cancelling !== null"
            class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
          >
            Keep Registration
          </button>
          <button
            @click="proceedWithCancellation"
            :disabled="cancelling !== null"
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center"
          >
            <div
              v-if="cancelling"
              class="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"
            ></div>
            {{ cancelling ? "Cancelling..." : "Yes, Cancel" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Success Toast -->
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div v-if="showSuccessToast" class="fixed bottom-4 right-4 z-50 max-w-md">
        <div
          class="bg-green-600 text-white rounded-lg shadow-2xl p-4 flex items-start gap-3"
        >
          <div class="flex-shrink-0">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </div>
          <div class="flex-1">
            <p class="font-semibold">Registration Cancelled</p>
            <p class="text-sm text-green-100 mt-1">{{ successMessage }}</p>
          </div>
          <button
            @click="showSuccessToast = false"
            class="flex-shrink-0 text-green-200 hover:text-white transition-colors"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, computed } from "vue";
import {
  TicketIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChartBarSquareIcon,
} from "@heroicons/vue/24/outline";

// Explicit component import due to nested folder structure
import RegistrationMiniEntry from "./RegistrationMiniEntry.vue";

interface EventRegistration {
  id: string;
  customEventId: string | null;
  externalEventId?: string | null;
  playerId: string;
  registeredAt: string;
  status: string;
  decklist?: string | null;
  bringingDecklistOnsite: boolean;
  notes?: string | null;
  isExternalEvent?: boolean;
  eventType?: string;
  customEvent: {
    id: string;
    name: string;
    venue: string;
    maxParticipants: number;
    participationFee: number;
    description: string;
    eventDate: string;
    registrationDeadline?: string;
    status: string;
    requiresDecklist: boolean;
  };
}

// State
const registrations = ref<EventRegistration[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const scrollContainer = ref<HTMLElement>();
const cancelling = ref<string | null>(null);
const showCancelModal = ref(false);
const registrationToCancel = ref<EventRegistration | null>(null);
const cancelError = ref<string | null>(null);
const showSuccessToast = ref(false);
const successMessage = ref<string>("");

// Scroll handling
const handleScroll = () => {
  // Add scroll indicator logic if needed
};

// Load registrations
const loadRegistrations = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await $fetch<{
      data: EventRegistration[];
      error: string | null;
    }>("/api/dashboard/registrations");

    if (response.error) {
      error.value = response.error;
    } else {
      registrations.value = response.data || [];
    }
  } catch (err: unknown) {
    console.error("Failed to load registrations:", err);
    error.value =
      err instanceof Error ? err.message : "Failed to load registrations";
  } finally {
    isLoading.value = false;
  }
};

// Cancellation logic
async function confirmCancellation(
  registration: EventRegistration
): Promise<void> {
  registrationToCancel.value = registration;
  cancelError.value = null;
  showCancelModal.value = true;
}

function closeCancelModal(): void {
  if (cancelling.value) return; // Don't close while cancelling
  showCancelModal.value = false;
  registrationToCancel.value = null;
  cancelError.value = null;
}

async function proceedWithCancellation(): Promise<void> {
  if (!registrationToCancel.value) return;

  try {
    cancelError.value = null;
    cancelling.value = registrationToCancel.value.id;

    await $fetch(
      `/api/dashboard/registrations/${registrationToCancel.value.id}/cancel` as string,
      {
        method: "POST" as const,
      }
    );

    // Remove the registration from the UI
    registrations.value = registrations.value.filter(
      (r) => r.id !== registrationToCancel.value!.id
    );

    // Store event name and close modal
    const eventName = registrationToCancel.value.customEvent.name;
    showCancelModal.value = false;
    registrationToCancel.value = null;

    // Show success toast
    successMessage.value = `Successfully cancelled your registration for "${eventName}". You can re-register if you change your mind.`;
    showSuccessToast.value = true;

    // Auto-hide toast after 5 seconds
    setTimeout(() => {
      showSuccessToast.value = false;
    }, 5000);
  } catch (error: unknown) {
    console.error("Failed to cancel registration:", error);

    // Extract error message from API response
    let errorMessage = "Failed to cancel registration. Please try again.";

    if (error && typeof error === "object") {
      if ("statusMessage" in error && typeof error.statusMessage === "string") {
        errorMessage = error.statusMessage;
      } else if ("data" in error) {
        const data = error.data as any;
        if (data?.statusMessage) {
          errorMessage = data.statusMessage;
        } else if (typeof data === "string") {
          errorMessage = data;
        }
      } else if ("message" in error && typeof error.message === "string") {
        errorMessage = error.message;
      }
    }

    cancelError.value = errorMessage;
  } finally {
    cancelling.value = null;
  }
}

// Format event date
const formatEventDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Computed property to determine if scrollbar should always be visible
const shouldShowScrollbar = computed(() => registrations.value.length > 1);

// Auth composable
const { user } = useAuth();

// Watch for user changes and load registrations when user becomes available
// Only run on client to avoid SSR auth issues
watch(
  user,
  async (newUser) => {
    if (newUser && process.client) {
      await loadRegistrations();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
/* Scrollbar styling */
.scrollbar-prominent {
  scrollbar-width: thin;
  scrollbar-color: #10b981 #f3f4f6;
}

.scrollbar-prominent::-webkit-scrollbar {
  width: 8px;
}

.scrollbar-prominent::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 4px;
}

.scrollbar-prominent::-webkit-scrollbar-thumb {
  background: #10b981;
  border-radius: 4px;
}

.scrollbar-prominent::-webkit-scrollbar-thumb:hover {
  background: #059669;
}

/* Always visible scrollbar when multiple registrations */
.scrollbar-always-visible {
  scrollbar-width: thin;
  scrollbar-color: #10b981 #f3f4f6;
  overflow-y: scroll; /* Force scrollbar to always show */
}

.scrollbar-always-visible::-webkit-scrollbar {
  width: 8px;
  display: block; /* Ensure scrollbar is always visible */
}

.scrollbar-always-visible::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 4px;
}

.scrollbar-always-visible::-webkit-scrollbar-thumb {
  background: #10b981;
  border-radius: 4px;
  min-height: 20px; /* Ensure thumb has minimum size */
}

.scrollbar-always-visible::-webkit-scrollbar-thumb:hover {
  background: #059669;
}

/* Registration transition animations */
.registration-enter-active,
.registration-leave-active {
  transition: all 0.3s ease;
}

.registration-enter-from,
.registration-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.registration-move {
  transition: transform 0.3s ease;
}
</style>
