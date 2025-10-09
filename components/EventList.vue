<template>
  <div class="w-[60vw] h-[50vh] flex flex-col gap-4">
    <div
      v-if="error"
      class="flex justify-center items-center h-48 text-lg text-red-600 bg-red-50 border border-red-200 rounded-lg p-4"
    >
      Error loading events: {{ error }}
    </div>

    <!-- Header with filters and search -->
    <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">All Events</h2>

      <!-- Search and Filter Controls -->
      <div class="flex gap-4 items-center">
        <div class="relative flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search events..."
            class="w-full py-2 px-3 pl-10 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors duration-200"
          />
          <svg
            class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            ></path>
          </svg>
        </div>

        <select
          v-model="selectedType"
          class="py-2 px-3 border border-gray-300 rounded-md text-sm bg-white cursor-pointer min-w-[150px] focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">All Types</option>
          <option value="League Cup">League Cup</option>
          <option value="League Challenge">League Challenge</option>
          <option value="GO Challenge">GO Challenge</option>
          <option value="Pre Release">Pre Release</option>
          <option value="nonpremier TCG">Friendly</option>
        </select>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center h-48">
      <div class="flex flex-col items-center gap-3">
        <div
          class="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"
        ></div>
        <span class="text-sm text-gray-600 font-medium">Loading events...</span>
      </div>
    </div>

    <!-- Event List -->
    <div v-else class="flex-1 overflow-hidden flex flex-col">
      <div
        v-if="filteredEvents.length === 0"
        class="flex flex-col items-center justify-center h-48 text-gray-500 gap-4"
      >
        <svg
          class="w-12 h-12"
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
        <p>No events found matching your criteria</p>
      </div>

      <div
        v-else
        class="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <div
          v-for="event in filteredEvents"
          :key="event.id"
          class="flex items-center p-4 border-b border-gray-100 cursor-pointer transition-all duration-200 gap-4 hover:bg-gray-50 hover:translate-x-1 last:border-b-0"
          @click="openEventDetails(event)"
        >
          <!-- Date badge -->
          <div
            class="flex flex-col items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-lg flex-shrink-0"
          >
            <div class="text-xl font-bold leading-none">
              {{ formatDay(event.dateTime) }}
            </div>
            <div class="text-xs font-medium uppercase tracking-wide">
              {{ formatMonth(event.dateTime) }}
            </div>
          </div>

          <!-- Event content -->
          <div class="flex-1 min-w-0">
            <div class="mb-2">
              <div class="flex items-center gap-3 mb-2">
                <div
                  class="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
                  :class="{
                    'bg-red-100 text-red-800': event.icon === 'cup',
                    'bg-blue-100 text-blue-800': event.icon === 'chall',
                    'bg-yellow-100 text-yellow-800': event.icon === 'pre',
                    'bg-green-100 text-green-800':
                      event.icon === 'friendly' || !event.icon,
                  }"
                >
                  {{ event.type }}
                </div>
                <div
                  v-if="event.time"
                  class="text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded"
                >
                  {{ event.time }}
                </div>
              </div>

              <div class="flex items-center gap-2 text-gray-600 text-sm mb-1">
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
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4m0 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m0 0H9"
                  ></path>
                </svg>
                <span>{{ stripHtmlTags(event.venue) }}</span>
              </div>

              <div
                v-if="event.location"
                class="flex items-center gap-2 text-gray-600 text-sm mb-0"
              >
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
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  ></path>
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  ></path>
                </svg>
                <span
                  >{{ stripHtmlTags(event.location)
                  }}{{
                    event.country ? `, ${stripHtmlTags(event.country)}` : ""
                  }}</span
                >
              </div>
            </div>

            <!-- Event details row -->
            <div class="flex items-center gap-4 mt-2">
              <div
                v-if="event.cost !== undefined"
                class="flex items-center gap-1 text-sm font-semibold text-green-700"
              >
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
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  ></path>
                </svg>
                <span>{{ event.cost || "?" }}</span>
              </div>

              <div v-if="event.link && event.link !== '//'" class="ml-auto">
                <a
                  :href="event.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center gap-1 text-blue-600 no-underline font-medium text-sm py-1 px-2 bg-blue-50 rounded border border-blue-200 transition-all duration-200 hover:bg-blue-100 hover:text-blue-700"
                  @click.stop
                >
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
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    ></path>
                  </svg>
                  Register
                </a>
              </div>
            </div>
          </div>

          <!-- Expand arrow -->
          <div class="text-gray-400 flex-shrink-0">
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
                d="M9 5l7 7-7 7"
              ></path>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Event Details Modal -->
    <div
      v-if="selectedEvent"
      class="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
      @click="closeEventDetails"
    >
      <div
        class="bg-white rounded-xl shadow-xl max-w-2xl max-h-[80vh] w-[90%] overflow-hidden flex flex-col"
        @click.stop
      >
        <div
          class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50"
        >
          <h3 class="text-xl font-semibold text-gray-900 m-0">Event Details</h3>
          <button
            @click="closeEventDetails"
            class="bg-none border-none text-2xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 cursor-pointer p-1 rounded transition-colors duration-200"
          >
            &times;
          </button>
        </div>
        <div class="px-6 py-4 overflow-y-auto flex-1">
          <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex justify-between items-center mb-3">
              <div
                class="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
                :class="{
                  'bg-green-100 text-green-800':
                    selectedEvent.icon === 'friendly' || !selectedEvent.icon,
                  'bg-red-100 text-red-800': selectedEvent.icon === 'cup',
                  'bg-blue-100 text-blue-800': selectedEvent.icon === 'chall',
                  'bg-yellow-100 text-yellow-800': selectedEvent.icon === 'pre',
                }"
              >
                {{ selectedEvent.type }}
              </div>
              <div class="flex items-center gap-2">
                <div
                  v-if="selectedEvent.cost !== undefined"
                  class="flex items-center gap-1 text-sm font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full border border-green-200"
                >
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
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    ></path>
                  </svg>
                  {{ selectedEvent.cost || "?" }}
                </div>
                <div
                  v-if="selectedEvent.time"
                  class="text-base font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full"
                >
                  {{ selectedEvent.time }}
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex flex-col gap-2">
                <div
                  v-if="selectedEvent.venue"
                  class="flex items-center gap-2 text-gray-600 text-sm leading-relaxed"
                >
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
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4m0 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m0 0H9"
                    ></path>
                  </svg>
                  <span class="flex-1">{{
                    stripHtmlTags(selectedEvent.venue)
                  }}</span>
                </div>
                <div
                  v-if="selectedEvent.streetAddress"
                  class="flex items-center gap-2 text-gray-600 text-sm leading-relaxed"
                >
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
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    ></path>
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    ></path>
                  </svg>
                  <span class="flex-1">{{
                    stripHtmlTags(selectedEvent.streetAddress)
                  }}</span>
                </div>
                <div
                  v-if="selectedEvent.location"
                  class="flex items-center gap-2 text-gray-600 text-sm leading-relaxed"
                >
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
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <span class="flex-1"
                    >{{ stripHtmlTags(selectedEvent.location)
                    }}{{
                      selectedEvent.country
                        ? `, ${stripHtmlTags(selectedEvent.country)}`
                        : ""
                    }}</span
                  >
                </div>
              </div>

              <div class="flex flex-col gap-2">
                <div
                  v-if="selectedEvent.link && selectedEvent.link !== '//'"
                  class="flex items-center gap-2 text-gray-600 text-sm leading-relaxed"
                >
                  <a
                    :href="selectedEvent.link"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center gap-2 text-blue-600 no-underline font-medium text-sm px-3 py-2 bg-blue-50 rounded-md transition-all duration-200 border border-blue-200 hover:bg-blue-100 hover:text-blue-700"
                  >
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
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      ></path>
                    </svg>
                    <span>Register</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

interface ParsedEvent {
  id: string;
  title: string;
  dateTime: string;
  time?: string;
  type: string;
  venue: string;
  location: string;
  country: string;
  link: string;
  cost?: string;
  streetAddress?: string;
  icon?: string;
}

// Reactive state
const searchQuery = ref("");
const selectedType = ref("");
const selectedEvent = ref<ParsedEvent | null>(null);
const events = ref<ParsedEvent[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Load events on mount
onMounted(async () => {
  await fetchEvents();
});

const fetchEvents = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    console.log("Fetching events from /api/events...");
    const response = await $fetch<{ events: ParsedEvent[] }>("/api/events");
    events.value = response.events || [];
    console.log(`Loaded ${events.value.length} events`);
  } catch (err) {
    console.error("Failed to load events:", err);
    error.value = err instanceof Error ? err.message : "Failed to load events";
  } finally {
    isLoading.value = false;
  }
};

// Computed properties
const filteredEvents = computed(() => {
  let filteredEvents = [...events.value]; // Create a mutable copy

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filteredEvents = filteredEvents.filter(
      (event: ParsedEvent) =>
        event.title?.toLowerCase().includes(query) ||
        event.type?.toLowerCase().includes(query) ||
        event.venue?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query)
    );
  }

  // Apply type filter
  if (selectedType.value) {
    filteredEvents = filteredEvents.filter(
      (event: ParsedEvent) => event.type === selectedType.value
    );
  }

  // Sort by date and time
  return filteredEvents.sort((a: ParsedEvent, b: ParsedEvent) => {
    const dateTimeA = new Date(a.dateTime + (a.time ? ` ${a.time}` : ""));
    const dateTimeB = new Date(b.dateTime + (b.time ? ` ${b.time}` : ""));
    return dateTimeA.getTime() - dateTimeB.getTime();
  });
});

// Methods
const formatDay = (dateString: string) => {
  const date = new Date(dateString);
  return date.getDate().toString();
};

const formatMonth = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short" });
};

const stripHtmlTags = (html: string) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
};

const openEventDetails = (event: ParsedEvent) => {
  selectedEvent.value = event;
};

const closeEventDetails = () => {
  selectedEvent.value = null;
};
</script>
