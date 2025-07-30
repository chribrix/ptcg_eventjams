<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Event Calendar</h1>

    <client-only>
      <VCalendar
        is-expanded
        :attributes="calendarAttributes"
        @dayclick="handleDayClick"
      />
    </client-only>

    <div v-if="selectedEvent" class="mt-4 p-4 border bg-gray-100 rounded">
      <h2 class="font-semibold">Selected Event</h2>
      <p>{{ selectedEvent.title }}</p>
      <p>{{ selectedEvent.date }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
}

const events = ref<CalendarEvent[]>([
  { id: 1, title: "Project Kickoff", date: "2025-07-15" },
  { id: 2, title: "Design Review", date: "2025-07-22" },
]);

const selectedEvent = ref<CalendarEvent | null>(null);

const calendarAttributes = computed(() => [
  {
    key: "events",
    dates: events.value.map((e) => e.date),
    dot: { color: "blue" },
    popover: { label: "Event" },
  },
]);

function handleDayClick(day: any) {
  const clickedDate = day.date.toISOString().split("T")[0];
  const match = events.value.find((e) => e.date === clickedDate);
  if (match) {
    selectedEvent.value = match;
  } else {
    selectedEvent.value = null;
  }
}
</script>
