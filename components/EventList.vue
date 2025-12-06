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
          <MagnifyingGlassIcon
            class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
          />
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
        <CalendarIcon class="w-12 h-12" />
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
                <BuildingOfficeIcon class="w-4 h-4 flex-shrink-0" />
                <span>{{ stripHtmlTags(event.venue) }}</span>
              </div>

              <div
                v-if="event.location"
                class="flex items-center gap-2 text-gray-600 text-sm mb-0"
              >
                <MapPinIcon class="w-4 h-4 flex-shrink-0" />
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
                <CurrencyDollarIcon class="w-4 h-4 flex-shrink-0" />
                <span>{{ event.cost || "?" }}</span>
              </div>

              <div v-if="hasLocalRegistration(event)" class="ml-auto">
                <NuxtLink
                  :to="`/events/register/${event.id}`"
                  class="flex items-center gap-1 text-blue-600 no-underline font-medium text-sm py-1 px-2 bg-blue-50 rounded border border-blue-200 transition-all duration-200 hover:bg-blue-100 hover:text-blue-700"
                  @click.stop
                >
                  <LinkIcon class="w-4 h-4 flex-shrink-0" />
                  Register
                </NuxtLink>
              </div>
              <div
                v-else-if="event.link && event.link !== '//'"
                class="ml-auto"
              >
                <a
                  :href="event.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center gap-1 text-blue-600 no-underline font-medium text-sm py-1 px-2 bg-blue-50 rounded border border-blue-200 transition-all duration-200 hover:bg-blue-100 hover:text-blue-700"
                  @click.stop
                >
                  <LinkIcon class="w-4 h-4 flex-shrink-0" />
                  Register
                </a>
              </div>
            </div>
          </div>

          <!-- Expand arrow -->
          <div class="text-gray-400 flex-shrink-0">
            <ChevronRightIcon class="w-4 h-4" />
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
            class="bg-none border-none text-gray-500 hover:bg-gray-100 hover:text-gray-700 cursor-pointer p-2 rounded-lg transition-colors duration-200"
          >
            <XMarkIcon class="w-5 h-5" />
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
                  <CurrencyDollarIcon class="w-4 h-4 flex-shrink-0" />
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
                  <BuildingOfficeIcon class="w-4 h-4 flex-shrink-0" />
                  <span class="flex-1">{{
                    stripHtmlTags(selectedEvent.venue)
                  }}</span>
                </div>
                <div
                  v-if="selectedEvent.streetAddress"
                  class="flex items-center gap-2 text-gray-600 text-sm leading-relaxed"
                >
                  <MapPinIcon class="w-4 h-4 flex-shrink-0" />
                  <span class="flex-1">{{
                    stripHtmlTags(selectedEvent.streetAddress)
                  }}</span>
                </div>
                <div
                  v-if="selectedEvent.location"
                  class="flex items-center gap-2 text-gray-600 text-sm leading-relaxed"
                >
                  <GlobeAltIcon class="w-4 h-4 flex-shrink-0" />
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
                    <LinkIcon class="w-4 h-4 flex-shrink-0" />
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
import {
  MagnifyingGlassIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  LinkIcon,
  ChevronRightIcon,
  XMarkIcon,
  GlobeAltIcon,
} from "@heroicons/vue/24/outline";

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

const hasLocalRegistration = (event: ParsedEvent): boolean => {
  return !!(event as any).hasLocalRegistration;
};

const openEventDetails = (event: ParsedEvent) => {
  selectedEvent.value = event;
};

const closeEventDetails = () => {
  selectedEvent.value = null;
};
</script>
