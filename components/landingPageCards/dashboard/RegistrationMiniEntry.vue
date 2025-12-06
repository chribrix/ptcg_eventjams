<template>
  <div
    class="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-300 hover:border-emerald-300 group"
  >
    <!-- Event Header -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1 flex-wrap">
          <h3 class="text-lg font-semibold text-gray-900 truncate">
            {{ registration.customEvent.name }}
          </h3>
          <span
            class="event-type-badge"
            :class="`type-${registration.eventType || 'custom'}`"
          >
            {{ getEventTypeName(registration.eventType || "custom") }}
          </span>
        </div>

        <div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <MapPinIcon class="w-4 h-4 flex-shrink-0" />
          <span class="truncate">{{ registration.customEvent.venue }}</span>
        </div>

        <div class="flex items-center gap-2 text-sm text-gray-600">
          <CalendarIcon class="w-4 h-4 flex-shrink-0" />
          <span>{{ formatEventDate(registration.customEvent.eventDate) }}</span>
        </div>
      </div>

      <!-- Status Badge -->
      <div class="ml-3 flex-shrink-0">
        <div
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
          :class="getStatusBadgeClass(registration.status)"
        >
          <div
            class="w-2 h-2 rounded-full mr-2"
            :class="getStatusDotClass(registration.status)"
          ></div>
          {{ getStatusLabel(registration.status) }}
        </div>
      </div>
    </div>

    <!-- Event Details Row -->
    <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
      <div class="flex items-center gap-4">
        <!-- Participation Fee -->
        <div
          v-if="registration.customEvent.participationFee > 0"
          class="flex items-center gap-1"
        >
          <CurrencyEuroIcon class="w-4 h-4" />
          <span>€{{ registration.customEvent.participationFee }}</span>
        </div>
        <div v-else class="flex items-center gap-1 text-green-600">
          <CheckCircleIcon class="w-4 h-4" />
          <span>Free</span>
        </div>

        <!-- Max Participants -->
        <div class="flex items-center gap-1">
          <UsersIcon class="w-4 h-4" />
          <span>{{ registration.customEvent.maxParticipants }} max</span>
        </div>

        <!-- Decklist Required -->
        <div
          v-if="registration.customEvent.requiresDecklist"
          class="flex items-center gap-1 text-amber-600"
        >
          <DocumentTextIcon class="w-4 h-4" />
          <span>Decklist required</span>
        </div>
      </div>

      <!-- Registration Date -->
      <div class="flex items-center gap-1 text-xs">
        <CalendarDaysIcon class="w-3 h-3" />
        <span
          >Registered
          {{ formatRegistrationDate(registration.registeredAt) }}</span
        >
      </div>
    </div>

    <!-- Decklist Status (if required) -->
    <div
      v-if="registration.customEvent.requiresDecklist"
      class="mb-4 p-3 rounded-lg border"
      :class="getDecklistStatusClasses(registration)"
    >
      <div class="flex items-center gap-2">
        <DocumentTextIcon class="w-4 h-4" />
        <span class="font-medium text-sm">{{
          getDecklistStatusText(registration)
        }}</span>
      </div>
      <div
        v-if="registration.status === 'reserved' && !registration.decklist"
        class="text-xs mt-1 opacity-75"
      >
        Complete your registration by uploading a decklist
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center gap-3">
      <!-- Event Details Button -->
      <NuxtLink
        :to="`/events/${registration.customEvent.id}`"
        class="group flex items-center px-3 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-all duration-200 border border-blue-200 hover:border-blue-300"
      >
        <InformationCircleIcon class="w-4 h-4 mr-2" />
        View Event
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
        @click="$emit('cancel', registration)"
        :disabled="cancelling === registration.id"
        class="group flex items-center px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-red-200 hover:border-red-300"
      >
        <XMarkIcon v-if="cancelling !== registration.id" class="w-4 h-4 mr-2" />
        <div
          v-else
          class="w-4 h-4 mr-2 border-2 border-red-600 border-t-transparent rounded-full animate-spin"
        ></div>
        {{ cancelling === registration.id ? "Cancelling..." : "Cancel" }}
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
</template>

<script setup lang="ts">
import {
  MapPinIcon,
  CalendarIcon,
  CalendarDaysIcon,
  CurrencyEuroIcon,
  CheckCircleIcon,
  UsersIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";

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

// Props
defineProps<{
  registration: EventRegistration;
  cancelling: string | null;
}>();

// Emits
defineEmits<{
  cancel: [registration: EventRegistration];
}>();

// TODO check if proper to keep
const CANCELLATION_DEADLINE_HOURS = 24;

// Helper functions
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

function getDecklistStatusClasses(registration: EventRegistration): string {
  if (registration.decklist) {
    return "bg-emerald-50 border-emerald-200 text-emerald-800";
  } else if (registration.bringingDecklistOnsite) {
    return "bg-blue-50 border-blue-200 text-blue-800";
  } else {
    return "bg-amber-50 border-amber-200 text-amber-800";
  }
}

function getDecklistStatusText(registration: EventRegistration): string {
  if (registration.decklist) {
    return "✓ Decklist uploaded";
  } else if (registration.bringingDecklistOnsite) {
    return "📋 Bringing decklist onsite";
  } else {
    return "⚠ Decklist pending";
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

  const cancellationDeadline = new Date(
    eventDate.getTime() - CANCELLATION_DEADLINE_HOURS * 60 * 60 * 1000
  );

  if (eventDate < now) {
    return "Event has passed";
  }

  if (now > cancellationDeadline) {
    return "Cancellation deadline passed (24h before event)";
  }

  if (registration.status === "cancelled") {
    return "Registration cancelled";
  }

  return "";
}

function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRegistrationDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return "today";
  } else if (diffInHours < 48) {
    return "yesterday";
  } else {
    const days = Math.floor(diffInHours / 24);
    return `${days} days ago`;
  }
}

function getEventTypeName(eventType: string): string {
  const types: Record<string, string> = {
    cup: "League Cup",
    challenge: "League Challenge",
    local: "Local Event",
    custom: "Custom Event",
  };
  return types[eventType] || eventType;
}
</script>

<style scoped>
.event-type-badge {
  padding: 0.125rem 0.5rem;
  font-size: 0.625rem;
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
