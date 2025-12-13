<template>
  <div class="w-full h-full">
    <div
      class="p-4 sm:p-6 flex flex-col justify-center items-center h-full min-h-[400px]"
    >
      <div
        class="relative w-full calendar-wrapper flex flex-col justify-center items-center flex-1"
      >
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

        <!-- Event Details Popover -->
        <EventDetailsPopover
          v-if="selectedDateEvents.length > 0"
          :events="selectedDateEvents"
          :formatted-date="formatSelectedDate"
          @close="closeEventDetails"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, unref, watch } from "vue";

// Explicit component import due to nested folder structure
import EventDetailsPopover from "./EventDetailsPopover.vue";

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
    // Note: Hidden events are already filtered out at the server level in applyOverrides
    const allEvents = unref(eventStore.events);

    const regularEvents = allEvents.map((event: ExternalEvent) => {
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
    });

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
  // Note: Hidden events are already filtered out at server level
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
</script>

<style scoped>
.calendar-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.calendar-wrapper :deep(.vc-container) {
  width: 100%;
  max-width: 620px;
  margin: 0 auto;
  border: none;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

:deep(.vc-pane-layout) {
  justify-content: center;
}

/* Modern Calendar Styles - Using :deep() for third-party component styling */
:deep(.vc-calendar) {
  font-size: 1.08rem;
  --vc-day-content-height: 2.8rem;
  --vc-day-content-width: 2.8rem;
  --vc-border-radius: 0.75rem;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  box-shadow: 0 6px 32px 0 rgba(60, 60, 120, 0.1);
  border: none;
  padding: 1.5rem 1rem;
}

:deep(.vc-title),
:deep(.vc-weekday) {
  font-size: 1.25rem;
  font-weight: 700;
  color: #4f46e5;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 0 #fff;
}

:deep(.vc-weekday) {
  text-transform: uppercase;
  font-size: 0.95rem;
  color: #6366f1;
}

:deep(.vc-popover-content) {
  font-size: 1rem;
  padding: 1rem 1.25rem;
  min-width: 220px;
  max-width: 340px;
  white-space: pre-line;
  background: #fff;
  border: none;
  border-radius: 0.75rem;
  box-shadow: 0 8px 32px rgba(60, 60, 120, 0.18);
  z-index: 1000;
}

:deep(.vc-day-content) {
  cursor: pointer;
  border-radius: 0.75rem;
  background: #fff;
  transition: box-shadow 0.2s, background 0.2s, transform 0.2s;
  box-shadow: 0 1px 4px rgba(60, 60, 120, 0.07);
  font-weight: 500;
  color: #312e81;
}

:deep(.vc-day-content:hover) {
  background: linear-gradient(90deg, #6366f1 0%, #a5b4fc 100%);
  color: #fff;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.15);
  transform: scale(1.07);
}

:deep(.vc-day-content:active) {
  transform: scale(0.97);
  background: #ede9fe;
}

/* Event day highlights - targeting VCalendar's highlight structure */
:deep(.vc-highlight.has-events) {
  background-color: #dbeafe !important; /* blue-100 */
}

:deep(.vc-highlight.has-custom-events) {
  background-color: #e9d5ff !important; /* purple-100 */
}

:deep(.vc-day.is-not-in-month .vc-highlight) {
  opacity: 0.3;
}

:deep(.event-dot) {
  width: 10px;
  height: 10px;
  margin: 2px;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(60, 60, 120, 0.1);
}

/* Specific dot colors for each event type */
:deep(.event-external) {
  background-color: #ef4444 !important;
}
:deep(.event-cup) {
  background-color: #ef4444 !important;
}
:deep(.event-local) {
  background-color: #22c55e !important;
}
:deep(.event-challenge) {
  background-color: #6366f1 !important;
}
:deep(.event-custom) {
  background-color: #a21caf !important;
}

/* Multiple dots arrangement */
:deep(.vc-day-dots) {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 4px;
}

/* Make days with events more clickable */
:deep(.vc-day.has-events .vc-day-content) {
  position: relative;
}

@media (max-width: 640px) {
  .calendar-wrapper {
    padding: 0;
  }
  :deep(.vc-calendar) {
    font-size: 0.98rem;
    --vc-day-content-height: 2.1rem;
    --vc-day-content-width: 2.1rem;
    padding: 0.5rem 0.25rem;
  }
  :deep(.vc-title),
  :deep(.vc-weekday) {
    font-size: 1.05rem;
  }
}
</style>
