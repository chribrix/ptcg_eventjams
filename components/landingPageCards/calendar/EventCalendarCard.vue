<template>
  <div class="w-full h-full">
    <div
      class="p-4 sm:p-6 flex flex-col justify-center items-center h-full min-h-[400px] bg-[#36393f]"
    >
      <div
        class="relative w-full calendar-wrapper flex flex-col justify-center items-center flex-1"
      >
        <!-- Loading indicator -->
        <div
          v-if="isLoading"
          class="absolute inset-0 bg-[#2f3136]/95 flex justify-center items-center z-10 rounded-lg"
        >
          <div class="flex flex-col items-center gap-3">
            <div
              class="w-8 h-8 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin"
            ></div>
            <span class="text-sm text-gray-300 font-medium"
              >{{ t("calendarCard.loadingEvents") }}</span
            >
          </div>
        </div>

        <ClientOnly>
          <template #default>
            <VCalendar
              expanded
              :attributes="calendarAttributes"
              :columns="1"
              :rows="2"
              :min-date="today"
              :max-date="maxDate"
              @dayclick="onDayClick"
            />
          </template>
          <template #fallback>
            <div
              class="w-full h-64 flex items-center justify-center text-gray-400"
            >
              <div class="animate-pulse">
                {{ t("calendarCard.loadingCalendar") }}
              </div>
            </div>
          </template>
        </ClientOnly>

        <!-- Legend -->
        <div class="w-full max-w-[620px] mt-4 px-2 sm:px-4">
          <div
            class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2"
          >
            <CalendarCategoryPill
              v-for="category in categoryPills"
              :key="category.key"
              :label="category.label"
              :background-color="category.bg"
              :text-color="category.text"
              :is-active="isCategoryVisible(category.key)"
              @select="openTypeFilter(category.key)"
              @toggle="toggleCategoryVisibility(category.key)"
            />
          </div>
        </div>

        <!-- Event Details Popover -->
        <EventDetailsPopover
          v-if="selectedDateEvents.length > 0"
          :events="selectedDateEvents"
          :formatted-date="formatSelectedDate"
          @close="closeEventDetails"
        />

        <!-- Type Filter Modal -->
        <EventDetailsPopover
          v-if="showTypeFilterModal && filteredEventsByType.length > 0"
          :events="filteredEventsByType"
          :formatted-date="typeFilterModalTitle"
          @close="closeTypeFilter"
        />

        <!-- No Events Toast -->
        <Transition
          enter-active-class="transition ease-out duration-300"
          enter-from-class="translate-y-2 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition ease-in duration-200"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="translate-y-2 opacity-0"
        >
          <div
            v-if="showNoEventsToast"
            class="fixed bottom-4 right-4 z-50 max-w-md"
          >
            <div
              class="bg-gray-700 text-white rounded-lg shadow-2xl p-4 flex items-start gap-3"
            >
              <div class="flex-shrink-0">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
              </div>
              <div class="flex-1">
                <p class="font-semibold">
                  {{ t("calendarCard.noEventsTitle") }}
                </p>
                <p class="text-sm text-gray-200 mt-1">{{ noEventsMessage }}</p>
              </div>
              <button
                @click="showNoEventsToast = false"
                class="flex-shrink-0 text-gray-300 hover:text-white transition-colors"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import CalendarCategoryPill from "./CalendarCategoryPill.vue";
import EventDetailsPopover from "./EventDetailsPopover.vue";
import { EVENT_COLORS } from "~/utils/eventColors";
import {
  getDateKeyInTimeZone,
  getUserTimeZone,
} from "~/utils/eventDateTime";
import {
  CALENDAR_CATEGORY_DEFINITIONS,
  eventMatchesCategory,
  isUpcomingCalendarEvent,
  normalizeCustomCalendarEvent,
  normalizeExternalCalendarEvent,
  sortCalendarEvents,
  type CalendarCategory,
  type CalendarEventType,
  type CustomCalendarEvent,
  type ExternalCalendarEvent,
  type UnifiedCalendarEvent,
} from "~/utils/calendarEventUtils";

const { t, locale } = useI18n();
const userTimeZone = getUserTimeZone();

const today = new Date();
const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
const todayKey = getDateKeyInTimeZone(new Date().toISOString(), userTimeZone);
const categoryPills = computed(() =>
  CALENDAR_CATEGORY_DEFINITIONS.map((category) => ({
    ...category,
    label: t(`calendarCard.categories.${category.key}`),
  })),
);
const calendarTypePriority: CalendarEventType[] = [
  "challenge",
  "cup",
  "prerelease",
  "custom",
  "local",
  "riftbound",
];
const dotColors: Record<CalendarEventType, string> = {
  custom: EVENT_COLORS.custom.text,
  cup: "#16a34a",
  challenge: EVENT_COLORS.challenge.text,
  local: EVENT_COLORS.local.text,
  prerelease: EVENT_COLORS.prerelease.text,
  riftbound: EVENT_COLORS.riftbound.text,
};

const eventStore = useEventStore();
const customEvents = ref<CustomCalendarEvent[]>([]);
const isLoading = ref(false);
const selectedDate = ref<string | null>(null);
const selectedDateEvents = ref<UnifiedCalendarEvent[]>([]);
const selectedEventType = ref<CalendarCategory | null>(null);
const showTypeFilterModal = ref(false);
const showNoEventsToast = ref(false);
const noEventsMessage = ref("");
const disabledCategories = ref<Set<CalendarCategory>>(new Set());

// Fetch custom events
const fetchCustomEvents = async () => {
  try {
    const response = await $fetch<{
      success: boolean;
      events: CustomCalendarEvent[];
    }>("/api/events/custom");
    if (response.success && response.events) {
      customEvents.value = response.events;
    }
  } catch (error) {
    console.error("Failed to load custom events:", error);
  }
};

onMounted(async () => {
  isLoading.value = true;
  try {
    await Promise.all([eventStore.fetchEvents(), fetchCustomEvents()]);
  } catch (error) {
    console.error("Failed to load events:", error);
  } finally {
    isLoading.value = false;
  }
});

const allCalendarEvents = computed<UnifiedCalendarEvent[]>(() => {
  const storeEvents = Array.isArray(eventStore.events.value)
    ? eventStore.events.value
    : [];

  return sortCalendarEvents([
    ...storeEvents.map((event: ExternalCalendarEvent) =>
      normalizeExternalCalendarEvent(event)
    ),
    ...customEvents.value.map((event) =>
      normalizeCustomCalendarEvent(event, userTimeZone)
    ),
  ]);
});

const isCategoryVisible = (category: CalendarCategory) =>
  !disabledCategories.value.has(category);

const visibleCalendarEvents = computed(() =>
  allCalendarEvents.value.filter((event) => {
    if (event.type === "local" && !event.isCustomEvent) {
      return true;
    }

    return categoryPills.value
      .filter((category) => !disabledCategories.value.has(category.key))
      .some((category) => eventMatchesCategory(event, category.key));
  })
);

const getBackgroundForTypes = (types: CalendarEventType[]) => {
  const orderedTypes = [...types].sort(
    (first, second) =>
      calendarTypePriority.indexOf(first) - calendarTypePriority.indexOf(second)
  );
  const uniqueColors = orderedTypes.map((type) => {
    if (type === "cup") return EVENT_COLORS.cup.bg;
    if (type === "challenge") return EVENT_COLORS.challenge.bg;
    if (type === "prerelease") return EVENT_COLORS.prerelease.bg;
    if (type === "custom") return EVENT_COLORS.custom.bg;
    if (type === "riftbound") return EVENT_COLORS.riftbound.bg;
    return EVENT_COLORS.local.bg;
  });

  if (uniqueColors.length <= 1) {
    return uniqueColors[0] || EVENT_COLORS.local.bg;
  }

  const step = 100 / uniqueColors.length;
  const segments = uniqueColors.map((color, index) => {
    const start = Math.round(index * step);
    const end = Math.round((index + 1) * step);
    return `${color} ${start}%, ${color} ${end}%`;
  });

  return `linear-gradient(135deg, ${segments.join(", ")})`;
};

// Build calendar attributes with automatic highlighting
const calendarAttributes = computed(() => {
  const attributes: Array<Record<string, unknown>> = [];
  const eventsByDate = new Map<string, UnifiedCalendarEvent[]>();

  // Group by date
  visibleCalendarEvents.value.forEach((event) => {
    if (!eventsByDate.has(event.start)) {
      eventsByDate.set(event.start, []);
    }
    eventsByDate.get(event.start)!.push(event);
  });

  // Create highlights for each date
  eventsByDate.forEach((dayEvents, dateKey) => {
    const uniqueTypes = [...new Set(dayEvents.map((event) => event.type))];
    const background = getBackgroundForTypes(uniqueTypes);

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
    });

    uniqueTypes.forEach((type) => {
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
  selectedDateEvents.value = visibleCalendarEvents.value.filter(
    (event) => event.start === clickedDate
  );
};

const closeEventDetails = () => {
  selectedDate.value = null;
  selectedDateEvents.value = [];
};

const formatSelectedDate = computed(() => {
  if (!selectedDate.value) return "";
  const date = new Date(selectedDate.value);
  return date.toLocaleDateString(
    locale.value.startsWith("de") ? "de-DE" : "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );
});

const getCategoryLabel = (category: CalendarCategory): string =>
  t(`calendarCard.categories.${category}`);

// Type filter functions
const openTypeFilter = (type: CalendarCategory) => {
  selectedEventType.value = type;

  if (filteredEventsByType.value.length === 0) {
    showTypeFilterModal.value = false;
    noEventsMessage.value = t("calendarCard.noUpcomingType", {
      type: getCategoryLabel(type),
    });
    showNoEventsToast.value = true;

    setTimeout(() => {
      showNoEventsToast.value = false;
    }, 3000);

    return;
  }

  // Otherwise, show the modal
  showTypeFilterModal.value = true;
};

const closeTypeFilter = () => {
  selectedEventType.value = null;
  showTypeFilterModal.value = false;
};

const typeFilterModalTitle = computed(() => {
  if (!selectedEventType.value) return "";
  return t("calendarCard.upcomingType", {
    type: getCategoryLabel(selectedEventType.value),
  });
});

const filteredEventsByType = computed(() => {
  if (!selectedEventType.value) return [];

  return sortCalendarEvents(
    allCalendarEvents.value.filter((event) => {
      return (
        isUpcomingCalendarEvent(event, todayKey) &&
        eventMatchesCategory(event, selectedEventType.value!)
      );
    })
  );
});

const toggleCategoryVisibility = (category: CalendarCategory) => {
  const next = new Set(disabledCategories.value);

  if (next.has(category)) {
    next.delete(category);
  } else {
    next.add(category);
  }

  disabledCategories.value = next;

  if (selectedDate.value) {
    selectedDateEvents.value = visibleCalendarEvents.value.filter(
      (event) => event.start === selectedDate.value
    );
  }
};
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
  background: #36393f;
}

:deep(.vc-pane-container) {
  width: 100%;
  display: flex;
  justify-content: center;
  background: #36393f;
}

:deep(.vc-pane) {
  margin: 0 auto;
  width: 100%;
  background: #36393f;
}

:deep(.vc-calendar) {
  font-size: 1.08rem;
  background: #36393f;
  box-shadow: 0 6px 32px 0 rgba(0, 0, 0, 0.3);
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
  color: #ffffff;
}

:deep(.vc-weekday) {
  text-transform: uppercase;
  font-size: 0.95rem;
  color: #d1d5db;
}

:deep(.vc-day-content) {
  cursor: pointer;
  border-radius: 0.75rem;
  transition: all 0.2s;
  background-color: #40444b;
  color: #d1d5db;
}

/* Override background for days with highlights (events) */
:deep(.vc-highlights .vc-day-content) {
  background-color: transparent !important;
}

:deep(.vc-day-content:hover) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  background-color: #4f545c;
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
