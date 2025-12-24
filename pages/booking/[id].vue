<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
    <div class="max-w-5xl mx-auto px-4">
      <!-- Loading State -->
      <div
        v-if="loading"
        class="flex items-center justify-center min-h-[400px]"
      >
        <div class="text-center">
          <div
            class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"
          ></div>
          <p class="text-gray-600">Loading booking details...</p>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-white rounded-2xl shadow-xl p-8 text-center"
      >
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Error</h2>
        <p class="text-red-600 mb-6">{{ error }}</p>
        <NuxtLink
          to="/dashboard"
          class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          ← Back to Dashboard
        </NuxtLink>
      </div>

      <!-- Main Content -->
      <div v-else-if="booking" class="space-y-6">
        <!-- Header -->
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <NuxtLink
              to="/dashboard"
              class="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-2"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Dashboard
            </NuxtLink>
            <h1 class="text-3xl font-bold text-gray-900">
              {{ booking.event.name }}
            </h1>
            <p class="text-gray-600">
              {{ formatEventDate(booking.event.eventDate) }}
            </p>
          </div>
        </div>

        <!-- Event Info Card -->
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">
            Event Information
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-500">Venue</p>
              <p class="font-medium">{{ booking.event.venue }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Date</p>
              <p class="font-medium">
                {{ formatEventDate(booking.event.eventDate) }}
              </p>
            </div>
            <div v-if="booking.event.participationFee">
              <p class="text-sm text-gray-500">Participation Fee</p>
              <p class="font-medium">{{ booking.event.participationFee }}€</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Registered</p>
              <p class="font-medium">{{ formatDate(booking.registeredAt) }}</p>
            </div>
          </div>
        </div>

        <!-- Tickets Section -->
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <div
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4"
          >
            <div>
              <h2 class="text-xl font-bold text-gray-900">Tickets</h2>
              <p class="text-gray-600">
                {{ booking.statistics.activeTickets }} active ticket{{
                  booking.statistics.activeTickets !== 1 ? "s" : ""
                }}
              </p>
            </div>
            <button
              v-if="booking.permissions.canAddTickets"
              @click="showAddTicketModal = true"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Ticket
            </button>
          </div>

          <!-- Tickets List -->
          <div class="space-y-4">
            <div
              v-for="ticket in activeTickets"
              :key="ticket.id"
              class="border rounded-lg p-4 bg-white"
            >
              <div
                class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <h3 class="font-semibold text-gray-900">
                      {{ ticket.participantName }}
                    </h3>
                    <span
                      v-if="ticket.status === 'registered'"
                      class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded"
                    >
                      Registered
                    </span>
                    <span
                      v-else-if="ticket.status === 'reserved'"
                      class="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded"
                    >
                      Reserved
                    </span>
                  </div>
                  <div class="text-sm text-gray-600 space-y-1">
                    <p v-if="ticket.participantPlayerId">
                      Player ID: {{ ticket.participantPlayerId }}
                    </p>
                    <p
                      v-if="ticket.isAnonymous"
                      class="flex items-center gap-1"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                      Anonymous
                    </p>
                    
                    <!-- Decklist Status -->
                    <div v-if="booking.event.requiresDecklist" class="mt-2 pt-2 border-t border-gray-200">
                      <div v-if="ticket.decklist" class="flex items-center gap-1 text-green-600">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        Decklist submitted
                      </div>
                      <div v-else-if="ticket.bringingDecklistOnsite" class="flex items-center gap-1 text-blue-600">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd"></path>
                        </svg>
                        Bringing decklist on-site
                      </div>
                      <div v-else class="flex items-center gap-1 text-amber-600">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                        Decklist pending
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="booking.permissions.canModify" class="flex gap-2 flex-wrap">
                  <button
                    v-if="booking.event.requiresDecklist"
                    @click="editTicketDecklist(ticket)"
                    class="px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition flex items-center gap-1"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    Decklist
                  </button>
                  <button
                    @click="editTicket(ticket)"
                    class="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                  >
                    Edit
                  </button>
                  <button
                    @click="confirmCancelTicket(ticket)"
                    class="px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- No Modifications Warning -->
          <div
            v-if="!booking.permissions.canModify"
            class="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4"
          >
            <p class="text-amber-800 text-sm">
              <strong>Note:</strong> Modifications are no longer allowed
              (deadline: 24 hours before event)
            </p>
          </div>
        </div>

        <!-- Cancel Entire Booking -->
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Cancel Booking</h2>
          <p class="text-gray-600 mb-4">
            Cancel all tickets and your entire booking for this event.
          </p>
          <button
            v-if="booking.permissions.canModify"
            @click="confirmCancelBooking"
            class="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Cancel Entire Booking
          </button>
          <p v-else class="text-amber-600 text-sm">
            Cancellation is no longer possible (deadline: 24 hours before event)
          </p>
        </div>
      </div>
    </div>

    <!-- Add Ticket Modal -->
    <div
      v-if="showAddTicketModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showAddTicketModal = false"
    >
      <div class="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
        <h3 class="text-xl font-bold text-gray-900 mb-4">Add New Ticket</h3>
        <form @submit.prevent="submitAddTicket" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              Participant Name *
            </label>
            <input
              v-model="newTicket.participantName"
              type="text"
              required
              class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Full name"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              Player ID (optional)
            </label>
            <input
              v-model="newTicket.participantPlayerId"
              type="text"
              class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Player ID"
            />
          </div>
          <div>
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="newTicket.isAnonymous"
                class="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span class="text-sm font-medium text-gray-900"
                  >Anonymous Participation</span
                >
                <p class="text-xs text-gray-600 mt-0.5">
                  Hide name from other participants
                </p>
              </div>
            </label>
          </div>
          <div
            v-if="addTicketError"
            class="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <p class="text-red-800 text-sm">{{ addTicketError }}</p>
          </div>
          <div class="flex gap-3">
            <button
              type="button"
              @click="showAddTicketModal = false"
              class="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="addingTicket"
              class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {{ addingTicket ? "Adding..." : "Add Ticket" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Ticket Modal -->
    <div
      v-if="showEditTicketModal && editingTicket"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showEditTicketModal = false"
    >
      <div class="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
        <h3 class="text-xl font-bold text-gray-900 mb-4">Edit Ticket</h3>
        <form @submit.prevent="submitEditTicket" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              Participant Name *
            </label>
            <input
              v-model="editingTicket.participantName"
              type="text"
              required
              class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              Player ID (optional)
            </label>
            <input
              v-model="editingTicket.participantPlayerId"
              type="text"
              class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="editingTicket.isAnonymous"
                class="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span class="text-sm font-medium text-gray-900"
                >Anonymous Participation</span
              >
            </label>
          </div>
          <div
            v-if="editTicketError"
            class="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <p class="text-red-800 text-sm">{{ editTicketError }}</p>
          </div>
          <div class="flex gap-3">
            <button
              type="button"
              @click="showEditTicketModal = false"
              class="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="updatingTicket"
              class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {{ updatingTicket ? "Saving..." : "Save Changes" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Cancel Ticket Modal -->
    <div
      v-if="showCancelTicketModal && ticketToCancel"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showCancelTicketModal = false"
    >
      <div
        class="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
        @click.stop
      >
        <h3 class="text-xl font-bold text-gray-900 mb-4">Cancel Ticket?</h3>
        <p class="text-gray-700 mb-6">
          Are you sure you want to cancel the ticket for
          <strong>{{ ticketToCancel.participantName }}</strong
          >? This action cannot be undone.
        </p>
        <div class="flex gap-3">
          <button
            type="button"
            @click="showCancelTicketModal = false"
            :disabled="cancellingTicket"
            class="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Keep Ticket
          </button>
          <button
            @click="cancelTicket"
            :disabled="cancellingTicket"
            class="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
          >
            {{ cancellingTicket ? "Cancelling..." : "Yes, Cancel Ticket" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Cancel Booking Modal -->
    <div
      v-if="showCancelBookingModal && booking"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showCancelBookingModal = false"
    >
      <div
        class="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
        @click.stop
      >
        <h3 class="text-xl font-bold text-gray-900 mb-4">
          Cancel Entire Booking?
        </h3>
        <p class="text-gray-700 mb-4">
          Are you sure you want to cancel your entire booking with
          <strong
            >{{ booking.statistics.activeTickets }} active ticket{{
              booking.statistics.activeTickets !== 1 ? "s" : ""
            }}</strong
          >?
        </p>
        <p class="text-sm text-gray-600 mb-6">
          This action cannot be undone. All tickets will be cancelled and you
          will need to register again if you change your mind.
        </p>
        <div class="flex gap-3">
          <button
            type="button"
            @click="showCancelBookingModal = false"
            :disabled="cancellingBooking"
            class="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Keep Booking
          </button>
          <button
            @click="cancelBooking"
            :disabled="cancellingBooking"
            class="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
          >
            {{ cancellingBooking ? "Cancelling..." : "Yes, Cancel Booking" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Decklist Modal -->
    <div
      v-if="showDecklistModal && editingTicketForDecklist"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showDecklistModal = false"
    >
      <div
        class="bg-white rounded-2xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <h3 class="text-xl font-bold text-gray-900 mb-2">
          Decklist for {{ editingTicketForDecklist.participantName }}
        </h3>
        <p class="text-sm text-gray-600 mb-6">
          Submit or update the decklist for this participant
        </p>

        <div class="space-y-4">
          <!-- Bringing Onsite Checkbox -->
          <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              v-model="decklistForm.bringingOnsite"
              type="checkbox"
              id="bringingOnsite"
              class="w-4 h-4 text-blue-600 rounded"
            />
            <label for="bringingOnsite" class="text-sm font-medium text-gray-700">
              I will bring my decklist on-site
            </label>
          </div>

          <!-- Decklist Textarea (hidden if bringing onsite) -->
          <div v-if="!decklistForm.bringingOnsite">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Decklist
            </label>
            <textarea
              v-model="decklistForm.decklist"
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
            type="button"
            @click="showDecklistModal = false"
            :disabled="savingDecklist"
            class="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            @click="saveDecklistForTicket"
            :disabled="savingDecklist || (!decklistForm.bringingOnsite && !decklistForm.decklist)"
            class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {{ savingDecklist ? "Saving..." : "Save Decklist" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const bookingId = route.params.id as string;

interface Ticket {
  id: string;
  participantName: string;
  participantPlayerId: string | null;
  status: string;
  isAnonymous: boolean;
  decklist: string | null;
  bringingDecklistOnsite: boolean;
  placement: number | null;
  points: number | null;
}

interface Booking {
  id: string;
  registeredAt: string;
  booker: {
    id: string;
    playerId: string;
    name: string;
    email: string;
  };
  event: {
    id: string;
    name: string;
    venue: string;
    eventDate: string;
    registrationDeadline: string | null;
    maxParticipants: number;
    participationFee: string | null;
    requiresDecklist: boolean;
    isExternal: boolean;
  };
  tickets: Ticket[];
  statistics: {
    totalTickets: number;
    activeTickets: number;
    cancelledTickets: number;
  };
  permissions: {
    canModify: boolean;
    canAddTickets: boolean;
    canCancelTickets: boolean;
  };
}

const booking = ref<Booking | null>(null);
const loading = ref(true);
const error = ref("");

// Filter out cancelled tickets
const activeTickets = computed(() => {
  if (!booking.value) return [];
  return booking.value.tickets.filter(
    (ticket) => ticket.status !== "cancelled"
  );
});

const showAddTicketModal = ref(false);
const addingTicket = ref(false);
const addTicketError = ref("");
const newTicket = reactive({
  participantName: "",
  participantPlayerId: "",
  isAnonymous: false,
});

const showEditTicketModal = ref(false);
const updatingTicket = ref(false);
const editTicketError = ref("");
const editingTicket = ref<Ticket | null>(null);

const showCancelTicketModal = ref(false);
const cancellingTicket = ref(false);
const ticketToCancel = ref<Ticket | null>(null);

const showCancelBookingModal = ref(false);
const cancellingBooking = ref(false);

const showDecklistModal = ref(false);
const savingDecklist = ref(false);
const editingTicketForDecklist = ref<Ticket | null>(null);
const decklistForm = reactive({
  decklist: "",
  bringingOnsite: false,
});

const fetchBookingDetails = async () => {
  try {
    loading.value = true;
    error.value = "";

    const response = await $fetch<{ success: boolean; booking: Booking }>(
      `/api/bookings/${bookingId}`
    );

    if (response.success) {
      booking.value = response.booking;
    }
  } catch (err: any) {
    console.error("Failed to fetch booking:", err);
    error.value = err.data?.message || "Failed to load booking details";
  } finally {
    loading.value = false;
  }
};

const formatEventDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const submitAddTicket = async () => {
  try {
    addingTicket.value = true;
    addTicketError.value = "";

    await $fetch(`/api/bookings/${bookingId}/tickets/add`, {
      method: "POST",
      body: {
        participantName: newTicket.participantName,
        participantPlayerId: newTicket.participantPlayerId || null,
        isAnonymous: newTicket.isAnonymous,
      },
    });

    // Reset form
    newTicket.participantName = "";
    newTicket.participantPlayerId = "";
    newTicket.isAnonymous = false;
    showAddTicketModal.value = false;

    // Reload booking
    await fetchBookingDetails();
  } catch (err: any) {
    console.error("Failed to add ticket:", err);
    addTicketError.value = err.data?.message || "Failed to add ticket";
  } finally {
    addingTicket.value = false;
  }
};

const editTicket = (ticket: Ticket) => {
  editingTicket.value = { ...ticket };
  showEditTicketModal.value = true;
  editTicketError.value = "";
};

const editTicketDecklist = (ticket: Ticket) => {
  editingTicketForDecklist.value = ticket;
  decklistForm.decklist = ticket.decklist || "";
  decklistForm.bringingOnsite = ticket.bringingDecklistOnsite || false;
  showDecklistModal.value = true;
};

const saveDecklistForTicket = async () => {
  if (!editingTicketForDecklist.value) return;

  try {
    savingDecklist.value = true;

    await $fetch(`/api/dashboard/decklist`, {
      method: "PUT",
      body: {
        registrationId: bookingId,
        ticketId: editingTicketForDecklist.value.id,
        decklist: decklistForm.bringingOnsite ? null : decklistForm.decklist,
        bringingDecklistOnsite: decklistForm.bringingOnsite,
      },
    });

    showDecklistModal.value = false;
    editingTicketForDecklist.value = null;

    // Reload booking
    await fetchBookingDetails();
  } catch (err: any) {
    console.error("Failed to save decklist:", err);
    alert(err.data?.message || "Failed to save decklist");
  } finally {
    savingDecklist.value = false;
  }
};

const submitEditTicket = async () => {
  if (!editingTicket.value) return;

  try {
    updatingTicket.value = true;
    editTicketError.value = "";

    await $fetch(
      `/api/bookings/${bookingId}/tickets/${editingTicket.value.id}`,
      {
        method: "PATCH",
        body: {
          participantName: editingTicket.value.participantName,
          participantPlayerId: editingTicket.value.participantPlayerId || null,
          isAnonymous: editingTicket.value.isAnonymous,
        },
      }
    );

    showEditTicketModal.value = false;
    editingTicket.value = null;

    // Reload booking
    await fetchBookingDetails();
  } catch (err: any) {
    console.error("Failed to update ticket:", err);
    editTicketError.value = err.data?.message || "Failed to update ticket";
  } finally {
    updatingTicket.value = false;
  }
};

const confirmCancelTicket = (ticket: Ticket) => {
  ticketToCancel.value = ticket;
  showCancelTicketModal.value = true;
};

const cancelTicket = async () => {
  if (!ticketToCancel.value) return;

  try {
    cancellingTicket.value = true;
    await $fetch(
      `/api/bookings/${bookingId}/tickets/${ticketToCancel.value.id}`,
      {
        method: "DELETE",
      }
    );

    showCancelTicketModal.value = false;
    ticketToCancel.value = null;

    // Reload booking
    await fetchBookingDetails();
  } catch (err: any) {
    console.error("Failed to cancel ticket:", err);
    alert(err.data?.message || "Failed to cancel ticket");
  } finally {
    cancellingTicket.value = false;
  }
};

const confirmCancelBooking = () => {
  showCancelBookingModal.value = true;
};

const cancelBooking = async () => {
  if (!booking.value) return;

  try {
    cancellingBooking.value = true;
    await $fetch(`/api/dashboard/registrations/${bookingId}/cancel`, {
      method: "POST",
    });

    // Redirect to dashboard
    navigateTo("/dashboard");
  } catch (err: any) {
    console.error("Failed to cancel booking:", err);
    alert(err.data?.message || "Failed to cancel booking");
    cancellingBooking.value = false;
  }
};

onMounted(() => {
  fetchBookingDetails();
});
</script>
