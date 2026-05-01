<template>
  <div
    class="border rounded-xl p-4 hover:shadow-lg transition-all duration-300 group"
    :class="getEntryCardClass(registration)"
  >
    <!-- Game Type Header -->
    <div
      class="mb-2 pb-1.5 border-b border-opacity-20"
      :class="getGameHeaderClass(registration.customEvent.tagType)"
    >
      <h4
        class="text-xs font-semibold uppercase tracking-wide opacity-70"
        :class="getGameHeaderTextClass(registration.customEvent.tagType)"
      >
        {{ getGameTypeLabel(registration.customEvent.tagType || "pokemon") }}
      </h4>
    </div>

    <!-- Event Header -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1 flex-wrap">
          <h3 class="text-lg font-semibold text-white truncate">
            {{ registration.customEvent.name }}
          </h3>
          <span
            v-for="tag in getDisplayTags(
              registration.customEvent.tags || null,
              registration.customEvent.tagType || 'pokemon',
            )"
            :key="tag.value"
            class="event-type-badge"
            :class="tag.badgeClass"
          >
            {{ tag.label }}
          </span>
        </div>

        <div class="flex items-center gap-2 text-sm text-gray-300 mb-2">
          <MapPinIcon class="w-4 h-4 flex-shrink-0" />
          <span class="truncate">{{ registration.customEvent.venue }}</span>
        </div>

        <div class="flex items-center gap-2 text-sm text-gray-300">
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
    <div class="flex items-center justify-between text-sm text-gray-400 mb-4">
      <div class="flex items-center gap-4">
        <!-- Participation Fee -->
        <div
          v-if="hasNumericFee(registration.customEvent.participationFee)"
          class="flex items-center gap-1"
        >
          <CurrencyEuroIcon class="w-4 h-4" />
          <span>{{ registration.customEvent.participationFee }}</span>
        </div>
        <div v-else class="flex items-center gap-1 text-gray-300">
          <CheckCircleIcon class="w-4 h-4" />
          <span>{{ t("registrationMiniEntry.free") }}</span>
        </div>

        <!-- Max Participants -->
        <div class="flex items-center gap-1">
          <UsersIcon class="w-4 h-4" />
          <span>{{
            t("registrationMiniEntry.maxParticipants", {
              count: registration.customEvent.maxParticipants,
            })
          }}</span>
        </div>

        <!-- Decklist Required -->
        <div
          v-if="registration.customEvent.requiresDecklist"
          class="flex items-center gap-1 text-amber-400"
        >
          <DocumentTextIcon class="w-4 h-4" />
          <span>{{ t("registrationMiniEntry.decklistRequired") }}</span>
        </div>
      </div>

      <!-- Registration Date -->
      <div class="flex items-center gap-1 text-xs">
        <CalendarDaysIcon class="w-3 h-3" />
        <span
          >{{
            registration.entryType === "bookmark"
              ? t("registrationMiniEntry.bookmarkedAt")
              : t("registrationMiniEntry.registeredAt")
          }}
          {{ formatRegistrationDate(registration.registeredAt) }}</span
        >
      </div>
    </div>

    <!-- Decklist Status (if required) -->
    <div
      v-if="
        registration.entryType !== 'bookmark' &&
        registration.customEvent.requiresDecklist
      "
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
        {{ t("registrationMiniEntry.completeDecklistHint") }}
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center gap-3">
      <!-- Submit Decklist Button (for reserved status with pending decklist) -->
      <NuxtLink
        v-if="
          registration.entryType !== 'bookmark' &&
          registration.status === 'reserved' &&
          registration.customEvent.requiresDecklist &&
          !registration.decklist &&
          !registration.bringingDecklistOnsite
        "
        to="/dashboard"
        class="group flex-1 flex items-center justify-center px-4 py-2 bg-[#40444b] text-gray-300 text-sm font-semibold rounded-lg hover:bg-[#4f545c] transition-all duration-200 border border-[#202225] hover:border-gray-500 shadow-sm hover:shadow-md"
      >
        {{ t("registrationMiniEntry.submitDecklist") }}
      </NuxtLink>

      <!-- Event Details Button -->
      <a
        v-if="
          registration.entryType === 'bookmark' &&
          registration.externalRegistrationUrl
        "
        :href="registration.externalRegistrationUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="group flex-1 flex items-center justify-center px-4 py-2 bg-[#40444b] text-gray-300 text-sm font-medium rounded-lg hover:bg-[#4f545c] transition-all duration-200 border border-[#202225] hover:border-gray-500"
      >
        {{ t("registrationMiniEntry.eventDetails") }}
      </a>

      <NuxtLink
        v-else
        :to="`/events/${registration.customEvent.id}`"
        class="group flex-1 flex items-center justify-center px-4 py-2 bg-[#40444b] text-gray-300 text-sm font-medium rounded-lg hover:bg-[#4f545c] transition-all duration-200 border border-[#202225] hover:border-gray-500"
      >
        {{ t("registrationMiniEntry.viewEvent") }}
      </NuxtLink>

      <!-- Re-register Button (for cancelled registrations) -->
      <NuxtLink
        v-if="registration.status === 'cancelled'"
        :to="`/events/${registration.customEvent.id}`"
        class="group flex-1 flex items-center justify-center px-4 py-2 bg-[#40444b] text-gray-300 text-sm font-medium rounded-lg hover:bg-[#4f545c] transition-all duration-200 border border-[#202225] hover:border-gray-500"
      >
        {{ t("registrationMiniEntry.reregister") }}
      </NuxtLink>

      <!-- Edit Booking Button - Always show for non-cancelled registrations -->
      <NuxtLink
        v-else-if="
          registration.entryType !== 'bookmark' &&
          registration.status !== 'cancelled'
        "
        :to="`/booking/${registration.id}`"
        class="group flex-1 flex items-center justify-center px-4 py-2 bg-[#40444b] text-gray-300 text-sm font-medium rounded-lg hover:bg-[#4f545c] transition-all duration-200 border border-[#202225] hover:border-gray-500"
      >
        {{ t("registrationMiniEntry.editBooking") }}
      </NuxtLink>

      <button
        v-else-if="registration.entryType === 'bookmark'"
        type="button"
        class="group flex-1 flex items-center justify-center px-4 py-2 bg-[#40444b] text-gray-300 text-sm font-medium rounded-lg hover:bg-[#4f545c] transition-all duration-200 border border-[#202225] hover:border-gray-500"
        @click="confirmRemoveBookmark(registration)"
      >
        Entfernen
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n();
const { getDisplayTags } = useTagDisplay();
const {
  getCardBackgroundClass,
  getGameTypeLabel,
  getGameHeaderClass,
  getGameHeaderTextClass,
} = useRegistrationCardStyle();

import { getEventTypeName } from "~/utils/eventTypes";
import {
  MapPinIcon,
  CalendarIcon,
  CalendarDaysIcon,
  CurrencyEuroIcon,
  CheckCircleIcon,
  UsersIcon,
  DocumentTextIcon,
} from "@heroicons/vue/24/outline";

interface EventRegistration {
  id: string;
  entryType?: "registration" | "bookmark";
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
  externalRegistrationUrl?: string | null;
  customEvent: {
    id: string;
    name: string;
    venue: string;
    maxParticipants: number;
    participationFee: number | string | null;
    description: string | null;
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

const emit = defineEmits<{
  cancel: [registration: EventRegistration];
  remove: [registration: EventRegistration];
}>();

// Helper functions
function getEntryCardClass(registration: EventRegistration): string {
  if (registration.entryType === "bookmark") {
    return "bg-gradient-to-br from-sky-950 via-cyan-950 to-slate-900 border-sky-700/70";
  }

  return getCardBackgroundClass(registration.customEvent.tagType || "pokemon");
}

function confirmRemoveBookmark(registration: EventRegistration) {
  if (registration.entryType !== "bookmark") {
    return;
  }

  const shouldRemove = window.confirm(
    `Vormerkung fuer "${registration.customEvent.name}" entfernen?`,
  );

  if (!shouldRemove) {
    return;
  }

  emit("remove", registration);
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "registered":
      return "bg-emerald-600 text-white border border-emerald-600";
    case "reserved":
      return "bg-[#40444b] text-gray-300 border border-gray-500";
    case "cancelled":
      return "bg-gray-600 text-gray-200 border border-gray-600";
    case "bookmarked":
      return "bg-sky-600 text-white border border-sky-600";
    default:
      return "bg-[#40444b] text-gray-300 border border-gray-500";
  }
}

function getStatusDotClass(status: string): string {
  switch (status) {
    case "registered":
      return "bg-white";
    case "reserved":
      return "bg-gray-600";
    case "cancelled":
      return "bg-gray-900";
    case "bookmarked":
      return "bg-white";
    default:
      return "bg-gray-500";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "registered":
      return t("registrationMiniEntry.statusConfirmed");
    case "reserved":
      return t("registrationMiniEntry.statusReserved");
    case "cancelled":
      return t("registrationMiniEntry.statusCancelled");
    case "bookmarked":
      return t("registrationMiniEntry.statusBookmarked");
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function hasNumericFee(value: number | string | null | undefined): boolean {
  if (typeof value === "number") {
    return value > 0;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0;
  }

  return false;
}

function getDecklistStatusClasses(registration: EventRegistration): string {
  if (registration.decklist) {
    return "bg-[#40444b] border-emerald-500 text-emerald-300";
  } else if (registration.bringingDecklistOnsite) {
    return "bg-[#40444b] border-blue-500 text-blue-300";
  } else {
    return "bg-[#40444b] border-amber-500 text-amber-300";
  }
}

function getDecklistStatusText(registration: EventRegistration): string {
  if (registration.decklist) {
    return t("registrationMiniEntry.decklistUploaded");
  } else if (registration.bringingDecklistOnsite) {
    return t("registrationMiniEntry.decklistOnsite");
  } else {
    return t("registrationMiniEntry.decklistPending");
  }
}

function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(
    locale.value.startsWith("de") ? "de-DE" : "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function formatRegistrationDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return t("registrationMiniEntry.relativeToday");
  } else if (diffInHours < 48) {
    return t("registrationMiniEntry.relativeYesterday");
  } else {
    const days = Math.floor(diffInHours / 24);
    return t("registrationMiniEntry.relativeDaysAgo", { days });
  }
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

/* Tag type badges */
.event-type-badge.type-league_cup {
  background-color: #bbf7d0;
  color: #166534;
}

.event-type-badge.type-league_challenge {
  background-color: #bfdbfe;
  color: #1e40af;
}

.event-type-badge.type-local_tournament,
.event-type-badge.type-store_tournament {
  background-color: #e0f2fe;
  color: #075985;
}

.event-type-badge.type-premier_challenge,
.event-type-badge.type-special_event,
.event-type-badge.type-custom {
  background-color: #fed7aa;
  color: #9a3412;
}

.event-type-badge.type-prerelease,
.event-type-badge.type-pre_release {
  background-color: #fef3c7;
  color: #92400e;
}

.event-type-badge.type-midseason_showdown,
.event-type-badge.type-regional_championships {
  background-color: #ddd6fe;
  color: #5b21b6;
}

/* Game badges */
.event-type-badge.game-pokemon {
  background-color: #fef3c7;
  color: #92400e;
}

.event-type-badge.game-riftbound {
  background-color: #fee2e2;
  color: #991b1b;
}

.event-type-badge.game-generic {
  background-color: #e5e7eb;
  color: #374151;
}

/* Format badges */
.event-type-badge.format-standard,
.event-type-badge.format-expanded,
.event-type-badge.format-unlimited {
  background-color: #cffafe;
  color: #155e75;
}

/* Host badges */
.event-type-badge.host {
  background-color: #f3e8ff;
  color: #6b21a8;
}
</style>
