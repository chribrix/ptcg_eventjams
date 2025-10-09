<template>
  <div class="w-full flex flex-col justify-center items-center gap-4">
    <div class="relative w-full h-full">
      <!-- Loading indicator overlay -->
      <div
        v-if="isLoading"
        class="absolute inset-0 bg-white/80 flex justify-center items-center z-10 rounded-lg"
      >
        <div class="flex flex-col items-center gap-3">
          <div
            class="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"
          ></div>
          <span class="text-sm text-gray-600 font-medium"
            >Loading events...</span
          >
        </div>
      </div>

      <ClientOnly>
        <VCalendar
          expanded
          :attributes="calendarAttributes"
          :columns="1"
          :rows="2"
          :min-date="today"
          :max-date="maxDate"
          :show-pane="false"
          @dayclick="onDayClick"
        />
        <template #fallback>
          <div class="flex flex-col items-center justify-center h-96 gap-3">
            <div
              class="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"
            ></div>
            <span class="text-sm text-gray-600 font-medium"
              >Initializing calendar component...</span
            >
          </div>
        </template>
      </ClientOnly>

      <!-- Event Details Modal/Panel -->
      <div
        v-if="selectedDateEvents.length > 0"
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
            <h3 class="text-xl font-semibold text-gray-900 m-0">
              Events on {{ formatSelectedDate }}
            </h3>
            <button
              @click="closeEventDetails"
              class="bg-none border-none text-2xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 cursor-pointer p-1 rounded transition-colors duration-200"
            >
              &times;
            </button>
          </div>
          <div class="px-6 py-4 overflow-y-auto flex-1">
            <div
              v-for="event in selectedDateEvents"
              :key="event.id"
              class="border border-gray-200 rounded-lg p-4 mb-3 transition-all duration-200 hover:shadow-md hover:border-gray-300 last:mb-0"
              :class="{
                'border-l-4 border-l-purple-600 bg-gradient-to-r from-purple-50 to-white hover:from-purple-100 hover:to-gray-50':
                  isCustomEvent(event),
              }"
            >
              <div class="flex justify-between items-center mb-3">
                <div
                  class="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
                  :class="getEventBadgeClasses(event)"
                >
                  {{ isCustomEvent(event) ? "Custom Event" : event.type }}
                </div>
                <div class="flex items-center gap-2">
                  <div
                    v-if="getEventCost(event) !== undefined"
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
                    {{ formatEventCost(event) }}
                  </div>
                  <div
                    v-if="getEventTime(event)"
                    class="text-base font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full"
                  >
                    {{ getEventTime(event) }}
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <div
                    v-if="event.venue"
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
                    <span class="flex-1">{{ stripHtmlTags(event.venue) }}</span>
                  </div>
                  <div
                    v-if="event.streetAddress"
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
                      stripHtmlTags(event.streetAddress)
                    }}</span>
                  </div>
                  <div
                    v-if="event.location"
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
                      >{{ stripHtmlTags(event.location)
                      }}{{
                        event.country ? `, ${stripHtmlTags(event.country)}` : ""
                      }}</span
                    >
                  </div>
                  <div
                    v-if="isCustomEvent(event)"
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      ></path>
                    </svg>
                    <span class="flex-1">{{
                      getRegistrationCount(event)
                    }}</span>
                  </div>
                </div>

                <div class="flex flex-col gap-2">
                  <div
                    v-if="isCustomEvent(event)"
                    class="flex items-center gap-2 text-gray-600 text-sm leading-relaxed"
                  >
                    <NuxtLink
                      :to="`/events/register/${event.id}`"
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
                          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                        ></path>
                      </svg>
                      <span>Register</span>
                    </NuxtLink>
                  </div>
                  <div
                    v-else-if="event.link && event.link !== '//'"
                    class="flex items-center gap-2 text-gray-600 text-sm leading-relaxed"
                  >
                    <a
                      :href="event.link"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, unref, watch } from "vue";

interface CalendarEvent {
  id: number | string;
  title: string;
  start: string;
  end?: string;
  type: "external" | "cup" | "local" | "challenge" | "custom";
  isCustom?: boolean;
  customEventData?: CustomEvent;
}

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
  isCustomEvent?: boolean;
}

interface CustomEvent {
  id: string | number;
  name: string;
  eventDate: string;
  venue: string;
  maxParticipants: number;
  participationFee: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  registrationCount?: number;
}

interface ExternalEvent {
  id: string;
  title: string;
  dateTime: string;
  type: string;
  venue: string;
  location: string;
  country: string;
  link: string;
  cost?: string;
  streetAddress?: string;
  icon?: string;
  time?: string;
}

const today = new Date();
const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);

const typeColors: Record<CalendarEvent["type"], string> = {
  external: "#dc2626", // red-600
  cup: "#dc2626", // red-600 (cups get red dots)
  local: "#16a34a", // green-600 (friendly tournaments get green dots)
  challenge: "#2563eb", // blue-600 (challenges get blue dots)
  custom: "#9333ea", // purple-600 (custom events get purple dots)
};

const typeLabels: Record<CalendarEvent["type"], string> = {
  external: "External Tournament",
  cup: "Cup Tournament",
  local: "Local Event",
  challenge: "Challenge",
  custom: "Custom Event",
};

// Helper function to handle client-side hydration
const ensureClientSide = <T>(
  clientCallback: () => T,
  fallback: T = [] as T
): T => {
  return import.meta.client ? clientCallback() : fallback;
};

// State for event details modal
const selectedDate = ref<string | null>(null);
const selectedDateEvents = ref<ParsedEvent[]>([]);

// Use the event store composable
const eventStore = useEventStore();

// Custom events data
const customEvents = ref<CustomEvent[]>([]);
const customEventsLoading = ref<boolean>(false);

// Combined loading state - use ref and manual updates to avoid reactivity issues
const isLoading = ref(false);

// Watch individual loading states and manually update combined state
watch(
  () => eventStore.isLoading,
  (newVal) => {
    const storeLoadingValue = unref(newVal);
    isLoading.value =
      Boolean(storeLoadingValue) || Boolean(customEventsLoading.value);
  },
  { immediate: true }
);

watch(
  customEventsLoading,
  (newVal) => {
    const storeLoadingValue = unref(eventStore.isLoading);
    isLoading.value = Boolean(storeLoadingValue) || Boolean(newVal);
  },
  { immediate: true }
);

// Fetch custom events from public endpoint
const fetchCustomEvents = async (): Promise<void> => {
  try {
    customEventsLoading.value = true;
    const response = await $fetch<{ success: boolean; events: CustomEvent[] }>(
      "/api/events/custom"
    );

    if (response.success && response.events) {
      customEvents.value = response.events;
    } else {
      customEvents.value = [];
    }
  } catch (error) {
    console.error("Failed to load custom events:", error);
    customEvents.value = [];
  } finally {
    customEventsLoading.value = false;
  }
};

// Load events on mount
onMounted(async (): Promise<void> => {
  try {
    // Only fetch events on client-side to avoid hydration issues
    ensureClientSide(async () => {
      await Promise.all([eventStore.fetchEvents(), fetchCustomEvents()]);
    }, undefined);
  } catch (error) {
    console.error("Failed to load events:", error);
  }
});

const events = computed(() => {
  return ensureClientSide(() => {
    // Convert ParsedEvents to CalendarEvents for the calendar display
    const regularEvents = unref(eventStore.events).map(
      (event: ExternalEvent) => {
        // Determine event type based on the original type
        let type: CalendarEvent["type"] = "local";
        if (event.type?.toLowerCase().includes("cup")) {
          type = "cup";
        } else if (event.type?.toLowerCase().includes("challenge")) {
          type = "challenge";
        } else if (
          event.type?.toLowerCase().includes("tournament") &&
          !event.type?.toLowerCase().includes("friendly")
        ) {
          type = "external";
        }

        return {
          id: parseInt(event.id.replace(/[^0-9]/g, "")) || Math.random(),
          title: event.title || event.type || "Event",
          start: event.dateTime ? event.dateTime.split(" ")[0] : "", // Extract date part
          type,
          isCustom: false,
        };
      }
    );

    // Convert custom events to CalendarEvents
    const customCalendarEvents = customEvents.value.map(
      (event: CustomEvent) => {
        const eventDate = new Date(event.eventDate);
        const dateString = eventDate.toISOString().split("T")[0]; // Get YYYY-MM-DD format

        return {
          id: event.id,
          title: event.name,
          start: dateString,
          type: "custom" as CalendarEvent["type"],
          isCustom: true,
          customEventData: event, // Store full custom event data for popover
        };
      }
    );

    return [...regularEvents, ...customCalendarEvents];
  }, []);
});

const calendarAttributes = computed(() => {
  return ensureClientSide(() => {
    const eventsByDate = new Map<string, CalendarEvent[]>();

    // Group events by date
    events.value.forEach((event) => {
      const dateKey = event.start;
      if (!eventsByDate.has(dateKey)) {
        eventsByDate.set(dateKey, []);
      }
      eventsByDate.get(dateKey)!.push(event);
    });

    // VCalendar attributes - using Record<string, any> for compatibility with complex VCalendar types
    const attributes: Array<Record<string, unknown>> = [];

    // Create attributes for each date with events
    eventsByDate.forEach((dayEvents, dateKey) => {
      const date = new Date(dateKey);

      // Add dots for each event type on this date
      const eventTypes = [...new Set(dayEvents.map((e) => e.type))];

      eventTypes.forEach((type, _) => {
        const eventsOfType = dayEvents.filter((e) => e.type === type);

        attributes.push({
          key: `${dateKey}-${type}`,
          dates: date,
          dot: {
            color: typeColors[type],
            class: `event-dot event-${type}`,
          },
          popover: {
            label: `${typeLabels[type]} (${eventsOfType.length})`,
            content: eventsOfType.map((e) => e.title).join("\n"),
            visibility: "hover",
          },
        });
      });

      // Add a highlight for the entire day if there are events
      if (dayEvents.length > 0) {
        // Check if there are custom events on this day
        const hasCustomEvents = dayEvents.some((event) => event.isCustom);

        attributes.push({
          key: `${dateKey}-highlight`,
          dates: date,
          highlight: {
            color: hasCustomEvents ? "purple" : "blue",
            fillMode: "light",
            class: hasCustomEvents ? "has-custom-events" : "has-events",
          },
        });
      }
    });

    return attributes;
  }, []);
});

interface DayClickEvent {
  id: string;
  date: Date;
}

// Handle day click
const onDayClick = (day: DayClickEvent) => {
  const clickedDate = day.id; // This should be in YYYY-MM-DD format
  selectedDate.value = clickedDate;

  // Find original events for this date using the store and mark them as regular events
  const regularEventsForDate = unref(eventStore.events)
    .filter((event: ExternalEvent) => {
      if (event.dateTime) {
        const eventDate = event.dateTime.split(" ")[0]; // Extract YYYY-MM-DD part
        return eventDate === clickedDate;
      }
      return false;
    })
    .map(
      (event: ExternalEvent): ParsedEvent => ({
        ...event,
        isCustomEvent: false, // Explicitly mark as regular event
      })
    );

  // Find custom events for this date and mark them as custom events
  const customEventsForDate = customEvents.value
    .filter((event: CustomEvent) => {
      const eventDate = new Date(event.eventDate).toISOString().split("T")[0];
      return eventDate === clickedDate;
    })
    .map(
      (event: CustomEvent): ParsedEvent => ({
        id: String(event.id),
        title: event.name,
        dateTime: event.eventDate,
        type: "Custom Event",
        venue: event.venue,
        location: "",
        country: "",
        link: "",
        isCustomEvent: true, // Explicitly mark as custom event
      })
    );

  // Combine all events for the selected date - custom events first
  selectedDateEvents.value = [...customEventsForDate, ...regularEventsForDate];
};

// Close event details modal
const closeEventDetails = (): void => {
  selectedDate.value = null;
  selectedDateEvents.value = [];
};

// Format selected date for display
const formatSelectedDate = computed(() => {
  if (!selectedDate.value) return "";
  const date = new Date(selectedDate.value);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

// Format event time
const formatEventTime = (event: ParsedEvent): string => {
  // First try to use the separate time field if available
  if (event.time) {
    return event.time;
  }

  // Fallback to extracting from dateTime if it contains time
  if (event.dateTime && event.dateTime.includes(" ")) {
    const timePart = event.dateTime.split(" ")[1]; // Extract HH:MM part
    if (timePart) {
      return timePart.substring(0, 5); // Get HH:MM from HH:MM:SS
    }
  }

  // Last fallback - try to extract from title
  if (event.title) {
    const timeMatch = event.title.match(/(\d{2}:\d{2})/);
    if (timeMatch) {
      return timeMatch[1];
    }
  }

  return "All Day";
};

const stripHtmlTags = (html: string): string => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
};

// Helper functions for event display
const isCustomEvent = (event: ParsedEvent): boolean => {
  return !!event.isCustomEvent;
};

const getEventBadgeClasses = (event: ParsedEvent): string => {
  // Custom events always get purple styling
  if (isCustomEvent(event)) {
    return "bg-purple-100 text-purple-800";
  }

  // Regular events get different colors based on their icon/type
  switch (event.icon) {
    case "cup":
      return "bg-red-100 text-red-800";
    case "chall":
      return "bg-blue-100 text-blue-800";
    case "pre":
      return "bg-yellow-100 text-yellow-800";
    case "friendly":
    default:
      return "bg-green-100 text-green-800"; // Default for friendly events or no icon
  }
};

const getEventCost = (event: ParsedEvent): number | string | undefined => {
  if (isCustomEvent(event)) {
    // For custom events, we need to find the original event to get participationFee
    const customEvent = customEvents.value.find(
      (ce) => String(ce.id) === event.id
    );
    return customEvent?.participationFee;
  }
  return event.cost;
};

const formatEventCost = (event: ParsedEvent): string => {
  const cost = getEventCost(event);
  if (cost === undefined || cost === null) return "?";
  if (isCustomEvent(event)) {
    const numericCost = typeof cost === "string" ? parseFloat(cost) : cost;
    return numericCost > 0 ? `€${numericCost}` : "Free";
  }
  return String(cost) || "?";
};

const getEventTime = (event: ParsedEvent): string => {
  if (isCustomEvent(event)) {
    // For custom events, we need to find the original event to get the eventDate
    const customEvent = customEvents.value.find(
      (ce) => String(ce.id) === event.id
    );
    if (customEvent) {
      const eventDate = new Date(customEvent.eventDate);
      return eventDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    return "All Day";
  }
  return formatEventTime(event);
};

const getRegistrationCount = (event: ParsedEvent): string => {
  if (isCustomEvent(event)) {
    const customEvent = customEvents.value.find(
      (ce) => String(ce.id) === event.id
    );
    if (customEvent) {
      const registeredCount = customEvent.registrationCount || 0;
      return `${registeredCount}/${customEvent.maxParticipants} registered`;
    }
  }
  return "";
};
</script>

<style scoped>
/* Calendar Styles - Using :deep() for third-party component styling */
:deep(.vc-calendar) {
  font-size: 1.1rem;
  --vc-day-content-height: 3rem;
  --vc-day-content-width: 3rem;
  --vc-border-radius: 0.5rem;
}

:deep(.vc-title),
:deep(.vc-weekday) {
  font-size: 1.3rem;
  font-weight: bold;
  color: #2563eb;
}

:deep(.vc-popover-content) {
  font-size: 0.9rem;
  padding: 0.75rem 1rem;
  min-width: 200px;
  max-width: 300px;
  white-space: pre-line;
  background-color: white;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

:deep(.vc-day-content:hover) {
  background-color: #f3f4f6;
  transform: scale(1.05);
  transition: all 0.2s ease;
}

:deep(.has-events) {
  border: 2px solid #3b82f6;
  border-radius: 0.5rem;
}

:deep(.has-custom-events) {
  border: 2px solid #9333ea;
  border-radius: 0.5rem;
  background-color: #f3e8ff !important;
}

:deep(.event-dot) {
  width: 8px;
  height: 8px;
  margin: 1px;
}

/* Specific dot colors for each event type */
:deep(.event-external) {
  background-color: #dc2626 !important;
}

:deep(.event-cup) {
  background-color: #dc2626 !important;
}

:deep(.event-local) {
  background-color: #16a34a !important;
}

:deep(.event-challenge) {
  background-color: #2563eb !important;
}

:deep(.event-custom) {
  background-color: #9333ea !important;
}

/* Alternative selectors in case VCalendar uses different structure */
:deep(.event-external .vc-dot) {
  background-color: #dc2626 !important;
}

:deep(.event-cup .vc-dot) {
  background-color: #dc2626 !important;
}

:deep(.event-local .vc-dot) {
  background-color: #16a34a !important;
}

:deep(.event-challenge .vc-dot) {
  background-color: #2563eb !important;
}

:deep(.event-custom .vc-dot) {
  background-color: #9333ea !important;
}

/* Multiple dots arrangement */
:deep(.vc-day-dots) {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 2px;
}

/* Hover effects for days with events */
:deep(.vc-day.has-events .vc-day-content) {
  cursor: pointer;
  position: relative;
}

:deep(.vc-day.has-events .vc-day-content::after) {
  content: "";
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background-color: #3b82f6;
  border-radius: 50%;
}

/* Make days with events more clickable */
:deep(.vc-day-content) {
  cursor: pointer;
  transition: all 0.2s ease;
}

:deep(.vc-day-content:active) {
  transform: scale(0.95);
}
</style>
