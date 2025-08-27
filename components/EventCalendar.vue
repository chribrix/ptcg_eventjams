<template>
  <div class="calendar-wrapper">
    <div v-if="eventStore.error.value" class="error">
      Error loading events: {{ eventStore.error.value }}
    </div>

    <!-- Event Stats Display -->
    <div v-if="eventStats" class="event-stats">
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Total Events:</span>
          <span class="stat-value">{{ eventStats.totalEvents }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Date Range:</span>
          <span class="stat-value">{{ eventStats.dateRange.span }} days</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Free Events:</span>
          <span class="stat-value text-green-600">{{
            eventStats.pricing.free
          }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Paid Events:</span>
          <span class="stat-value text-blue-600">{{
            eventStats.pricing.paid
          }}</span>
        </div>
      </div>
      <button
        @click="refreshEvents"
        :disabled="eventStore.isLoading.value"
        class="refresh-button"
      >
        {{ eventStore.isLoading.value ? "Refreshing..." : "Refresh Events" }}
      </button>
    </div>

    <div class="calendar-container">
      <!-- Loading indicator overlay -->
      <div v-if="eventStore.isLoading.value" class="loading-overlay">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <span>Loading events...</span>
        </div>
      </div>

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
              <div class="event-header">
                <div
                  class="event-type-badge"
                  :class="`badge-${event.icon || 'friendly'}`"
                >
                  {{ event.type }}
                </div>
                <div class="event-header-right">
                  <div v-if="event.cost !== undefined" class="event-cost">
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
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                      ></path>
                    </svg>
                    {{ event.cost || "?" }}
                  </div>
                  <div v-if="event.time" class="event-time-header">
                    {{ event.time }}
                  </div>
                </div>
              </div>

              <div class="event-content-grid">
                <div class="event-column">
                  <div v-if="event.venue" class="event-detail">
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
                    <span>{{ stripHtmlTags(event.venue) }}</span>
                  </div>
                  <div v-if="event.streetAddress" class="event-detail">
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
                    <span>{{ stripHtmlTags(event.streetAddress) }}</span>
                  </div>
                  <div v-if="event.location" class="event-detail">
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
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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

                <div class="event-column">
                  <div
                    v-if="event.link && event.link !== '//'"
                    class="event-detail"
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
import { ref, computed, onMounted } from "vue";

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
  time?: string; // Add separate time field
  type: string;
  venue: string;
  location: string;
  country: string;
  link: string;
  cost?: string; // Add cost field
  streetAddress?: string; // Add street address field
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

// Use the event store composable
const eventStore = useEventStore();

// Load events on mount
onMounted(async () => {
  try {
    await eventStore.fetchEvents();
  } catch (error) {
    console.error("Failed to load events:", error);
  }
});

const events = computed(() => {
  // Convert ParsedEvents to CalendarEvents for the calendar display
  return eventStore.events.value.map((event: any) => {
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
    };
  });
});

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

  // Find original events for this date using the store
  const eventsForDate = eventStore.events.value.filter((event: any) => {
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
const formatEventTime = (event: ParsedEvent) => {
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

// Strip HTML tags from text
const stripHtmlTags = (html: string) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
};

// Get stats for display
const eventStats = computed(() => eventStore.getEventStats());

// Refresh events function
const refreshEvents = async () => {
  try {
    await eventStore.fetchEvents(true); // Force refresh
  } catch (error) {
    console.error("Failed to refresh events:", error);
  }
};
</script>

<style scoped>
.calendar-wrapper {
  width: 30vw;
  height: 50vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}

.event-stats {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  width: 100%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
}

.text-green-600 {
  color: #16a34a !important;
}

.text-blue-600 {
  color: #2563eb !important;
}

.refresh-button {
  width: 100%;
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.refresh-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
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

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
  border-radius: 0.5rem;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-spinner span {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
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
  padding: 1rem;
  margin-bottom: 0.75rem;
  transition: all 0.2s ease;
}

.event-item:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.event-item:last-child {
  margin-bottom: 0;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.event-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.event-cost {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #059669;
  background-color: #ecfdf5;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  border: 1px solid #a7f3d0;
}

.event-time-header {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  background-color: #f3f4f6;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}

.event-content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.event-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.event-detail {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.4;
}

.event-detail span {
  flex: 1;
}

.icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.event-type-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-friendly {
  background-color: #f0fdf4;
  color: #16a34a;
}

.badge-cup {
  background-color: #fef2f2;
  color: #dc2626;
}

.badge-chall {
  background-color: #eff6ff;
  color: #2563eb;
}

.badge-pre {
  background-color: #fefce8;
  color: #ca8a04;
}

.link-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #2563eb;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
  background-color: #eff6ff;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  border: 1px solid #bfdbfe;
}

.link-button:hover {
  background-color: #dbeafe;
  color: #1d4ed8;
  text-decoration: none;
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
