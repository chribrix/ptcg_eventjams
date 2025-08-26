<template>
  <div class="calendar-wrapper">
    <div v-if="pending" class="loading">Loading events...</div>
    <div v-else-if="error" class="error">Error loading events: {{ error }}</div>
    <div v-else class="calendar-container">
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

      <!-- Event Details Modal/Panel -->
      <div
        v-if="selectedDateEvents.length > 0"
        class="event-details-overlay"
        @click="closeEventDetails"
      >
        <div class="event-details-panel" @click.stop>
          <div class="event-details-header">
            <h3>Events on {{ formatSelectedDate }}</h3>
            <button @click="closeEventDetails" class="close-button">
              &times;
            </button>
          </div>
          <div class="event-details-content">
            <div
              v-for="event in selectedDateEvents"
              :key="event.id"
              class="event-item"
            >
              <div class="event-type-badge" :class="`badge-${event.type}`">
                {{ event.type.toUpperCase() }}
              </div>
              <h4 class="event-title">{{ stripHtmlTags(event.type) }}</h4>
              <div class="event-meta">
                <div v-if="event.dateTime" class="event-time">
                  <svg
                    class="icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  {{ formatEventTime(event.dateTime) }}
                </div>
                <div v-if="event.venue" class="event-venue">
                  <svg
                    class="icon"
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
                  {{ stripHtmlTags(event.venue) }}
                </div>
                <div v-if="event.location" class="event-location">
                  <svg
                    class="icon"
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
                  {{ stripHtmlTags(event.location)
                  }}{{
                    event.country ? `, ${stripHtmlTags(event.country)}` : ""
                  }}
                </div>
                <div
                  v-if="event.link && event.link !== '//'"
                  class="event-link"
                >
                  <a
                    :href="event.link"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="link-button"
                  >
                    <svg
                      class="icon"
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
                    View Details
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
import { useFetch } from "#app";

interface CalendarEvent {
  id: number;
  title: string;
  start: string; // ISO format e.g. 2025-08-10
  end?: string;
  type: "external" | "cup" | "local" | "challenge";
}

interface ParsedEvent {
  id: string;
  title: string;
  dateTime: string;
  type: string;
  venue: string;
  location: string;
  country: string;
  link: string;
  icon?: string;
}

const today = new Date();
const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);

const typeColors: Record<CalendarEvent["type"], string> = {
  external: "#dc2626", // red-600
  cup: "#dc2626", // red-600 (cups get red dots)
  local: "#16a34a", // green-600 (friendly tournaments get green dots)
  challenge: "#2563eb", // blue-600 (challenges get blue dots)
};

const typeLabels: Record<CalendarEvent["type"], string> = {
  external: "External Tournament",
  cup: "Cup Tournament",
  local: "Local Event",
  challenge: "Challenge",
};

// State for event details modal
const selectedDate = ref<string | null>(null);
const selectedDateEvents = ref<ParsedEvent[]>([]);
const originalEvents = ref<ParsedEvent[]>([]);

const {
  data: fetchedEvents,
  pending,
  error,
} = await useAsyncData("events", () => $fetch<CalendarEvent[]>("/api/events"));

// Also fetch the original parsed events for detailed information
const { data: fetchedOriginalEvents } = await useAsyncData(
  "originalEvents",
  () => $fetch<ParsedEvent[]>("/api/events/detailed")
);

const events = computed(() => fetchedEvents.value || []);

// Store original events for detailed view
if (fetchedOriginalEvents.value) {
  originalEvents.value = fetchedOriginalEvents.value;
}

const calendarAttributes = computed(() => {
  const eventsByDate = new Map<string, CalendarEvent[]>();

  // Group events by date
  events.value.forEach((event) => {
    const dateKey = event.start;
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, []);
    }
    eventsByDate.get(dateKey)!.push(event);
  });

  const attributes: any[] = [];

  // Create attributes for each date with events
  eventsByDate.forEach((dayEvents, dateKey) => {
    const date = new Date(dateKey);

    // Add dots for each event type on this date
    const eventTypes = [...new Set(dayEvents.map((e) => e.type))];

    eventTypes.forEach((type, index) => {
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
      attributes.push({
        key: `${dateKey}-highlight`,
        dates: date,
        highlight: {
          color: "blue",
          fillMode: "light",
          class: "has-events",
        },
      });
    }
  });

  return attributes;
});

// Handle day click
const onDayClick = (day: any) => {
  const clickedDate = day.id; // This should be in YYYY-MM-DD format
  selectedDate.value = clickedDate;

  // Find original events for this date
  const eventsForDate = originalEvents.value.filter((event) => {
    if (event.dateTime) {
      const eventDate = event.dateTime.split(" ")[0]; // Extract YYYY-MM-DD part
      return eventDate === clickedDate;
    }
    return false;
  });

  selectedDateEvents.value = eventsForDate;
};

// Close event details modal
const closeEventDetails = () => {
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
const formatEventTime = (dateTime: string) => {
  if (!dateTime) return "";
  const timePart = dateTime.split(" ")[1]; // Extract HH:MM part
  if (timePart) {
    return timePart;
  }
  return "";
};

// Strip HTML tags from text
const stripHtmlTags = (html: string) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
};
</script>

<style scoped>
.calendar-wrapper {
  width: 30vw;
  height: 50vh;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

.calendar-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.2rem;
  color: #6b7280;
}

.error {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.1rem;
  color: #dc2626;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  padding: 1rem;
  margin: 1rem;
}

/* Event Details Modal */
.event-details-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.event-details-panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 600px;
  max-height: 80vh;
  width: 90%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.event-details-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f9fafb;
}

.event-details-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.close-button:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.event-details-content {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.event-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  transition: all 0.2s ease;
}

.event-item:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.event-item:last-child {
  margin-bottom: 0;
}

.event-type-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.badge-external {
  background-color: #fef2f2;
  color: #dc2626;
}

.badge-cup {
  background-color: #fef2f2;
  color: #dc2626;
}

.badge-local {
  background-color: #f0fdf4;
  color: #16a34a;
}

.badge-challenge {
  background-color: #eff6ff;
  color: #2563eb;
}

.event-title {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.4;
}

.event-meta {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.event-time,
.event-venue,
.event-location,
.event-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.link-button {
  color: #2563eb;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.link-button:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

/* Calendar Styles */
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
