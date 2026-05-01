<template>
  <section class="w-full max-w-6xl mx-auto">
    <div
      class="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]"
    >
      <div class="border-b border-slate-200/80 px-4 py-5 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-2xl">
            <p class="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-700">
              Event discovery
            </p>
            <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Find the next event fast
            </h2>
            <p class="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
              Browse official event feed entries and custom local tournaments in
              one place, with filters that stay usable on a phone.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[22rem]">
            <div class="rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm backdrop-blur">
              <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Shown</div>
              <div class="mt-1 text-2xl font-semibold text-slate-950">{{ filteredEvents.length }}</div>
            </div>
            <div class="rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm backdrop-blur">
              <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Custom</div>
              <div class="mt-1 text-2xl font-semibold text-slate-950">{{ customEventsCount }}</div>
            </div>
            <div class="rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm backdrop-blur">
              <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Local reg</div>
              <div class="mt-1 text-2xl font-semibold text-slate-950">{{ localRegistrationCount }}</div>
            </div>
            <div class="rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm backdrop-blur">
              <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Next 30d</div>
              <div class="mt-1 text-2xl font-semibold text-slate-950">{{ upcomingThirtyDayCount }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="px-4 py-5 sm:px-6 lg:px-8">
        <div
          v-if="error"
          class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          Error loading events: {{ error }}
        </div>

        <div
          class="mt-0 grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-5"
          :class="error ? 'mt-4' : ''"
        >
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label class="relative flex-1">
              <span class="sr-only">Search events</span>
              <MagnifyingGlassIcon class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search by name, venue, city, or game"
                class="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            <div class="grid grid-cols-2 gap-3 sm:w-auto sm:grid-cols-3">
              <select
                v-model="selectedTimeWindow"
                class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              >
                <option value="all">Any date</option>
                <option value="14">Next 14 days</option>
                <option value="30">Next 30 days</option>
                <option value="90">Next 90 days</option>
              </select>

              <button
                type="button"
                class="rounded-2xl border px-4 py-3 text-sm font-medium transition"
                :class="onlyRegisterable ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'"
                @click="onlyRegisterable = !onlyRegisterable"
              >
                Registerable
              </button>

              <button
                type="button"
                class="col-span-2 rounded-2xl border px-4 py-3 text-sm font-medium transition sm:col-span-1"
                :class="hasActiveFilters ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'"
                :disabled="!hasActiveFilters"
                @click="resetFilters"
              >
                Clear filters
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <div class="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Source
              </div>
              <div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                <button
                  v-for="option in sourceOptions"
                  :key="option.value"
                  type="button"
                  class="whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition"
                  :class="selectedSource === option.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'"
                  @click="selectedSource = option.value"
                >
                  {{ option.label }}
                  <span class="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs" :class="selectedSource === option.value ? 'bg-white/20 text-white' : 'text-slate-500'">
                    {{ option.count }}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <div class="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Type
              </div>
              <div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                <button
                  v-for="option in typeOptions"
                  :key="option.value"
                  type="button"
                  class="whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition"
                  :class="selectedType === option.value ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'"
                  @click="selectedType = option.value"
                >
                  {{ option.label }}
                  <span class="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs" :class="selectedType === option.value ? 'bg-white/20 text-white' : 'text-slate-500'">
                    {{ option.count }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="border-t border-slate-200/80 px-4 py-5 sm:px-6 lg:px-8">
        <div v-if="isLoading" class="flex min-h-[18rem] items-center justify-center">
          <div class="flex flex-col items-center gap-3 text-slate-600">
            <div class="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"></div>
            <span class="text-sm font-medium">Loading event feed...</span>
          </div>
        </div>

        <div
          v-else-if="filteredEvents.length === 0"
          class="flex min-h-[18rem] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 px-6 text-center"
        >
          <CalendarIcon class="h-12 w-12 text-slate-300" />
          <h3 class="mt-4 text-lg font-semibold text-slate-900">No matching events</h3>
          <p class="mt-2 max-w-md text-sm leading-6 text-slate-600">
            Try widening the date range or clearing one of the filters.
          </p>
        </div>

        <div v-else class="space-y-8">
          <section v-for="group in groupedEvents" :key="group.key" class="space-y-4">
            <div class="flex items-end justify-between gap-3">
              <div>
                <h3 class="text-lg font-semibold text-slate-950 sm:text-xl">{{ group.label }}</h3>
                <p class="text-sm text-slate-500">{{ group.events.length }} events</p>
              </div>
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
              <article
                v-for="event in group.events"
                :key="event.key"
                class="group rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-5"
              >
                <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div class="flex min-w-0 gap-4">
                    <div
                      class="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-2xl text-center"
                      :class="event.dateBadgeClass"
                    >
                      <div class="text-2xl font-semibold leading-none">{{ formatDay(event.date) }}</div>
                      <div class="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em]">{{ formatMonth(event.date) }}</div>
                    </div>

                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]" :class="event.sourceBadgeClass">
                          {{ event.sourceLabel }}
                        </span>
                        <span class="rounded-full border px-3 py-1 text-xs font-medium" :class="event.typeBadgeClass">
                          {{ event.typeLabel }}
                        </span>
                        <span
                          v-if="event.gameLabel"
                          class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                        >
                          {{ event.gameLabel }}
                        </span>
                      </div>

                      <h4 class="mt-3 text-lg font-semibold leading-tight text-slate-950 sm:text-xl">
                        {{ event.title }}
                      </h4>

                      <div class="mt-3 space-y-2 text-sm text-slate-600">
                        <div class="flex items-start gap-2">
                          <ClockIcon class="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                          <span>{{ formatEventDate(event.date) }}</span>
                        </div>
                        <div class="flex items-start gap-2">
                          <BuildingOfficeIcon class="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                          <span>{{ event.venue }}</span>
                        </div>
                        <div v-if="event.locationLabel" class="flex items-start gap-2">
                          <MapPinIcon class="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                          <span>{{ event.locationLabel }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-2 sm:max-w-[13rem] sm:justify-end">
                    <div v-if="event.priceLabel" class="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                      {{ event.priceLabel }}
                    </div>
                    <div v-if="event.capacityLabel" class="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">
                      {{ event.capacityLabel }}
                    </div>
                    <div v-if="event.requiresDecklist" class="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                      Decklist required
                    </div>
                  </div>
                </div>

                <p v-if="event.description" class="mt-4 text-sm leading-6 text-slate-600">
                  {{ event.description }}
                </p>

                <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    class="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                    @click="openEventDetails(event)"
                  >
                    <InformationCircleIcon class="h-5 w-5" />
                    Details
                  </button>

                  <div class="flex flex-col gap-3 sm:flex-row">
                    <NuxtLink
                      v-if="event.internalLink"
                      :to="event.internalLink"
                      class="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white no-underline transition hover:bg-slate-800"
                    >
                      <TicketIcon class="h-5 w-5" />
                      {{ event.ctaLabel }}
                    </NuxtLink>
                    <a
                      v-else-if="event.externalLink"
                      :href="event.externalLink"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white no-underline transition hover:bg-slate-800"
                    >
                      <ArrowTopRightOnSquareIcon class="h-5 w-5" />
                      {{ event.ctaLabel }}
                    </a>
                    <button
                      v-else
                      type="button"
                      class="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500"
                      disabled
                    >
                      No registration link
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div
      v-if="selectedEvent"
      class="fixed inset-0 z-50 flex items-end bg-slate-950/55 p-0 sm:items-center sm:p-6"
      @click="closeEventDetails"
    >
      <div
        class="max-h-[92vh] w-full overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:mx-auto sm:max-w-3xl sm:rounded-[2rem]"
        @click.stop
      >
        <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]" :class="selectedEvent.sourceBadgeClass">
                {{ selectedEvent.sourceLabel }}
              </span>
              <span class="rounded-full border px-3 py-1 text-xs font-medium" :class="selectedEvent.typeBadgeClass">
                {{ selectedEvent.typeLabel }}
              </span>
            </div>
            <h3 class="mt-3 text-xl font-semibold text-slate-950 sm:text-2xl">{{ selectedEvent.title }}</h3>
          </div>

          <button
            type="button"
            class="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            @click="closeEventDetails"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <div class="max-h-[calc(92vh-5.5rem)] overflow-y-auto px-5 py-5 sm:px-6">
          <div class="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
            <div class="space-y-5">
              <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="flex gap-3">
                    <ClockIcon class="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-400" />
                    <div>
                      <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Date & time</div>
                      <div class="mt-1 text-sm font-medium text-slate-900">{{ formatEventDate(selectedEvent.date) }}</div>
                    </div>
                  </div>

                  <div class="flex gap-3">
                    <BuildingOfficeIcon class="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-400" />
                    <div>
                      <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Venue</div>
                      <div class="mt-1 text-sm font-medium text-slate-900">{{ selectedEvent.venue }}</div>
                    </div>
                  </div>

                  <div v-if="selectedEvent.locationLabel" class="flex gap-3">
                    <MapPinIcon class="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-400" />
                    <div>
                      <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Location</div>
                      <div class="mt-1 text-sm font-medium text-slate-900">{{ selectedEvent.locationLabel }}</div>
                    </div>
                  </div>

                  <div v-if="selectedEvent.streetAddress" class="flex gap-3">
                    <MapIcon class="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-400" />
                    <div>
                      <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Address</div>
                      <div class="mt-1 text-sm font-medium text-slate-900">{{ selectedEvent.streetAddress }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="selectedEvent.description" class="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">About this event</div>
                <p class="mt-3 text-sm leading-6 text-slate-700">{{ selectedEvent.description }}</p>
              </div>
            </div>

            <div class="space-y-4">
              <div class="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Registration</div>
                <div class="mt-4 space-y-3">
                  <div v-if="selectedEvent.priceLabel" class="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <span>Entry fee</span>
                    <span class="font-semibold text-slate-950">{{ selectedEvent.priceLabel }}</span>
                  </div>
                  <div v-if="selectedEvent.capacityLabel" class="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <span>Capacity</span>
                    <span class="font-semibold text-slate-950">{{ selectedEvent.capacityLabel }}</span>
                  </div>
                  <div v-if="selectedEvent.registrationDeadlineLabel" class="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <span>Deadline</span>
                    <span class="text-right font-semibold text-slate-950">{{ selectedEvent.registrationDeadlineLabel }}</span>
                  </div>
                  <div v-if="selectedEvent.requiresDecklist" class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                    Decklist submission is required for this event.
                  </div>
                </div>

                <div class="mt-4 flex flex-col gap-3">
                  <NuxtLink
                    v-if="selectedEvent.internalLink"
                    :to="selectedEvent.internalLink"
                    class="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white no-underline transition hover:bg-slate-800"
                  >
                    <TicketIcon class="h-5 w-5" />
                    {{ selectedEvent.ctaLabel }}
                  </NuxtLink>
                  <a
                    v-else-if="selectedEvent.externalLink"
                    :href="selectedEvent.externalLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white no-underline transition hover:bg-slate-800"
                  >
                    <ArrowTopRightOnSquareIcon class="h-5 w-5" />
                    {{ selectedEvent.ctaLabel }}
                  </a>
                </div>
              </div>

              <div class="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <div class="font-semibold">Quick filter tip</div>
                <p class="mt-2 leading-6">
                  Use the source chips for “Custom events” when you want local
                  tournaments only, or toggle “Registerable” to hide placeholders.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  ArrowTopRightOnSquareIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ClockIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  MapIcon,
  MapPinIcon,
  TicketIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";
import { getEventTypeLabel, parseEventTags, type TagType } from "~/types/eventTags";

interface ExternalEvent {
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
  hasLocalRegistration?: boolean;
}

interface CustomEventResponse {
  id: string;
  name: string;
  eventDate: string;
  venue: string;
  maxParticipants: number;
  participationFee?: number | null;
  registrationCount?: number;
  registrationDeadline?: string | null;
  requiresDecklist?: boolean;
  description?: string | null;
  status?: string;
  tagType?: string;
  tags?: unknown;
}

type EventSourceFilter = "all" | "custom" | "external" | "local";
type TimeWindowFilter = "all" | "14" | "30" | "90";

interface UnifiedEvent {
  key: string;
  id: string;
  title: string;
  date: string;
  source: "custom" | "external";
  sourceLabel: string;
  sourceBadgeClass: string;
  typeKey: string;
  typeLabel: string;
  typeBadgeClass: string;
  venue: string;
  locationLabel: string;
  country: string;
  streetAddress?: string;
  description?: string;
  gameLabel?: string;
  priceLabel?: string;
  capacityLabel?: string;
  requiresDecklist: boolean;
  registrationDeadlineLabel?: string;
  internalLink?: string;
  externalLink?: string;
  ctaLabel: string;
  isRegisterable: boolean;
  isLocalRegistration: boolean;
  searchableText: string;
  dateBadgeClass: string;
}

const searchQuery = ref("");
const selectedSource = ref<EventSourceFilter>("all");
const selectedType = ref("all");
const selectedTimeWindow = ref<TimeWindowFilter>("30");
const onlyRegisterable = ref(false);
const selectedEvent = ref<UnifiedEvent | null>(null);
const externalEvents = ref<ExternalEvent[]>([]);
const customEvents = ref<CustomEventResponse[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  await fetchEvents();
});

const fetchEvents = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const [externalResponse, customResponse] = await Promise.all([
      $fetch<{ events: ExternalEvent[] }>("/api/events/detailed"),
      $fetch<{ success: boolean; events: CustomEventResponse[] }>("/api/events/custom"),
    ]);

    externalEvents.value = externalResponse.events || [];
    customEvents.value = customResponse.success ? customResponse.events || [] : [];
  } catch (err) {
    console.error("Failed to load events:", err);
    error.value = err instanceof Error ? err.message : "Failed to load events";
  } finally {
    isLoading.value = false;
  }
};

const normalizedEvents = computed<UnifiedEvent[]>(() => {
  const external = externalEvents.value.map((event) => normalizeExternalEvent(event));
  const custom = customEvents.value.map((event) => normalizeCustomEvent(event));

  return [...external, ...custom].sort((first, second) => {
    return new Date(first.date).getTime() - new Date(second.date).getTime();
  });
});

const sourceOptions = computed(() => {
  const events = normalizedEvents.value;
  return [
    { value: "all", label: "All events", count: events.length },
    {
      value: "custom",
      label: "Custom events",
      count: events.filter((event) => event.source === "custom").length,
    },
    {
      value: "external",
      label: "Official feed",
      count: events.filter((event) => event.source === "external").length,
    },
    {
      value: "local",
      label: "Local registration",
      count: events.filter((event) => event.isLocalRegistration).length,
    },
  ] satisfies Array<{ value: EventSourceFilter; label: string; count: number }>;
});

const typeOptions = computed(() => {
  const counts = new Map<string, { label: string; count: number }>();

  for (const event of normalizedEvents.value) {
    const existing = counts.get(event.typeKey);
    if (existing) {
      existing.count += 1;
      continue;
    }

    counts.set(event.typeKey, {
      label: event.typeLabel,
      count: 1,
    });
  }

  return [
    { value: "all", label: "All types", count: normalizedEvents.value.length },
    ...Array.from(counts.entries())
      .map(([value, data]) => ({ value, label: data.label, count: data.count }))
      .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label)),
  ];
});

const filteredEvents = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const timeWindowDays = selectedTimeWindow.value === "all" ? null : Number(selectedTimeWindow.value);
  const now = new Date();
  const latestDate = timeWindowDays === null ? null : addDays(now, timeWindowDays);

  return normalizedEvents.value.filter((event) => {
    const eventDate = new Date(event.date);

    if (selectedSource.value === "custom" && event.source !== "custom") {
      return false;
    }

    if (selectedSource.value === "external" && event.source !== "external") {
      return false;
    }

    if (selectedSource.value === "local" && !event.isLocalRegistration) {
      return false;
    }

    if (selectedType.value !== "all" && event.typeKey !== selectedType.value) {
      return false;
    }

    if (onlyRegisterable.value && !event.isRegisterable) {
      return false;
    }

    if (latestDate && (eventDate < startOfDay(now) || eventDate > latestDate)) {
      return false;
    }

    if (query && !event.searchableText.includes(query)) {
      return false;
    }

    return true;
  });
});

const groupedEvents = computed(() => {
  const groups = new Map<string, { key: string; label: string; events: UnifiedEvent[] }>();

  for (const event of filteredEvents.value) {
    const groupDate = new Date(event.date);
    const key = `${groupDate.getFullYear()}-${groupDate.getMonth()}`;
    const existing = groups.get(key);

    if (existing) {
      existing.events.push(event);
      continue;
    }

    groups.set(key, {
      key,
      label: groupDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      events: [event],
    });
  }

  return Array.from(groups.values());
});

const customEventsCount = computed(() => normalizedEvents.value.filter((event) => event.source === "custom").length);
const localRegistrationCount = computed(() => normalizedEvents.value.filter((event) => event.isLocalRegistration).length);
const upcomingThirtyDayCount = computed(() => {
  const now = startOfDay(new Date());
  const inThirtyDays = addDays(now, 30);
  return normalizedEvents.value.filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate >= now && eventDate <= inThirtyDays;
  }).length;
});

const hasActiveFilters = computed(() => {
  return (
    searchQuery.value.trim().length > 0 ||
    selectedSource.value !== "all" ||
    selectedType.value !== "all" ||
    selectedTimeWindow.value !== "30" ||
    onlyRegisterable.value
  );
});

const resetFilters = () => {
  searchQuery.value = "";
  selectedSource.value = "all";
  selectedType.value = "all";
  selectedTimeWindow.value = "30";
  onlyRegisterable.value = false;
};

const openEventDetails = (event: UnifiedEvent) => {
  selectedEvent.value = event;
};

const closeEventDetails = () => {
  selectedEvent.value = null;
};

function normalizeExternalEvent(event: ExternalEvent): UnifiedEvent {
  const venue = stripHtmlTags(event.venue) || "Venue TBA";
  const locationParts = [stripHtmlTags(event.location), stripHtmlTags(event.country)].filter(Boolean);
  const typeKey = normalizeTypeKey(event.type || iconToTypeKey(event.icon));
  const typeLabel = event.type || fallbackTypeLabel(typeKey);
  const hasLocalRegistration = Boolean(event.hasLocalRegistration);
  const internalLink = hasLocalRegistration ? `/events/register/${event.id}` : undefined;
  const externalLink = !hasLocalRegistration && isValidExternalLink(event.link) ? event.link : undefined;

  return {
    key: `external-${event.id}`,
    id: event.id,
    title: stripHtmlTags(event.title) || "External Event",
    date: normalizeDateValue(event.dateTime),
    source: "external",
    sourceLabel: hasLocalRegistration ? "Official feed + local signup" : "Official feed",
    sourceBadgeClass: hasLocalRegistration ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-700",
    typeKey,
    typeLabel,
    typeBadgeClass: getTypeBadgeClass(typeKey),
    venue,
    locationLabel: locationParts.join(", "),
    country: stripHtmlTags(event.country),
    streetAddress: stripHtmlTags(event.streetAddress || "") || undefined,
    description: undefined,
    gameLabel: "Pokemon TCG",
    priceLabel: formatExternalPrice(event.cost),
    capacityLabel: undefined,
    requiresDecklist: false,
    registrationDeadlineLabel: undefined,
    internalLink,
    externalLink,
    ctaLabel: hasLocalRegistration ? "Open registration" : externalLink ? "Visit registration" : "Details only",
    isRegisterable: Boolean(internalLink || externalLink),
    isLocalRegistration: hasLocalRegistration,
    searchableText: [
      event.title,
      event.type,
      venue,
      event.location,
      event.country,
      "pokemon tcg",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
    dateBadgeClass: getDateBadgeClass(typeKey, "external"),
  };
}

function normalizeCustomEvent(event: CustomEventResponse): UnifiedEvent {
  const parsedTags = event.tagType ? parseEventTags(event.tags, event.tagType as TagType) : null;
  const rawType = parsedTags?.type || "custom";
  const typeKey = normalizeTypeKey(rawType);
  const gameLabel = parsedTags?.game || formatGameLabel(event.tagType);
  const capacityLabel =
    typeof event.maxParticipants === "number"
      ? `${event.registrationCount || 0}/${event.maxParticipants} registered`
      : undefined;

  return {
    key: `custom-${event.id}`,
    id: event.id,
    title: stripHtmlTags(event.name) || "Custom Event",
    date: normalizeDateValue(event.eventDate),
    source: "custom",
    sourceLabel: "Custom event",
    sourceBadgeClass: "bg-emerald-100 text-emerald-800",
    typeKey,
    typeLabel: formatCustomTypeLabel(rawType),
    typeBadgeClass: getTypeBadgeClass(typeKey),
    venue: stripHtmlTags(event.venue) || "Venue TBA",
    locationLabel: "",
    country: "",
    description: stripHtmlTags(event.description || "") || undefined,
    gameLabel,
    priceLabel: formatCustomPrice(event.participationFee),
    capacityLabel,
    requiresDecklist: Boolean(event.requiresDecklist),
    registrationDeadlineLabel: event.registrationDeadline ? formatCompactDate(event.registrationDeadline) : undefined,
    internalLink: `/events/${event.id}`,
    externalLink: undefined,
    ctaLabel: "View event",
    isRegisterable: true,
    isLocalRegistration: true,
    searchableText: [
      event.name,
      event.venue,
      gameLabel,
      formatCustomTypeLabel(rawType),
      parsedTags?.host,
      parsedTags?.format,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
    dateBadgeClass: getDateBadgeClass(typeKey, "custom"),
  };
}

function normalizeDateValue(value: string): string {
  return new Date(value).toISOString();
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function formatDay(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", { day: "2-digit" });
}

function formatMonth(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", { month: "short" });
}

function formatEventDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCompactDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeTypeKey(value?: string): string {
  return (value || "custom")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") || "custom";
}

function iconToTypeKey(icon?: string): string {
  if (icon === "cup") return "league_cup";
  if (icon === "chall") return "league_challenge";
  if (icon === "pre") return "pre_release";
  if (icon === "friendly") return "friendly";
  return "custom";
}

function fallbackTypeLabel(typeKey: string): string {
  switch (typeKey) {
    case "league_cup":
      return "League Cup";
    case "league_challenge":
      return "League Challenge";
    case "pre_release":
      return "Pre-release";
    case "friendly":
      return "Friendly";
    default:
      return "Event";
  }
}

function formatCustomTypeLabel(value?: string): string {
  if (!value) {
    return "Custom Event";
  }

  if (value === "local_tournament") {
    return "Local Tournament";
  }

  return getEventTypeLabel(value) || value;
}

function formatGameLabel(tagType?: string): string | undefined {
  if (!tagType) return "Custom";
  if (tagType === "pokemon") return "Pokemon TCG";
  if (tagType === "riftbound") return "Riftbound";
  return "Custom";
}

function formatExternalPrice(value?: string): string | undefined {
  const cleaned = stripHtmlTags(value || "");
  if (!cleaned || cleaned === "?" || cleaned.toLowerCase() === "n/a") {
    return undefined;
  }
  return cleaned;
}

function formatCustomPrice(value?: number | null): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (value === 0) {
    return "Free";
  }

  return `EUR ${value}`;
}

function getTypeBadgeClass(typeKey: string): string {
  switch (typeKey) {
    case "league_cup":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "league_challenge":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "pre_release":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "local":
    case "local_tournament":
    case "friendly":
      return "border-slate-200 bg-slate-50 text-slate-700";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
}

function getDateBadgeClass(typeKey: string, source: "custom" | "external"): string {
  if (source === "custom") {
    return "bg-emerald-600 text-white";
  }

  switch (typeKey) {
    case "league_cup":
      return "bg-rose-600 text-white";
    case "league_challenge":
      return "bg-sky-600 text-white";
    case "pre_release":
      return "bg-amber-500 text-white";
    default:
      return "bg-slate-800 text-white";
  }
}

function isValidExternalLink(link?: string): boolean {
  return Boolean(link && link !== "//");
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}
</script>
