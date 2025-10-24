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
        class="flex-1 overflow-y-auto max-h-[30rem] pr-1 space-y-4 relative border border-emerald-200 rounded-lg p-2 scrollbar-prominent"
        @scroll="handleScroll"
      >
        <TransitionGroup name="registration" tag="div" class="space-y-4">
          <div
            v-for="registration in registrations"
            :key="registration.id"
            class="group bg-white rounded-2xl shadow-md border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-300 overflow-hidden"
          >
            <!-- Card Header -->
            <div class="p-6 border-b border-gray-100">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-3">
                    <div
                      class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm"
                    >
                      <CalendarIcon class="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3
                        class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1"
                      >
                        {{ registration.customEvent.name }}
                      </h3>
                      <div
                        class="flex items-center space-x-4 text-sm text-gray-500"
                      >
                        <div class="flex items-center">
                          <CalendarDaysIcon class="w-4 h-4 mr-1" />
                          {{
                            formatEventDate(registration.customEvent.eventDate)
                          }}
                        </div>
                        <div class="flex items-center">
                          <MapPinIcon class="w-4 h-4 mr-1" />
                          {{ registration.customEvent.venue }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Status Badge -->
                <div class="flex flex-col items-end space-y-2">
                  <span
                    :class="getStatusBadgeClass(registration.status)"
                    class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                  >
                    <span
                      :class="getStatusDotClass(registration.status)"
                      class="w-2 h-2 rounded-full mr-2"
                    ></span>
                    {{ getStatusLabel(registration.status) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Card Content -->
            <div class="p-6 space-y-4">
              <!-- Decklist Status Alerts -->
              <div
                v-if="registration.customEvent.requiresDecklist"
                class="space-y-3"
              >
                <!-- Action Required Alert -->
                <div
                  v-if="
                    !registration.decklist &&
                    !registration.bringingDecklistOnsite
                  "
                  class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4"
                >
                  <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0">
                      <ExclamationTriangleIcon
                        class="h-6 w-6 text-amber-600 mt-0.5"
                      />
                    </div>
                    <div class="flex-1">
                      <h4 class="text-sm font-semibold text-amber-900 mb-1">
                        Action Required
                      </h4>
                      <p class="text-sm text-amber-800 mb-3">
                        This tournament requires a decklist. Submit it online or
                        choose to bring it on-site to confirm your registration.
                      </p>
                      <div class="flex flex-wrap gap-2">
                        <NuxtLink
                          to="/dashboard"
                          class="inline-flex items-center px-3 py-2 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors duration-200"
                        >
                          <DocumentTextIcon class="w-4 h-4 mr-1" />
                          Submit Decklist
                        </NuxtLink>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Decklist Submitted Success -->
                <div
                  v-else-if="registration.decklist"
                  class="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4"
                >
                  <div class="flex items-center space-x-3">
                    <CheckCircleIcon class="h-6 w-6 text-emerald-600" />
                    <div>
                      <h4 class="text-sm font-semibold text-emerald-900">
                        Decklist Submitted
                      </h4>
                      <p class="text-sm text-emerald-800">
                        Your decklist has been successfully submitted online
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Bringing On-Site -->
                <div
                  v-else-if="registration.bringingDecklistOnsite"
                  class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4"
                >
                  <div class="flex items-center space-x-3">
                    <InformationCircleIcon class="h-6 w-6 text-blue-600" />
                    <div>
                      <h4 class="text-sm font-semibold text-blue-900">
                        Bringing Decklist On-Site
                      </h4>
                      <p class="text-sm text-blue-800">
                        Remember to bring your written or printed decklist to
                        the event
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex flex-wrap gap-3 pt-2">
                <!-- View Participants Button -->
                <div class="relative">
                  <button
                    @click="
                      toggleParticipantsPopover(registration.customEventId)
                    "
                    class="group flex items-center px-4 py-2 bg-gray-50 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-200 hover:border-gray-300"
                  >
                    <UsersIcon
                      class="w-4 h-4 mr-2 group-hover:scale-110 transition-transform"
                    />
                    View Participants
                  </button>

                  <!-- Participants Popover Portal -->
                  <Teleport to="body">
                    <Transition
                      enter-active-class="transition-all duration-200 ease-out"
                      enter-from-class="opacity-0 scale-95"
                      enter-to-class="opacity-100 scale-100"
                      leave-active-class="transition-all duration-150 ease-in"
                      leave-from-class="opacity-100 scale-100"
                      leave-to-class="opacity-0 scale-95"
                    >
                      <div
                        v-if="activePopover === registration.customEventId"
                        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                        @click="closePopover"
                      >
                        <div
                          class="w-[600px] max-w-[95vw] max-h-[85vh] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
                          @click.stop
                        >
                          <!-- Popover Header -->
                          <div
                            class="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4"
                          >
                            <div class="flex items-center justify-between">
                              <h3 class="text-white font-semibold text-lg">
                                Event Participants
                              </h3>
                              <button
                                @click="closePopover()"
                                class="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                              >
                                <XMarkIcon class="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          <!-- Popover Content -->
                          <div class="max-h-96 overflow-y-auto p-6">
                            <EventParticipants
                              :event-id="registration.customEventId"
                              :show-decklist-status="
                                registration.customEvent.requiresDecklist
                              "
                              :compact="true"
                            />
                          </div>
                        </div>
                      </div>
                    </Transition>
                  </Teleport>
                </div>

                <!-- Manage Registration Button -->
                <NuxtLink
                  to="/dashboard"
                  class="group flex items-center px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-all duration-200 border border-blue-200 hover:border-blue-300"
                >
                  <CogIcon
                    class="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300"
                  />
                  Manage
                </NuxtLink>

                <!-- Re-register Button (for cancelled registrations) -->
                <NuxtLink
                  v-if="registration.status === 'cancelled'"
                  :to="`/events/${registration.customEvent.id}`"
                  class="group flex items-center px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-100 transition-all duration-200 border border-emerald-200 hover:border-emerald-300"
                >
                  <ArrowPathIcon class="w-4 h-4 mr-2" />
                  Re-register
                </NuxtLink>

                <!-- Cancel Registration Button -->
                <button
                  v-else-if="canCancelRegistration(registration)"
                  @click="confirmCancellation(registration)"
                  :disabled="cancelling === registration.id"
                  class="group flex items-center px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-red-200 hover:border-red-300"
                >
                  <XMarkIcon
                    v-if="cancelling !== registration.id"
                    class="w-4 h-4 mr-2"
                  />
                  <div
                    v-else
                    class="w-4 h-4 mr-2 border-2 border-red-600 border-t-transparent rounded-full animate-spin"
                  ></div>
                  {{
                    cancelling === registration.id ? "Cancelling..." : "Cancel"
                  }}
                </button>

                <!-- Cancellation Message -->
                <div
                  v-else-if="!canCancelRegistration(registration)"
                  class="flex items-center px-3 py-2 bg-gray-50 text-gray-500 text-xs rounded-lg border border-gray-200"
                >
                  <InformationCircleIcon class="w-4 h-4 mr-1" />
                  {{ getCancellationMessage(registration) }}
                </div>
              </div>
            </div>
          </div>
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
  </div>
</template>

<script setup lang="ts">
import { watch, nextTick } from "vue";
import {
  TicketIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  CalendarIcon,
  CalendarDaysIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  UsersIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CogIcon,
  XMarkIcon,
  ChartBarSquareIcon,
} from "@heroicons/vue/24/outline";

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
const activePopover = ref<string | null>(null);
const scrollContainer = ref<HTMLElement | null>(null);
const canScrollUp = ref(false);
const canScrollDown = ref(false);
const supabase = useSupabaseClient();

function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "registered":
      return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    case "reserved":
      return "bg-amber-100 text-amber-800 border border-amber-200";
    case "cancelled":
      return "bg-red-100 text-red-800 border border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200";
  }
}

function getStatusDotClass(status: string): string {
  switch (status) {
    case "registered":
      return "bg-emerald-500";
    case "reserved":
      return "bg-amber-500";
    case "cancelled":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "registered":
      return "Confirmed";
    case "reserved":
      return "Reserved";
    case "cancelled":
      return "Cancelled";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function toggleParticipantsPopover(eventId: string): void {
  if (activePopover.value === eventId) {
    activePopover.value = null;
  } else {
    activePopover.value = eventId;
  }
}

function closePopover(): void {
  activePopover.value = null;
}

function handleScroll(): void {
  if (!scrollContainer.value) return;

  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
  canScrollUp.value = scrollTop > 10;
  canScrollDown.value = scrollTop < scrollHeight - clientHeight - 10;
}

function checkScrollability(): void {
  if (!scrollContainer.value) return;

  const { scrollHeight, clientHeight } = scrollContainer.value;
  canScrollDown.value = scrollHeight > clientHeight;
}

async function fetchUserRegistrations(): Promise<void> {
  try {
    isLoading.value = true;
    const { data } = await $fetch<{ data: EventRegistration[] }>(
      "/api/dashboard/registrations"
    );
    registrations.value = data || [];

    // Check scroll indicators after data loads
    await nextTick();
    checkScrollability();
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

    // Update the registration status to cancelled in the UI instead of removing it
    const registrationIndex = registrations.value.findIndex(
      (r) => r.id === registration.id
    );
    if (registrationIndex !== -1) {
      registrations.value[registrationIndex] = {
        ...registrations.value[registrationIndex],
        status: "cancelled",
      };
    }

    alert(
      `Successfully cancelled your registration for "${registration.customEvent.name}". You can re-register if you change your mind.`
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

// Watch for registrations changes to update scroll indicators
watch(
  registrations,
  () => {
    nextTick(() => {
      checkScrollability();
    });
  },
  { flush: "post" }
);
</script>
