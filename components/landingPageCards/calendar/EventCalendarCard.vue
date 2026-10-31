<template>
  <div class="w-full">
    <div
      class="px-3 pt-1 pb-3 sm:px-4 sm:pt-2 sm:pb-4 lg:px-5 lg:pt-3 lg:pb-5"
    >
      <div
        class="relative w-full calendar-wrapper"
      >
        <!-- Loading indicator -->
        <div
          v-if="isLoading"
          class="absolute inset-0 app-surface-0 flex justify-center items-center z-10 rounded-lg"
        >
          <div class="flex flex-col items-center gap-3">
            <div
              class="calendar-loading-spinner h-8 w-8 animate-spin rounded-full border-4"
            ></div>
            <span class="app-text-secondary-soft text-sm font-medium"
              >{{ t("calendarCard.loadingEvents") }}</span
            >
          </div>
        </div>

        <!-- Deprecated VCalendar implementation (kept for reference) -->
        <!--
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
              class="app-text-muted-soft flex h-64 w-full items-center justify-center"
            >
              <div class="animate-pulse">
                {{ t("calendarCard.loadingCalendar") }}
              </div>
            </div>
          </template>
        </ClientOnly>
        -->

        <div class="mt-1 w-full lg:mt-1">
          <div class="calendar-shell rounded-xl border app-border p-3 lg:p-4">
            <div class="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                class="calendar-month-shift inline-flex h-9 w-9 items-center justify-center rounded-lg lg:h-10 lg:w-10"
                @click="shiftCalendarWindow(-1)"
                :aria-label="locale.startsWith('de') ? 'Vorherige vier Wochen' : 'Previous four weeks'"
              >
                <ChevronLeftIcon class="h-5 w-5" />
              </button>
              <div class="min-w-0 text-center">
                <p class="app-text-strong text-sm font-semibold leading-tight sm:text-base lg:text-2xl">{{ calendarRangeLabel }}</p>
                <p class="app-text-muted-soft mt-0.5 text-[10px] font-medium sm:text-xs">{{ calendarDateRangeLabel }}</p>
              </div>
              <button
                type="button"
                class="calendar-month-shift inline-flex h-9 w-9 items-center justify-center rounded-lg lg:h-10 lg:w-10"
                @click="shiftCalendarWindow(1)"
                :aria-label="locale.startsWith('de') ? 'Nächste vier Wochen' : 'Next four weeks'"
              >
                <ChevronRightIcon class="h-5 w-5" />
              </button>
            </div>
            <div class="mb-1 grid grid-cols-7 gap-1 lg:gap-2">
              <span
                v-for="weekday in miniCalendarWeekdays"
                :key="weekday"
                class="app-text-muted-soft text-center text-[10px] font-semibold lg:text-base"
              >
                {{ weekday }}
              </span>
            </div>
            <div v-for="(week, weekIndex) in customCalendarWeeks" :key="weekIndex">
              <div v-if="week.sectionLabel" class="calendar-month-divider app-text-strong my-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider sm:text-sm">
                <span>{{ week.sectionLabel }}</span><span class="h-px flex-1 bg-current opacity-30"></span>
              </div>
              <div class="grid grid-cols-7 gap-1 lg:gap-2" :class="weekIndex ? 'mt-1 lg:mt-2' : ''">
              <template v-for="(day, dayIndex) in week.days" :key="day?.key ?? `empty-${weekIndex}-${dayIndex}`">
              <span v-if="!day" aria-hidden="true"></span>
              <button
                v-else
                type="button"
                class="relative flex h-10 min-w-0 flex-col items-center justify-center rounded-md border text-xs font-semibold leading-none lg:h-12 lg:rounded-lg lg:text-base"
                :class="customCalendarDayClass(day)"
                :style="customCalendarDayStyle(day)"
                :disabled="!day.isInteractive"
                @click="day.dateKey ? onCustomDayClick(day.dateKey) : null"
              >
                <span
                  v-if="day.showMonthMarker"
                  class="mb-0.5 text-[8px] font-extrabold uppercase tracking-[0.08em] lg:text-[10px]"
                >
                  {{ day.monthMarker }}
                </span>
                <span>{{ day.label }}</span>
              </button>
              </template>
              </div>
            </div>
            <button v-if="!isCurrentWindow" type="button" class="app-text-secondary-soft mt-3 text-xs font-semibold underline underline-offset-2" @click="resetCalendarWindow">{{ locale.startsWith('de') ? 'Heute anzeigen' : 'Show today' }}</button>
          </div>
        </div>

        <!-- Legend -->
        <div class="mt-3 w-full lg:mt-4">
          <div
            class="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:gap-2.5"
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

        <div v-if="showMobileAuthCta && !userName" class="mt-4 w-full md:hidden">
          <div class="grid grid-cols-2 gap-2">
            <NuxtLink to="/register" class="calendar-mobile-register-cta">
              {{ t("nav.register") }}
            </NuxtLink>
            <NuxtLink to="/login" class="calendar-mobile-login-cta">
              {{ t("nav.login") }}
            </NuxtLink>
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
              class="app-surface-2 app-text-strong rounded-lg p-4 shadow-2xl flex items-start gap-3"
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
                <p class="app-text-secondary-soft mt-1 text-sm">{{ noEventsMessage }}</p>
              </div>
              <button
                @click="showNoEventsToast = false"
                class="calendar-toast-close app-text-secondary-soft flex-shrink-0 transition-colors"
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
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/vue/24/outline";
import CalendarCategoryPill from "./CalendarCategoryPill.vue";
import EventDetailsPopover from "./EventDetailsPopover.vue";
import { EVENT_COLORS } from "~/utils/eventColors";
import { getRollingCalendarWindow, shiftRollingCalendarWindow } from "~/utils/rollingCalendarWindow";
import {
  getDateKeyInTimeZone,
  getUserTimeZone,
} from "~/utils/eventDateTime";
import {
  LANDING_CALENDAR_CATEGORIES,
  eventMatchesCategory,
  isLandingCalendarEventVisible,
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

const props = withDefaults(
  defineProps<{
    showMobileAuthCta?: boolean;
    showcaseDate?: string;
  }>(),
  {
    showMobileAuthCta: true,
    showcaseDate: "",
  },
);

const { t, locale } = useI18n();
const { userName } = useAuth();
const userTimeZone = getUserTimeZone();

const today = props.showcaseDate && import.meta.dev
  ? new Date(`${props.showcaseDate}T12:00:00`)
  : new Date();
const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
const todayKey = getDateKeyInTimeZone(new Date().toISOString(), userTimeZone);
const miniCalendarWeekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const categoryPills = computed(() =>
  LANDING_CALENDAR_CATEGORIES.map((category) => ({
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
  cup: EVENT_COLORS.cup.text,
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
const calendarAnchor = ref<Date>(today);
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
  if (props.showcaseDate && import.meta.dev) return;
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
      normalizeExternalCalendarEvent(event, userTimeZone)
    ),
    ...customEvents.value.map((event) =>
      normalizeCustomCalendarEvent(event, userTimeZone)
    ),
  ]);
});

const isCategoryVisible = (category: CalendarCategory) =>
  !disabledCategories.value.has(category);

const visibleCalendarEvents = computed(() =>
  allCalendarEvents.value.filter((event) =>
    isLandingCalendarEventVisible(event, disabledCategories.value),
  )
);

const visibleEventsByDate = computed(() => {
  const map = new Map<string, UnifiedCalendarEvent[]>();
  for (const event of visibleCalendarEvents.value) {
    const current = map.get(event.start) || [];
    current.push(event);
    map.set(event.start, current);
  }
  return map;
});

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

const calendarWindow = computed(() => getRollingCalendarWindow(calendarAnchor.value));
const isCurrentWindow = computed(() => calendarAnchor.value.toDateString() === today.toDateString());
const calendarLocale = computed(() => locale.value.startsWith("de") ? "de-DE" : "en-US");
const monthLabel = (date: Date) => date.toLocaleDateString(calendarLocale.value, { month: "long", year: "numeric" });
const calendarRangeLabel = computed(() => {
  const { start, end } = calendarWindow.value;
  return start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
    ? monthLabel(start)
    : start.getFullYear() === end.getFullYear()
      ? `${start.toLocaleDateString(calendarLocale.value, { month: "long" })} → ${monthLabel(end)}`
      : `${monthLabel(start)} → ${monthLabel(end)}`;
});
const calendarDateRangeLabel = computed(() => {
  const { start, end } = calendarWindow.value;
  const short = (date: Date) => date.toLocaleDateString(calendarLocale.value, { day: "numeric", month: "short" });
  return `${short(start)} – ${short(end)} · ${locale.value.startsWith("de") ? "4 Wochen" : "4 weeks"}`;
});

type CustomCalendarDay = {
  key: string;
  label: string;
  isInteractive: boolean;
  hasEvents: boolean;
  dateKey: string | null;
  types: CalendarEventType[];
  showMonthMarker: boolean;
  monthMarker: string;
};

const formatMonthMarker = (date: Date) =>
  date.toLocaleDateString(
    locale.value.startsWith("de") ? "de-DE" : "en-US",
    { month: "short" },
  ).replace(".", "");

const showcaseTypes: Record<string, CalendarEventType[]> = {
  "2026-10-31": ["cup", "challenge"], "2026-11-01": ["prerelease"],
  "2026-11-06": ["challenge"], "2026-11-07": ["cup"],
  "2026-11-13": ["challenge", "cup"], "2026-11-20": ["challenge"],
  "2026-11-25": ["cup"],
};
const customCalendarWeeks = computed(() => calendarWindow.value.weeks.map((week) => ({
  sectionLabel: week.sectionMonth ? monthLabel(week.sectionMonth) : null,
  days: week.days.map((calendarDay, index): CustomCalendarDay | null => {
    if (!calendarDay) return null;
    const { date, inRange, isMonthStart } = calendarDay;
    const dateKey = getDateKeyInTimeZone(date.toISOString(), userTimeZone);
    const dayEvents = visibleEventsByDate.value.get(dateKey) || [];
    const types = props.showcaseDate && import.meta.dev
      ? showcaseTypes[dateKey] || []
      : [...new Set(dayEvents.map((event) => event.type))];
    return {
      key: `${dateKey}-${index}`,
      label: String(date.getDate()),
      isInteractive: inRange || dayEvents.length > 0,
      hasEvents: types.length > 0,
      dateKey: dayEvents.length ? dateKey : null,
      types,
      showMonthMarker: isMonthStart,
      monthMarker: formatMonthMarker(date),
    };
  }),
})));

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
          color: "var(--app-border)",
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

const onCustomDayClick = (dateKey: string) => {
  selectedDate.value = dateKey;
  selectedDateEvents.value = visibleCalendarEvents.value.filter(
    (event) => event.start === dateKey,
  );
};

const customCalendarDayClass = (day: CustomCalendarDay) => {
  if (!day.isInteractive) {
    return "border-transparent bg-transparent app-text-muted-soft";
  }
  if (!day.types.length) {
    return "calendar-empty-day app-text-secondary-soft";
  }
  return "calendar-event-day border-transparent app-text-strong";
};

const customCalendarDayStyle = (day: CustomCalendarDay) => {
  if (!day.types.length) return undefined;
  return {
    background: getBackgroundForTypes(day.types),
    color: "#0f172a",
    textShadow: "0 1px 0 rgba(255,255,255,0.25)",
  };
};

const shiftCalendarWindow = (offset: number) => {
  calendarAnchor.value = shiftRollingCalendarWindow(calendarAnchor.value, offset);
};
const resetCalendarWindow = () => { calendarAnchor.value = today; };

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

defineExpose({
  refresh: fetchCustomEvents,
});
</script>

<style scoped>
.calendar-wrapper {
  width: 100%;
  display: block;
}

.calendar-shell {
  background: color-mix(in srgb, var(--app-surface-1) 42%, transparent);
  backdrop-filter: blur(18px) saturate(1.08);
  box-shadow: var(--app-shadow-soft);
}

.calendar-month-shift {
  color: var(--app-button-blue-text);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--app-button-blue) 92%, white),
      color-mix(in srgb, var(--app-button-amber) 72%, var(--app-button-blue))
    );
  border: 1px solid color-mix(in srgb, var(--app-button-blue-border) 70%, white);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    var(--app-shadow-soft);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.calendar-month-shift:hover {
  transform: translateY(-1px);
  filter: saturate(1.08) brightness(1.04);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.28),
    var(--app-shadow-strong);
}

.calendar-empty-day {
  background: color-mix(in srgb, var(--app-surface-0) 16%, transparent);
  border-color: color-mix(in srgb, var(--app-border) 60%, transparent);
  backdrop-filter: blur(16px) saturate(1.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.calendar-event-day {
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.12);
}

.calendar-mobile-register-cta,
.calendar-mobile-login-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  min-height: 2.75rem;
  font-size: 0.95rem;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.2s ease-in-out;
}

.calendar-mobile-register-cta {
  color: var(--app-button-blue-text);
  background: var(--app-button-blue);
  border: 1px solid var(--app-button-blue-border);
  box-shadow: var(--app-shadow-soft);
}

.calendar-mobile-register-cta:hover {
  background: var(--app-button-blue-hover);
}

.calendar-mobile-login-cta {
  color: var(--app-text-secondary);
  border: 1px solid var(--app-border);
  background: var(--app-surface-1);
}

.calendar-mobile-login-cta:hover {
  background: var(--app-surface-2);
}

.calendar-loading-spinner {
  border-color: var(--app-surface-3);
  border-top-color: var(--app-button-blue);
}

.calendar-toast-close:hover {
  color: var(--app-text-primary);
}

.calendar-wrapper :deep(.vc-container) {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  border: none;
  box-shadow: none;
  display: flex;
  justify-content: center;
  background: var(--app-surface-1);
}

:deep(.vc-pane-container) {
  width: 100%;
  display: flex;
  justify-content: center;
  background: var(--app-surface-1);
}

:deep(.vc-pane) {
  margin: 0 auto;
  width: 100%;
  background: var(--app-surface-1);
}

:deep(.vc-calendar) {
  font-size: 1.08rem;
  background: var(--app-surface-1);
  box-shadow: var(--app-shadow-soft);
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
  color: var(--app-text-primary);
}

:deep(.vc-weekday) {
  text-transform: uppercase;
  font-size: 0.95rem;
  color: var(--app-text-secondary);
}

:deep(.vc-day-content) {
  cursor: pointer;
  border-radius: 0.75rem;
  transition: all 0.2s;
  background-color: color-mix(in srgb, var(--app-surface-2) 94%, var(--app-surface-0));
  color: var(--app-text-secondary);
  backdrop-filter: blur(12px) saturate(1.04);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--app-border) 88%, transparent);
}

/* Override background for days with highlights (events) */
:deep(.vc-highlights .vc-day-content) {
  background-color: transparent !important;
}

:deep(.vc-day-content:hover) {
  transform: scale(1.05);
  box-shadow: var(--app-shadow-soft);
  background-color: color-mix(in srgb, var(--app-surface-3) 96%, var(--app-surface-0));
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
