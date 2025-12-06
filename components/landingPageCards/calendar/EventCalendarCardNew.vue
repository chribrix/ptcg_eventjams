<template>
  <div class="w-full h-full">
    <div
      class="p-4 sm:p-6 flex flex-col justify-center items-center h-full min-h-[400px]"
    >
      <div
        class="relative w-full calendar-wrapper flex flex-col justify-center items-center flex-1"
      >
        <!-- Loading indicator -->
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
            @dayclick="onDayClick"
          />
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
import { ref, computed, onMounted } from "vue";
import EventDetailsPopover from "./EventDetailsPopover.vue";
import { EVENT_COLORS } from "~/utils/eventColors";

interface CalendarEvent {
  id: number | string;
  title: string;
  start: string;
  type: "external" | "cup" | "local" | "challenge" | "custom";
  isCustom?: boolean;
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
  registrationCount?: number;
}

const today = new Date();
const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);

const eventStore = useEventStore();
const customEvents = ref<CustomEvent[]>([]);
const isLoading = ref(false);
const selectedDate = ref<string | null>(null);
const selectedDateEvents = ref<ParsedEvent[]>([]);

// Fetch custom events
const fetchCustomEvents = async () => {
  try {
    const response = await $fetch<{ success: boolean; events: CustomEvent[] }>(
      "/api/events/custom"
    );
    if (response.success && response.events) {
      customEvents.value = response.events;
    }
  } catch (error) {
    console.error("Failed to load custom events:", error);
  }
};

onMounted(async () => {
  console.log("EventCalendarCardNew: onMounted - starting fetch");
  console.log(
    "EventCalendarCardNew: eventStore.events before fetch:",
    eventStore.events
  );
  console.log(
    "EventCalendarCardNew: eventStore type:",
    typeof eventStore.events
  );

  isLoading.value = true;
  try {
    await Promise.all([eventStore.fetchEvents(), fetchCustomEvents()]);
    console.log("EventCalendarCardNew: After fetchEvents completed");
    console.log(
      "EventCalendarCardNew: eventStore.events after fetch:",
      eventStore.events
    );
    console.log(
      "EventCalendarCardNew: eventStore.events is array?",
      Array.isArray(eventStore.events)
    );
  } catch (error) {
    console.error("Failed to load events:", error);
  } finally {
    isLoading.value = false;
  }
});

// Build calendar attributes with automatic highlighting
const calendarAttributes = computed(() => {
  const attributes: Array<Record<string, unknown>> = [];
  const eventsByDate = new Map<string, CalendarEvent[]>();

  // Safely get events array - eventStore.events is a ref, need .value
  const storeEvents = Array.isArray(eventStore.events.value)
    ? eventStore.events.value
    : [];

  console.log("EventCalendarCardNew: Processing events", {
    storeEventsCount: storeEvents.length,
    customEventsCount: customEvents.value.length,
    firstEvent: storeEvents[0],
  });

  // Combine regular and custom events
  const allEvents: CalendarEvent[] = [
    ...storeEvents.map((event: any) => {
      // Use icon field to determine event type
      let eventType = "local";
      if (event.icon === "cup") {
        eventType = "cup";
      } else if (event.icon === "chall") {
        eventType = "challenge";
      } else if (event.icon === "pre") {
        eventType = "local"; // Pre-release events as local type
      } else if (event.icon === "friendly") {
        eventType = "local";
      }

      // Handle date extraction - dateTime might be "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS"
      const dateOnly = event.dateTime.includes(" ")
        ? event.dateTime.split(" ")[0]
        : event.dateTime;

      return {
        id: event.id,
        title: event.title,
        start: dateOnly,
        type: eventType,
        isCustom: false,
      };
    }),
    ...customEvents.value.map((event: CustomEvent) => ({
      id: event.id,
      title: event.name,
      start: new Date(event.eventDate).toISOString().split("T")[0],
      type: "custom" as const,
      isCustom: true,
    })),
  ];

  // Group by date
  allEvents.forEach((event) => {
    if (!eventsByDate.has(event.start)) {
      eventsByDate.set(event.start, []);
    }
    eventsByDate.get(event.start)!.push(event);
  });

  console.log("EventCalendarCardNew: Events grouped by date", {
    totalDates: eventsByDate.size,
    dates: Array.from(eventsByDate.keys()),
    eventCounts: Array.from(eventsByDate.entries()).map(([date, events]) => ({
      date,
      count: events.length,
      types: events.map((e) => e.type),
    })),
  });

  // Create highlights for each date
  eventsByDate.forEach((dayEvents, dateKey) => {
    const hasCustom = dayEvents.some((e) => e.type === "custom");
    const hasCup = dayEvents.some((e) => e.type === "cup");
    const hasChallenge = dayEvents.some((e) => e.type === "challenge");
    const hasLocal = dayEvents.some((e) => e.type === "local");

    // Determine background color/gradient based on event types
    // Using centralized EVENT_COLORS
    let bgColor = EVENT_COLORS.local.bg; // default fallback
    let background = "";

    if (hasCustom) {
      // Custom events: soft orange
      bgColor = EVENT_COLORS.custom.bg;
      background = bgColor;
    } else if (hasCup && hasChallenge) {
      // Both cup and challenge: soft blue left, soft green right
      background = `linear-gradient(to bottom right, ${EVENT_COLORS.challenge.bg} 0%, ${EVENT_COLORS.challenge.bg} 50%, ${EVENT_COLORS.cup.bg} 50%, ${EVENT_COLORS.cup.bg} 100%)`;
      bgColor = EVENT_COLORS.cup.bg;
    } else if (hasCup && hasLocal) {
      // Cup and local: soft sky blue left, soft green right
      background = `linear-gradient(to bottom right, ${EVENT_COLORS.local.bg} 0%, ${EVENT_COLORS.local.bg} 50%, ${EVENT_COLORS.cup.bg} 50%, ${EVENT_COLORS.cup.bg} 100%)`;
      bgColor = EVENT_COLORS.cup.bg;
    } else if (hasChallenge && hasLocal) {
      // Challenge and local: soft sky blue left, soft blue right
      background = `linear-gradient(to bottom right, ${EVENT_COLORS.local.bg} 0%, ${EVENT_COLORS.local.bg} 50%, ${EVENT_COLORS.challenge.bg} 50%, ${EVENT_COLORS.challenge.bg} 100%)`;
      bgColor = EVENT_COLORS.challenge.bg;
    } else if (hasCup) {
      // Cup only: soft green
      bgColor = EVENT_COLORS.cup.bg;
      background = bgColor;
    } else if (hasChallenge) {
      // Challenge only: soft blue
      bgColor = EVENT_COLORS.challenge.bg;
      background = bgColor;
    } else {
      // Local events: soft sky blue
      bgColor = EVENT_COLORS.local.bg;
      background = bgColor;
    }

    attributes.push({
      key: `highlight-${dateKey}`,
      dates: new Date(dateKey),
      highlight: {
        style: {
          background: background,
        },
        contentStyle: {
          color: "#1f2937", // gray-800
          fontWeight: "600",
          background: background,
        },
      },
      customData: {
        hasEvents: true,
      },
    });

    // Add dots for multiple event types - use darker shades for better visibility
    const uniqueTypes = [...new Set(dayEvents.map((e) => e.type))];
    uniqueTypes.forEach((type) => {
      // Use text colors from EVENT_COLORS for dots (they're darker and more visible)
      // Exception: cup uses medium green for better visibility
      const dotColors: Record<string, string> = {
        custom: EVENT_COLORS.custom.text,
        cup: "#16a34a", // green-600 - lighter than text color
        challenge: EVENT_COLORS.challenge.text,
        local: EVENT_COLORS.local.text,
      };

      attributes.push({
        key: `dot-${dateKey}-${type}`,
        dates: new Date(dateKey),
        dot: {
          style: {
            backgroundColor: dotColors[type] || EVENT_COLORS.local.text,
          },
        },
      });
    });
  });

  return attributes;
});

// Handle day click
const onDayClick = (day: any) => {
  const clickedDate = day.id;
  selectedDate.value = clickedDate;

  const storeEvents = Array.isArray(eventStore.events.value)
    ? eventStore.events.value
    : [];

  const regularEvents = storeEvents
    .filter((event: any) => {
      const eventDate = event.dateTime.includes(" ")
        ? event.dateTime.split(" ")[0]
        : event.dateTime;
      return eventDate === clickedDate;
    })
    .map(
      (event: any): ParsedEvent => ({
        ...event,
        isCustomEvent: false,
      })
    );

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
        isCustomEvent: true,
      })
    );

  selectedDateEvents.value = [...customEventsForDate, ...regularEvents];
};

const closeEventDetails = () => {
  selectedDate.value = null;
  selectedDateEvents.value = [];
};

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
  max-width: 100%;
  margin: 0 auto;
  border: none;
  box-shadow: none;
  display: flex;
  justify-content: center;
}

:deep(.vc-pane-container) {
  width: 100%;
  display: flex;
  justify-content: center;
}

:deep(.vc-pane) {
  margin: 0 auto;
  width: 100%;
}

:deep(.vc-calendar) {
  font-size: 1.08rem;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  box-shadow: 0 6px 32px 0 rgba(60, 60, 120, 0.1);
  border: none;
  padding: 1.5rem 1rem;
  border-radius: 1rem;
  width: 100%;
  --vc-day-content-width: 3rem;
  --vc-day-content-height: 3rem;
}

@media (min-width: 768px) {
  :deep(.vc-calendar) {
    --vc-day-content-width: 4rem;
    --vc-day-content-height: 4rem;
  }
}

@media (min-width: 1024px) {
  :deep(.vc-calendar) {
    font-size: 1.2rem;
    padding: 2rem 1.5rem;
    --vc-day-content-width: 5rem;
    --vc-day-content-height: 5rem;
  }

  :deep(.vc-title),
  :deep(.vc-weekday) {
    font-size: 1.4rem;
  }
}

@media (min-width: 1280px) {
  :deep(.vc-calendar) {
    --vc-day-content-width: 6rem;
    --vc-day-content-height: 6rem;
  }
}

:deep(.vc-title),
:deep(.vc-weekday) {
  font-size: 1.25rem;
  font-weight: 700;
  color: #4f46e5;
}

:deep(.vc-weekday) {
  text-transform: uppercase;
  font-size: 0.95rem;
  color: #6366f1;
}

:deep(.vc-day-content) {
  cursor: pointer;
  border-radius: 0.75rem;
  transition: all 0.2s;
  background-color: #f3f4f6; /* grey for days without events */
}

/* Override background for days with highlights (events) */
:deep(.vc-highlights .vc-day-content) {
  background-color: transparent !important;
}

:deep(.vc-day-content:hover) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

:deep(.vc-highlight) {
  border-radius: 0.75rem !important;
  opacity: 1 !important;
}

:deep(.vc-dots) {
  display: flex;
  justify-content: center;
  gap: 3px;
  margin-top: 4px;
}

:deep(.vc-dot) {
  width: 6px !important;
  height: 6px !important;
  border-radius: 50%;
}

@media (max-width: 640px) {
  .calendar-wrapper {
    padding: 0;
  }
  :deep(.vc-calendar) {
    font-size: 0.98rem;
    padding: 0.5rem 0.25rem;
  }
  :deep(.vc-title),
  :deep(.vc-weekday) {
    font-size: 1.05rem;
  }
}
</style>
