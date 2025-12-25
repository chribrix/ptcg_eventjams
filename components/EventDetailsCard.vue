<template>
  <aside
    v-if="eventDetails"
    class="bg-white rounded-2xl shadow-lg p-6 mt-8 mb-6"
  >
    <h1 class="text-2xl font-bold text-gray-900 mb-4">
      {{ eventDetails.name }}
    </h1>

    <div class="space-y-4">
      <div class="flex items-start gap-3">
        <svg
          class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          ></path>
        </svg>
        <div>
          <div class="text-xs text-gray-500 font-medium uppercase">
            Date & Time
          </div>
          <div class="text-sm text-gray-900 font-medium">
            {{ formatEventDate(eventDetails.eventDate) }}
          </div>
        </div>
      </div>

      <div class="flex items-start gap-3">
        <svg
          class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          ></path>
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          ></path>
        </svg>
        <div>
          <div class="text-xs text-gray-500 font-medium uppercase">Venue</div>
          <div class="text-sm text-gray-900 font-medium">
            {{ eventDetails.venue }}
          </div>
        </div>
      </div>

      <div class="flex items-start gap-3">
        <svg
          class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          ></path>
        </svg>
        <div>
          <div class="text-xs text-gray-500 font-medium uppercase">
            Participants
          </div>
          <div class="text-sm text-gray-900 font-medium">
            <span class="text-green-600">
              {{ eventDetails.registrationCount }}
            </span>
            <span class="text-gray-400"
              >/{{ eventDetails.maxParticipants }}</span
            >
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="eventDetails.requiresDecklist"
      class="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg"
    >
      <div class="flex items-center gap-2 text-amber-800">
        <svg
          class="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          ></path>
        </svg>
        <span class="text-xs font-semibold">Decklist Required</span>
      </div>
    </div>

    <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p class="text-sm text-blue-900 font-medium text-center">
        👉 Log in or create an account to reserve your spot
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
interface EventDetails {
  name: string;
  eventDate: string;
  venue: string;
  registrationCount: number;
  maxParticipants: number;
  requiresDecklist?: boolean;
}

defineProps<{
  eventDetails: EventDetails | null;
}>();

const formatEventDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
</script>
