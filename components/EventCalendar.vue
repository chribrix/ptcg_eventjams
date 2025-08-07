<template>
  <div class="calendar-wrapper">
    <VCalendar
      expanded
      :attributes="calendarAttributes"
      :columns="1"
      :rows="2"
      :min-date="today"
      :max-date="maxDate"
      :show-pane="false"
    />
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
  type: "external" | "cup" | "local";
}

const today = new Date();
const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);

const typeColors: Record<CalendarEvent["type"], string> = {
  external: "red",
  cup: "blue",
  local: "green",
};

const { data: fetchedEvents } = await useAsyncData("events", () =>
  $fetch<CalendarEvent[]>("/api/events")
);

const events = computed(() => fetchedEvents.value || []);
const calendarAttributes = computed(() => {
  return events.value.map((event) => {
    const start = new Date(event.start);
    const end = event.end ? new Date(event.end) : start;

    return {
      key: `event-${event.id}`,
      dates: { start, end },
      popover: {
        label: event.title,
      },
      /*
      bar: {
        color: typeColors[event.type],
        style: {
          height: "6px",
          borderRadius: "3px",
        },
      },*/
      highlight: {
        contentClass: `event-${event.type}`,
        style: {
          backgroundColor: typeColors[event.type],
        },
      },
    };
  });
});
</script>

<style scoped>
.calendar-wrapper {
  width: 30vw; /* 40% of viewport width */
  height: 50vh; /* 30% of viewport height */
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Scale up the calendar content */
.vc-calendar {
  font-size: 1.1rem;
  --vc-day-content-height: 3rem;
  --vc-day-content-width: 3rem;
  --vc-border-radius: 0.5rem;
}

/* Optional: adjust title and weekday text */
.vc-title,
.vc-weekday {
  font-size: 1.3rem;
  font-weight: bold;
  color: blue;
}

/* Optional: style popovers if used */
.vc-popover-content {
  font-size: 2.1rem;
  padding: 0.75rem 1rem;
  min-width: 150px;
  max-width: 250px;
  white-space: normal;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

/* Optional: scale bar size */
.vc-bar {
  height: 6px !important;
  border-radius: 3px !important;
}

.event-external {
  background-color: rgba(255, 0, 0, 0.3); /* red */
  border-radius: 8px;
}

.event-cup {
  background-color: rgba(0, 0, 255, 0.3); /* blue */
  border-radius: 8px;
}

.event-local {
  background-color: rgba(0, 128, 0, 0.3); /* green */
  border-radius: 8px;
}
</style>
