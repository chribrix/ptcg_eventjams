<template>
  <section class="w-full max-w-6xl mx-auto">
    <div class="app-panel overflow-hidden rounded-[1.25rem] sm:rounded-[2rem]">
      <AppPageHeader
        embedded
        heading-tag="h2"
        :eyebrow="t('eventList.eyebrow')"
        :title="t('eventList.title')"
        :subtitle="t('eventList.subtitle')"
      >
        <template #aside>
          <div class="grid grid-cols-2 gap-3 lg:min-w-[16rem]">
            <div
              class="app-stat-card rounded-2xl p-3 backdrop-blur"
            >
              <div class="text-xs uppercase tracking-[0.2em] app-text-muted-soft">
                {{ t("eventList.shown") }}
              </div>
              <div class="mt-1 text-2xl font-semibold app-text-primary">
                {{ filteredEvents.length }}
              </div>
            </div>
            <div
              class="app-stat-card rounded-2xl p-3 backdrop-blur"
            >
              <div class="text-xs uppercase tracking-[0.2em] app-text-muted-soft">
                {{ t("eventList.next30Days") }}
              </div>
              <div class="mt-1 text-2xl font-semibold app-text-primary">
                {{ upcomingThirtyDayCount }}
              </div>
            </div>
          </div>
        </template>
      </AppPageHeader>

      <div class="px-2.5 py-3 sm:px-6 sm:py-5 lg:px-8">
        <p
          v-if="!user"
          class="mb-3 text-xs leading-5 app-text-secondary-soft sm:text-sm"
        >
          {{ t("eventList.guestBookmarkHint") }}
          <NuxtLink to="/register" class="font-semibold underline">
            {{ t("eventList.guestBookmarkHintCta") }}
          </NuxtLink>
        </p>

        <div
          v-if="error"
          class="app-feedback-danger rounded-2xl px-4 py-3 text-sm"
        >
          {{ t("eventList.errorLoading") }}: {{ error }}
        </div>

        <div
          class="event-list-filter-panel mt-0 hidden gap-4 rounded-[1.75rem] border p-4 shadow-sm sm:grid sm:p-5"
          :class="error ? 'mt-4' : ''"
        >
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label class="relative flex-1">
              <span class="sr-only">{{ t("eventList.searchLabel") }}</span>
              <MagnifyingGlassIcon
                class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 app-text-muted"
              />
              <input
                v-model="searchQuery"
                type="text"
                :placeholder="t('eventList.searchPlaceholder')"
                class="app-input w-full rounded-2xl py-3 pl-12 pr-4 text-sm"
              />
            </label>

            <div class="grid grid-cols-2 gap-3 sm:w-auto sm:grid-cols-2">
              <select
                v-model="selectedTimeWindow"
                class="app-input rounded-2xl px-4 py-3 text-sm"
              >
                <option value="all">{{ t("eventList.timeWindowAll") }}</option>
                <option value="14">{{ t("eventList.timeWindow14") }}</option>
                <option value="30">{{ t("eventList.timeWindow30") }}</option>
                <option value="90">{{ t("eventList.timeWindow90") }}</option>
              </select>

              <button
                type="button"
                class="rounded-2xl border px-4 py-3 text-sm font-medium transition"
                :class="
                  hasActiveFilters
                    ? 'app-btn-neutral'
                    : 'app-border app-surface-0 app-text-muted cursor-not-allowed'
                "
                :disabled="!hasActiveFilters"
                @click="resetFilters"
              >
                {{ t("eventList.clearFilters") }}
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <div
                class="mb-2 text-xs font-semibold uppercase tracking-[0.24em] app-text-muted-soft"
              >
                {{ t("eventList.type") }}
              </div>
              <div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                <button
                  v-for="option in typeOptions"
                  :key="option.value"
                  type="button"
                  class="whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition"
                  :class="
                    selectedType === option.value
                      ? 'app-chip-active'
                      : 'app-chip-inactive hover:border-[var(--app-accent)] hover:bg-[var(--app-surface-2)]'
                  "
                  @click="selectedType = option.value"
                >
                  {{ option.label }}
                  <span
                    class="ml-2 rounded-full px-2 py-0.5 text-xs"
                    :class="
                      selectedType === option.value
                        ? 'event-list-chip-count-active'
                        : 'event-list-chip-count'
                    "
                  >
                    {{ option.count }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="showMobileFilters"
            class="app-overlay fixed inset-0 z-40 sm:hidden"
            @click="showMobileFilters = false"
          />
        </Transition>

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-6 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="translate-y-6 opacity-0"
        >
          <div
            v-if="showMobileFilters"
            class="event-list-mobile-panel fixed inset-x-3 bottom-20 z-50 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-[1.5rem] border p-4 shadow-2xl sm:hidden"
          >
            <div class="mb-4 flex items-center justify-between gap-3">
              <div>
                <div class="text-sm font-semibold app-text-primary">
                  {{ t("eventList.filters") }}
                </div>
                <div class="text-xs app-text-muted-soft">
                  {{ t("eventList.filtersSubtitle") }}
                </div>
              </div>
              <button
                type="button"
                class="app-btn-neutral rounded-xl px-3 py-2 text-xs font-medium"
                @click="showMobileFilters = false"
              >
                {{ t("common.cancel") }}
              </button>
            </div>

            <div class="grid gap-3">
              <label class="relative">
                <span class="sr-only">{{ t("eventList.searchLabel") }}</span>
                <MagnifyingGlassIcon
                  class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 app-text-muted"
                />
                <input
                  v-model="searchQuery"
                  type="text"
                  :placeholder="t('eventList.searchPlaceholder')"
                  class="app-input w-full rounded-2xl py-3 pl-12 pr-4 text-sm"
                />
              </label>

              <div class="grid gap-3">
                <select
                  v-model="selectedTimeWindow"
                  class="app-input rounded-2xl px-4 py-3 text-sm"
                >
                  <option value="all">{{ t("eventList.timeWindowAll") }}</option>
                  <option value="14">{{ t("eventList.timeWindow14") }}</option>
                  <option value="30">{{ t("eventList.timeWindow30") }}</option>
                  <option value="90">{{ t("eventList.timeWindow90") }}</option>
                </select>
              </div>

              <div>
                <div
                  class="mb-2 text-xs font-semibold uppercase tracking-[0.24em] app-text-muted-soft"
                >
                  {{ t("eventList.type") }}
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="option in typeOptions"
                    :key="`mobile-${option.value}`"
                    type="button"
                    class="flex min-w-0 items-center justify-between gap-2 rounded-full border px-4 py-2 text-sm font-medium transition"
                    :class="
                      selectedType === option.value
                        ? 'app-chip-active'
                        : 'app-chip-inactive hover:border-[var(--app-accent)] hover:bg-[var(--app-surface-2)]'
                    "
                    @click="selectedType = option.value"
                  >
                    <span class="truncate">{{ option.label }}</span>
                    <span
                      class="shrink-0 rounded-full px-2 py-0.5 text-xs"
                      :class="
                        selectedType === option.value
                          ? 'event-list-chip-count-active'
                          : 'event-list-chip-count'
                      "
                    >
                      {{ option.count }}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                class="rounded-2xl border px-4 py-3 text-sm font-medium transition"
                :class="
                  hasActiveFilters
                    ? 'app-btn-neutral'
                    : 'app-border app-surface-0 app-text-muted cursor-not-allowed'
                "
                :disabled="!hasActiveFilters"
                @click="resetFilters"
              >
                {{ t("eventList.clearFilters") }}
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <div class="border-t app-border px-2.5 py-3 sm:px-6 sm:py-5 lg:px-8">
        <AppStatePanel
          v-if="isLoading"
          kind="loading"
          :message="t('eventList.loading')"
        />

        <AppStatePanel
          v-else-if="filteredEvents.length === 0"
          kind="empty"
          :title="t('eventList.noMatchesTitle')"
          :message="t('eventList.noMatchesText')"
        />

        <div v-else class="space-y-5 sm:space-y-8">
          <section
            v-for="group in groupedEvents"
            :key="group.key"
            class="space-y-3 sm:space-y-4"
          >
            <div class="flex items-end justify-between gap-3">
              <div>
                <h3 class="text-base font-semibold app-text-primary sm:text-xl">
                  {{ group.label }}
                </h3>
                <p class="text-xs app-text-muted-soft sm:text-sm">
                  {{ t("eventList.eventCount", { count: group.events.length }) }}
                </p>
              </div>
            </div>

            <div class="event-list-grid">
              <AppEventCard
                v-for="event in group.events"
                :key="event.key"
                class="event-list-card group"
                :class="getEventCardClass(event)"
                :style="getEventCardStyle(event)"
                bare
                interactive
                @click="openEventDetails(event)"
                @keydown.enter.prevent="openEventDetails(event)"
                @keydown.space.prevent="openEventDetails(event)"
              >
                <div class="event-list-card-main">
                  <div class="event-list-card-primary">
                    <div
                      class="event-list-date"
                      :class="event.dateBadgeClass"
                    >
                      <div class="event-list-date-day">
                        {{ formatDay(event.date) }}
                      </div>
                      <div class="event-list-date-month">
                        {{ formatMonth(event.date) }}
                      </div>
                    </div>

                    <div class="event-list-card-copy">
                      <div class="event-list-badges">
                        <span
                          class="rounded-full border px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs"
                          :class="event.typeBadgeClass"
                        >
                          {{ event.typeLabel }}
                        </span>
                        <span
                          v-if="event.gameLabel"
                          class="event-list-game-pill rounded-full border px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs"
                        >
                          {{ event.gameLabel }}
                        </span>
                        <span
                          v-if="event.waitlistStatus === 'waitlist'"
                          class="app-warn-card rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:px-3 sm:text-xs"
                        >
                          Auf Warteliste
                        </span>
                        <span
                          v-if="event.waitlistStatus === 'waitlist_claim'"
                          class="app-info-card rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:px-3 sm:text-xs"
                        >
                          Claim aktiv
                        </span>
                      </div>

                      <h4
                        class="event-list-title"
                      >
                        {{ event.title }}
                      </h4>

                      <div class="event-list-meta">
                        <div class="flex items-start gap-2">
                          <ClockIcon
                            class="mt-0.5 h-3.5 w-3.5 flex-shrink-0 app-text-muted sm:h-4 sm:w-4"
                          />
                          <span>{{ formatEventDate(event.date) }}</span>
                        </div>
                        <div class="flex items-start gap-2">
                          <BuildingOfficeIcon
                            class="mt-0.5 h-3.5 w-3.5 flex-shrink-0 app-text-muted sm:h-4 sm:w-4"
                          />
                          <span>{{ event.venue }}</span>
                        </div>
                        <div
                          v-if="event.locationLabel"
                          class="flex items-start gap-2"
                        >
                          <MapPinIcon
                            class="mt-0.5 h-3.5 w-3.5 flex-shrink-0 app-text-muted sm:h-4 sm:w-4"
                          />
                          <span>{{ event.locationLabel }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="event-list-card-stats">
                    <div
                      v-if="event.priceLabel"
                      class="app-info-card rounded-xl border px-2.5 py-1.5 text-xs font-semibold sm:rounded-2xl sm:px-3 sm:py-2 sm:text-sm"
                    >
                      {{ event.priceLabel }}
                    </div>
                    <div
                      v-if="event.capacityLabel"
                      class="app-feedback-info rounded-xl border px-2.5 py-1.5 text-xs font-semibold sm:rounded-2xl sm:px-3 sm:py-2 sm:text-sm"
                    >
                      {{ event.capacityLabel }}
                    </div>
                    <div
                      v-if="event.requiresDecklist"
                      class="app-warn-card rounded-xl border px-2.5 py-1.5 text-xs font-semibold sm:rounded-2xl sm:px-3 sm:py-2 sm:text-sm"
                    >
                      {{ t("events.decklistRequired") }}
                    </div>
                  </div>
                </div>

                <p
                  v-if="event.description"
                  class="event-list-description"
                >
                  {{ event.description }}
                </p>

                <div
                  class="event-list-card-footer"
                >
                  <span class="text-xs font-medium app-text-muted-soft">
                    {{ t("eventList.tapForDetails") }}
                  </span>
                  <button
                    v-if="shouldShowBookmark(event)"
                    type="button"
                    class="inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition sm:px-4 sm:text-sm"
                    :class="
                      isBookmarked(event.id)
                        ? 'app-chip-active'
                        : 'app-btn-neutral'
                    "
                    :disabled="bookmarkPendingId === event.id"
                    @click.stop="toggleBookmark(event)"
                  >
                    <BookmarkIcon class="h-4 w-4" />
                    {{
                      isBookmarked(event.id)
                        ? t("eventList.bookmarked")
                        : t("eventList.bookmark")
                    }}
                  </button>
                </div>
              </AppEventCard>
            </div>
          </section>
        </div>
      </div>
    </div>

    <button
      type="button"
      aria-label="Open filters"
      class="app-fab-primary fixed bottom-5 right-5 z-[60] inline-flex h-14 w-14 items-center justify-center rounded-full sm:hidden"
      @click="showMobileFilters = true"
    >
      <FunnelIcon class="h-5 w-5" />
    </button>

    <AppModal
      v-if="selectedEvent"
      :title="selectedEvent.title"
      :eyebrow="selectedEvent.typeLabel"
      :subtitle="`${formatEventDate(selectedEvent.date)} · ${selectedEvent.venue}`"
      :accent="getEventTypeColor(selectedEvent).accent"
      size="xl"
      bottom-sheet-mobile
      @close="closeEventDetails"
    >
        <div class="event-list-details-scroll" :style="getEventCardStyle(selectedEvent)">
          <div
            class="event-list-detail-grid"
          >
            <div class="event-list-detail-column">
              <div
                class="event-list-modal-section event-list-detail-facts"
              >
                <div class="event-list-facts-grid">
                  <div class="flex gap-3">
                    <ClockIcon
                      class="mt-0.5 h-5 w-5 flex-shrink-0 app-text-muted"
                    />
                    <div>
                      <div
                        class="text-xs font-semibold uppercase tracking-[0.18em] app-text-muted-soft"
                      >
                        {{ t("eventList.dateTime") }}
                      </div>
                      <div class="mt-1 text-sm font-medium app-text-primary">
                        {{ formatEventDate(selectedEvent.date) }}
                      </div>
                    </div>
                  </div>

                  <div class="flex gap-3">
                    <BuildingOfficeIcon
                      class="mt-0.5 h-5 w-5 flex-shrink-0 app-text-muted"
                    />
                    <div>
                      <div
                        class="text-xs font-semibold uppercase tracking-[0.18em] app-text-muted-soft"
                      >
                        {{ t("common.venue") }}
                      </div>
                      <div class="mt-1 text-sm font-medium app-text-primary">
                        {{ selectedEvent.venue }}
                      </div>
                    </div>
                  </div>

                  <div v-if="selectedEvent.locationLabel" class="flex gap-3">
                    <MapPinIcon
                      class="mt-0.5 h-5 w-5 flex-shrink-0 app-text-muted"
                    />
                    <div>
                      <div
                        class="text-xs font-semibold uppercase tracking-[0.18em] app-text-muted-soft"
                      >
                        {{ t("eventList.location") }}
                      </div>
                      <div class="mt-1 text-sm font-medium app-text-primary">
                        {{ selectedEvent.locationLabel }}
                      </div>
                    </div>
                  </div>

                  <div v-if="selectedEvent.streetAddress" class="flex gap-3">
                    <MapIcon
                      class="mt-0.5 h-5 w-5 flex-shrink-0 app-text-muted"
                    />
                    <div>
                      <div
                        class="text-xs font-semibold uppercase tracking-[0.18em] app-text-muted-soft"
                      >
                        {{ t("eventList.address") }}
                      </div>
                      <div class="mt-1 text-sm font-medium app-text-primary">
                        {{ selectedEvent.streetAddress }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-if="selectedEvent.description"
                class="event-list-modal-section"
              >
                <div
                  class="text-xs font-semibold uppercase tracking-[0.18em] app-text-muted-soft"
                >
                  {{ t("eventList.aboutEvent") }}
                </div>
                <p class="mt-3 text-sm leading-6 app-text-secondary-soft">
                  {{ selectedEvent.description }}
                </p>
              </div>
            </div>

            <div class="event-list-detail-column">
              <div
                class="event-list-modal-section"
              >
                <div
                  class="text-xs font-semibold uppercase tracking-[0.18em] app-text-muted-soft"
                >
                  {{ t("registration.title") }}
                </div>
                <div class="mt-4 space-y-3">
                  <div
                    v-if="selectedEvent.priceLabel"
                    class="flex items-center justify-between gap-3 rounded-2xl app-surface-2 px-4 py-3 text-sm app-text-secondary-soft"
                  >
                    <span>{{ t("eventList.entryFee") }}</span>
                    <span class="font-semibold app-text-primary">{{
                      selectedEvent.priceLabel
                    }}</span>
                  </div>
                  <div
                    v-if="selectedEvent.capacityLabel"
                    class="flex items-center justify-between gap-3 rounded-2xl app-surface-2 px-4 py-3 text-sm app-text-secondary-soft"
                  >
                    <span>{{ t("eventList.capacity") }}</span>
                    <span class="font-semibold app-text-primary">{{
                      selectedEvent.capacityLabel
                    }}</span>
                  </div>
                  <div
                    v-if="selectedEvent.registrationDeadlineLabel"
                    class="flex items-center justify-between gap-3 rounded-2xl app-surface-2 px-4 py-3 text-sm app-text-secondary-soft"
                  >
                    <span>{{ t("eventList.deadline") }}</span>
                    <span class="text-right font-semibold app-text-primary">{{
                      selectedEvent.registrationDeadlineLabel
                    }}</span>
                  </div>
                  <div
                    v-if="selectedEvent.requiresDecklist"
                    class="app-warn-card rounded-2xl border px-4 py-3 text-sm font-medium"
                  >
                    {{ t("eventList.decklistRequiredDetail") }}
                  </div>
                  <div
                    v-if="selectedEvent.waitlistStatus === 'waitlist'"
                    class="app-warn-card rounded-2xl border px-4 py-3 text-sm font-medium"
                  >
                    Du stehst auf der Warteliste.
                  </div>
                  <div
                    v-if="selectedEvent.waitlistStatus === 'waitlist_claim'"
                    class="app-info-card rounded-2xl border px-4 py-3 text-sm font-medium"
                  >
                    Dein Teilnahme-Claim ist aktiv.
                  </div>
                </div>

                <div class="mt-4 flex flex-col gap-3">
                  <button
                    v-if="shouldShowBookmark(selectedEvent)"
                    type="button"
                    class="inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition"
                    :class="
                      isBookmarked(selectedEvent.id)
                        ? 'app-chip-active'
                        : 'app-btn-neutral'
                    "
                    :disabled="bookmarkPendingId === selectedEvent.id"
                    @click="toggleBookmark(selectedEvent)"
                  >
                    <BookmarkIcon class="h-5 w-5" />
                    {{
                      isBookmarked(selectedEvent.id)
                        ? t("eventList.removeBookmark")
                        : t("eventList.bookmarkEvent")
                    }}
                  </button>
                  <NuxtLink
                    v-if="selectedEvent.internalLink"
                    :to="selectedEvent.internalLink"
                    class="app-action-button app-action-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold no-underline"
                  >
                    <TicketIcon class="h-5 w-5" />
                    {{ selectedEvent.ctaLabel }}
                  </NuxtLink>
                  <a
                    v-else-if="selectedEvent.externalLink"
                    :href="selectedEvent.externalLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="app-action-button app-action-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold no-underline"
                  >
                    <ArrowTopRightOnSquareIcon class="h-5 w-5" />
                    {{ selectedEvent.ctaLabel }}
                  </a>
                </div>
              </div>

              <div
                class="event-list-modal-section event-list-detail-tip text-sm app-text-secondary-soft"
              >
                <div class="font-semibold">{{ t("eventList.quickTipTitle") }}</div>
                <p class="mt-2 leading-6">
                  {{ t("eventList.quickFilterTip") }}
                </p>
              </div>
            </div>
          </div>
        </div>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  ArrowTopRightOnSquareIcon,
  BookmarkIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  MapIcon,
  MapPinIcon,
  TicketIcon,
} from "@heroicons/vue/24/outline";
import {
  formatDateInTimeZone,
  getUserTimeZone,
  parseDateTimeLocalInput,
} from "~/utils/eventDateTime";
import {
  parseEventTags,
  type TagType,
} from "~/types/eventTags";
import {
  getEventDisplayBadgeClass,
  getEventDisplayDateBadgeClass,
  getEventDisplayKey,
  getEventDisplayLabel,
} from "~/utils/eventDisplay";
import { notifyEventBookmarksUpdated } from "~/utils/eventBookmarks";
import { useEventBookmarks } from "~/composables/useEventBookmarks";
import type { EventBookmarkDraft } from "~/utils/guestEventBookmarks";
import { getEventColor } from "~/utils/eventColors";

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
  eventType?: string;
  tagType?: string;
  tags?: unknown;
}

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
  waitlistStatus?: "waitlist" | "waitlist_claim" | null;
}

const searchQuery = ref("");
const selectedType = ref("all");
const selectedTimeWindow = ref<TimeWindowFilter>("30");
const showMobileFilters = ref(false);
const selectedEvent = ref<UnifiedEvent | null>(null);
const externalEvents = ref<ExternalEvent[]>([]);
const customEvents = ref<CustomEventResponse[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const bookmarkedEventIds = ref<Set<string>>(new Set());
const bookmarkPendingId = ref<string | null>(null);
const waitlistStatuses = ref<Record<string, "waitlist" | "waitlist_claim">>({});
const user = useSupabaseUser();
const { loadBookmarkedEventIds, toggleBookmark: toggleUnifiedBookmark } =
  useEventBookmarks();
const { track: trackAnalytics } = useAnalytics();
const { t, locale } = useI18n();
const userTimeZone = getUserTimeZone();

let lockedScrollY = 0;
let isBackgroundScrollLocked = false;
let detailsHistoryEntryId: string | null = null;
const detailsHistoryKey = "__eventListDetails";

function lockBackgroundScroll(): void {
  if (!import.meta.client || isBackgroundScrollLocked) return;

  lockedScrollY = window.scrollY;
  isBackgroundScrollLocked = true;
  document.documentElement.style.overflow = "hidden";
  Object.assign(document.body.style, {
    position: "fixed",
    top: `-${lockedScrollY}px`,
    width: "100%",
    overflow: "hidden",
  });
}

function unlockBackgroundScroll(): void {
  if (!import.meta.client || !isBackgroundScrollLocked) return;

  document.documentElement.style.overflow = "";
  Object.assign(document.body.style, {
    position: "",
    top: "",
    width: "",
    overflow: "",
  });
  window.scrollTo(0, lockedScrollY);
  isBackgroundScrollLocked = false;
}

function closeDetailsFromHistory(): void {
  detailsHistoryEntryId = null;
  selectedEvent.value = null;
}

function handlePopState(): void {
  if (selectedEvent.value) {
    closeDetailsFromHistory();
  }
}

onMounted(async () => {
  window.addEventListener("popstate", handlePopState);
  await fetchEvents();
  await loadBookmarks();
  await fetchWaitlistStatuses();
});

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener("popstate", handlePopState);
  }
  unlockBackgroundScroll();
});

watch(selectedEvent, (event) => {
  if (event) {
    lockBackgroundScroll();
  } else {
    unlockBackgroundScroll();
  }
});

watch(
  () => user.value?.id,
  async () => {
    await fetchWaitlistStatuses();
  },
);

const fetchEvents = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const [externalResponse, customResponse] = await Promise.all([
      $fetch<{ events: ExternalEvent[] }>("/api/events/detailed"),
      $fetch<{ success: boolean; events: CustomEventResponse[] }>(
        "/api/events/custom",
      ),
    ]);

    externalEvents.value = externalResponse.events || [];
    customEvents.value = customResponse.success
      ? customResponse.events || []
      : [];
  } catch (err) {
    console.error("Failed to load events:", err);
    error.value = err instanceof Error ? err.message : t("eventList.errorLoading");
  } finally {
    isLoading.value = false;
  }
};

const fetchWaitlistStatuses = async () => {
  if (!user.value) {
    waitlistStatuses.value = {};
    return;
  }
  try {
    const response = await $fetch<{
      statuses: Record<string, "waitlist" | "waitlist_claim">;
    }>("/api/events/waitlist/my-statuses");
    waitlistStatuses.value = response.statuses || {};
  } catch {
    waitlistStatuses.value = {};
  }
};

const normalizedEvents = computed<UnifiedEvent[]>(() => {
  const external = externalEvents.value.map((event) =>
    normalizeExternalEvent(event),
  );
  const custom = customEvents.value.map((event) => normalizeCustomEvent(event));

  return [...external, ...custom].sort((first, second) => {
    if (first.isLocalRegistration !== second.isLocalRegistration) {
      return first.isLocalRegistration ? -1 : 1;
    }
    return new Date(first.date).getTime() - new Date(second.date).getTime();
  });
});

const timeWindowFilteredEvents = computed(() => {
  const timeWindowDays =
    selectedTimeWindow.value === "all"
      ? null
      : Number(selectedTimeWindow.value);
  const now = new Date();
  const latestDate =
    timeWindowDays === null ? null : addDays(now, timeWindowDays);

  return normalizedEvents.value.filter((event) => {
    if (event.waitlistStatus) {
      return true;
    }

    if (!latestDate) {
      return true;
    }

    const eventDate = new Date(event.date);
    return eventDate >= startOfDay(now) && eventDate <= latestDate;
  });
});

const typeOptions = computed(() => {
  const counts = new Map<string, { label: string; count: number }>();

  for (const event of timeWindowFilteredEvents.value) {
    const query = searchQuery.value.trim().toLowerCase();
    if (query && !event.searchableText.includes(query)) {
      continue;
    }

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
    {
      value: "all",
      label: t("eventList.allTypes"),
      count: timeWindowFilteredEvents.value.filter((event) => {
        const query = searchQuery.value.trim().toLowerCase();
        return !query || event.searchableText.includes(query);
      }).length,
    },
    ...Array.from(counts.entries())
      .map(([value, data]) => ({ value, label: data.label, count: data.count }))
      .sort(
        (first, second) =>
          second.count - first.count || first.label.localeCompare(second.label),
      ),
  ];
});

const filteredEvents = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return timeWindowFilteredEvents.value.filter((event) => {
    if (selectedType.value !== "all" && event.typeKey !== selectedType.value) {
      return false;
    }

    if (query && !event.searchableText.includes(query)) {
      return false;
    }

    return true;
  });
});

const groupedEvents = computed(() => {
  const groups = new Map<
    string,
    { key: string; label: string; events: UnifiedEvent[] }
  >();

  for (const event of filteredEvents.value) {
    const key = formatDateInTimeZone(
      event.date,
      {
        year: "numeric",
        month: "2-digit",
      },
      "en-CA",
      userTimeZone,
    );
    const existing = groups.get(key);

    if (existing) {
      existing.events.push(event);
      continue;
    }

    groups.set(key, {
      key,
      label: formatDateInTimeZone(
        event.date,
        {
          month: "long",
          year: "numeric",
        },
        locale.value,
        userTimeZone,
      ),
      events: [event],
    });
  }

  return Array.from(groups.values());
});

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
    selectedType.value !== "all" ||
    selectedTimeWindow.value !== "30"
  );
});

const resetFilters = () => {
  searchQuery.value = "";
  selectedType.value = "all";
  selectedTimeWindow.value = "30";
  showMobileFilters.value = false;
};

const openEventDetails = (event: UnifiedEvent) => {
  if (import.meta.client && !detailsHistoryEntryId) {
    detailsHistoryEntryId = `event-list-${Date.now()}`;
    const existingState =
      history.state && typeof history.state === "object" ? history.state : {};
    history.pushState(
      { ...existingState, [detailsHistoryKey]: detailsHistoryEntryId },
      "",
    );
  }
  selectedEvent.value = event;
};

const closeEventDetails = () => {
  const currentEntryId = detailsHistoryEntryId;
  selectedEvent.value = null;
  detailsHistoryEntryId = null;

  if (
    import.meta.client &&
    currentEntryId &&
    history.state?.[detailsHistoryKey] === currentEntryId
  ) {
    history.back();
  }
};

async function loadBookmarks(): Promise<void> {
  try {
    bookmarkedEventIds.value = await loadBookmarkedEventIds(Boolean(user.value));
  } catch (err) {
    console.error("Failed to load bookmarks:", err);
  }
}

function canBookmarkEvent(event: UnifiedEvent | null): boolean {
  if (!event) {
    return false;
  }

  return event.source === "external" && !event.isLocalRegistration;
}

function shouldShowBookmark(event: UnifiedEvent | null): boolean {
  if (!event) return false;
  return event.source === "external" && !event.isLocalRegistration;
}

function isBookmarked(eventId: string): boolean {
  return bookmarkedEventIds.value.has(eventId);
}

function getEventTypeColor(event: UnifiedEvent) {
  return getEventColor(event.typeKey);
}

function getEventCardStyle(event: UnifiedEvent) {
  const color = getEventTypeColor(event);
  return {
    "--event-list-card-accent": color.accent,
    "--event-list-card-soft": color.bg,
    "--event-list-card-type-text": color.text,
  } as Record<string, string>;
}

function getEventCardClass(event: UnifiedEvent): string {
  if (event.source === "external" && isBookmarked(event.id)) {
    return "app-bookmark-card";
  }
  return "app-border app-surface-0";
}

async function toggleBookmark(event: UnifiedEvent): Promise<void> {
  if (!shouldShowBookmark(event) || bookmarkPendingId.value) {
    return;
  }

  bookmarkPendingId.value = event.id;
  const wasBookmarked = isBookmarked(event.id);

  try {
    const bookmark: EventBookmarkDraft = {
      externalEventId: event.id,
      title: event.title,
      eventType: event.typeKey,
      venue: event.venue,
      location: event.locationLabel || null,
      country: event.country || null,
      eventDate: event.date,
      registrationUrl: event.externalLink || null,
      cost: event.priceLabel || null,
      streetAddress: event.streetAddress || null,
      icon: null,
    };

    await toggleUnifiedBookmark({
      isAuthenticated: Boolean(user.value),
      isBookmarked: wasBookmarked,
      bookmark,
    });

    if (!wasBookmarked) trackAnalytics("event_bookmarked", event.id);

    bookmarkedEventIds.value = await loadBookmarkedEventIds(Boolean(user.value));

    notifyEventBookmarksUpdated();
  } catch (err) {
    console.error("Failed to toggle bookmark:", err);
  } finally {
    bookmarkPendingId.value = null;
  }
}

function normalizeExternalEvent(event: ExternalEvent): UnifiedEvent {
  const venue = stripHtmlTags(event.venue) || "Venue TBA";
  const locationParts = [
    stripHtmlTags(event.location),
    stripHtmlTags(event.country),
  ].filter(Boolean);
  const typeKey = getEventDisplayKey({
    type: event.type,
    icon: event.icon,
  });
  const typeLabel = getEventDisplayLabel({
    type: event.type,
    icon: event.icon,
  });
  const hasLocalRegistration = Boolean(event.hasLocalRegistration);
  const internalLink = hasLocalRegistration
    ? `/events/register/${event.id}`
    : undefined;
  const externalLink =
    !hasLocalRegistration && isValidExternalLink(event.link)
      ? event.link
      : undefined;

  return {
    key: `external-${event.id}`,
    id: event.id,
    title: stripHtmlTags(event.title) || t("eventList.externalEventFallback"),
    date: normalizeExternalDateTime(event.dateTime, event.time),
    source: "external",
    sourceLabel: hasLocalRegistration
      ? t("eventList.sourceLocalSignup")
      : t("eventList.sourceOfficialFeed"),
    sourceBadgeClass: hasLocalRegistration
      ? "app-badge-accent"
      : "app-surface-2 app-text-secondary-soft",
    typeKey,
    typeLabel,
    typeBadgeClass: getEventDisplayBadgeClass({
      type: event.type,
      icon: event.icon,
    }),
    venue,
    locationLabel: locationParts.join(", "),
    country: stripHtmlTags(event.country),
    streetAddress: stripHtmlTags(event.streetAddress || "") || undefined,
    description: undefined,
    gameLabel: t("eventList.pokemonGame"),
    priceLabel: formatExternalPrice(event.cost),
    capacityLabel: undefined,
    requiresDecklist: false,
    registrationDeadlineLabel: undefined,
    internalLink,
    externalLink,
    ctaLabel: hasLocalRegistration
      ? t("eventList.openRegistration")
      : externalLink
        ? t("eventList.visitRegistration")
        : t("eventList.detailsOnly"),
    isRegisterable: Boolean(internalLink || externalLink),
    isLocalRegistration: hasLocalRegistration,
    searchableText: [
      event.title,
      event.type,
      venue,
      event.location,
      event.country,
      t("eventList.pokemonGame"),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
    dateBadgeClass: getEventDisplayDateBadgeClass({
      type: event.type,
      icon: event.icon,
    }),
    waitlistStatus: waitlistStatuses.value[event.id] || null,
  };
}

function normalizeCustomEvent(event: CustomEventResponse): UnifiedEvent {
  const parsedTags = event.tagType
    ? parseEventTags(event.tags, event.tagType as TagType)
    : null;
  const typeKey = getEventDisplayKey({
    isCustomEvent: true,
    eventType: event.eventType,
    tags: event.tags,
    tagType: event.tagType,
  });
  const gameLabel = parsedTags?.game || formatGameLabel(event.tagType);
  const capacityLabel =
    typeof event.maxParticipants === "number"
      ? t("eventList.capacityRegistered", {
          count: event.registrationCount || 0,
          max: event.maxParticipants,
        })
      : undefined;

  return {
    key: `custom-${event.id}`,
    id: event.id,
    title: stripHtmlTags(event.name) || t("eventList.customEventFallback"),
    date: normalizeDateValue(event.eventDate),
    source: "custom",
    sourceLabel: t("eventList.sourceCustomEvent"),
    sourceBadgeClass: "app-info-card",
    typeKey,
    typeLabel: getEventDisplayLabel({
      isCustomEvent: true,
      eventType: event.eventType,
      tags: event.tags,
      tagType: event.tagType,
    }),
    typeBadgeClass: getEventDisplayBadgeClass({
      isCustomEvent: true,
      eventType: event.eventType,
      tags: event.tags,
      tagType: event.tagType,
    }),
    venue: stripHtmlTags(event.venue) || "Venue TBA",
    locationLabel: "",
    country: "",
    description: stripHtmlTags(event.description || "") || undefined,
    gameLabel,
    priceLabel: formatCustomPrice(event.participationFee),
    capacityLabel,
    requiresDecklist: Boolean(event.requiresDecklist),
    registrationDeadlineLabel: event.registrationDeadline
      ? formatCompactDate(event.registrationDeadline)
      : undefined,
    internalLink: `/events/${event.id}`,
    externalLink: undefined,
    ctaLabel: t("eventList.viewEvent"),
    isRegisterable: true,
    isLocalRegistration: true,
    searchableText: [
      event.name,
      event.venue,
      gameLabel,
      getEventDisplayLabel({
        isCustomEvent: true,
        eventType: event.eventType,
        tags: event.tags,
        tagType: event.tagType,
      }),
      parsedTags?.host,
      parsedTags?.format,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
    dateBadgeClass: getEventDisplayDateBadgeClass({
      isCustomEvent: true,
      eventType: event.eventType,
      tags: event.tags,
      tagType: event.tagType,
    }),
    waitlistStatus: waitlistStatuses.value[event.id] || null,
  };
}

function normalizeDateValue(value: string): string {
  return value;
}

/** Pokedata returns the day and local start time separately. Treat that time as
 * Europe/Berlin time before rendering it in the viewer's time zone. */
function normalizeExternalDateTime(dateTime: string, time?: string): string {
  const dateMatch = dateTime.match(/^\d{4}-\d{2}-\d{2}/);
  const timeMatch = time?.match(/^(\d{2}:\d{2})/);

  if (!dateMatch || !timeMatch) {
    return normalizeDateValue(dateTime);
  }

  return parseDateTimeLocalInput(
    `${dateMatch[0]}T${timeMatch[1]}`,
    "Europe/Berlin",
  ).toISOString();
}

function stripHtmlTags(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDay(dateString: string): string {
  return formatDateInTimeZone(
    dateString,
    { day: "2-digit" },
    locale.value,
    userTimeZone,
  );
}

function formatMonth(dateString: string): string {
  return formatDateInTimeZone(
    dateString,
    { month: "short" },
    locale.value,
    userTimeZone,
  );
}

function formatEventDate(dateString: string): string {
  return formatDateInTimeZone(
    dateString,
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
    locale.value,
    userTimeZone,
  );
}

function formatCompactDate(dateString: string): string {
  return formatDateInTimeZone(
    dateString,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
    locale.value,
    userTimeZone,
  );
}

function formatGameLabel(tagType?: string): string | undefined {
  if (!tagType) return t("eventList.customEventFallback");
  if (tagType === "pokemon") return t("eventList.pokemonGame");
  if (tagType === "riftbound") return "Riftbound";
  return t("eventList.customEventFallback");
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
    return t("eventList.free");
  }

  return `EUR ${value}`;
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

watch(user, async () => {
  await loadBookmarks();
});
</script>

<style scoped>
.event-list-filter-panel {
  border-color: color-mix(in srgb, var(--app-accent) 18%, var(--app-border));
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--app-accent) 7%, var(--app-surface-0)) 0%,
      var(--app-surface-0) 58%,
      color-mix(in srgb, var(--app-button-amber-border) 6%, var(--app-surface-0)) 100%
    );
  box-shadow: var(--app-shadow-soft);
}

.event-list-mobile-panel {
  border-color: color-mix(in srgb, var(--app-accent) 18%, var(--app-border));
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--app-accent) 8%, var(--app-surface-0)) 0%,
      var(--app-surface-0) 100%
    );
  backdrop-filter: blur(18px);
}

.event-list-details-scroll {
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.event-list-grid {
  display: grid;
  gap: 0.8rem;
}

.event-list-chip-count {
  background: color-mix(in srgb, var(--app-surface-1) 88%, white);
  color: var(--app-text-secondary);
}

.event-list-chip-count-active {
  background: rgba(255, 255, 255, 0.18);
  color: currentColor;
}

.event-list-card {
  position: relative;
  overflow: hidden;
  min-height: 0;
  border-color: color-mix(in srgb, var(--event-list-card-accent) 30%, var(--app-border));
  background:
    radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--event-list-card-soft) 18%, transparent), transparent 42%),
    var(--app-surface-0);
  box-shadow: var(--app-shadow-soft);
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    border-color 0.2s,
    background-color 0.2s;
}

.event-list-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 0.3rem;
  background: var(--event-list-card-accent);
}

.event-list-card::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(
      circle at top right,
      color-mix(in srgb, var(--event-list-card-accent) 14%, transparent),
      transparent 36%
    );
}

.event-list-card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--event-list-card-accent) 36%, var(--app-border));
  box-shadow: var(--app-shadow-strong);
}

.event-list-card-main {
  display: grid;
  gap: 0.75rem;
}

.event-list-card-primary {
  display: grid;
  grid-template-columns: 3.25rem minmax(0, 1fr);
  gap: 0.7rem;
  min-width: 0;
}

.event-list-date {
  display: flex;
  width: 3.25rem;
  height: 3.25rem;
  flex: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 0.9rem;
  text-align: center;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--event-list-card-accent) 20%, transparent);
}

.event-list-date-day {
  font-size: 1.2rem;
  font-weight: 800;
  line-height: 1;
}

.event-list-date-month {
  margin-top: 0.3rem;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  line-height: 1;
  text-transform: uppercase;
}

.event-list-card-copy {
  min-width: 0;
}

.event-list-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.event-list-badges > :first-child {
  border-color: color-mix(in srgb, var(--event-list-card-accent) 48%, transparent);
  background: var(--event-list-card-soft);
  color: var(--event-list-card-type-text);
}

.event-list-title {
  margin: 0.55rem 0 0;
  color: var(--app-text-primary);
  font-size: 1rem;
  font-weight: 750;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.event-list-meta {
  display: grid;
  gap: 0.35rem;
  margin-top: 0.55rem;
  color: var(--app-text-secondary);
  font-size: 0.76rem;
  line-height: 1.35;
}

.event-list-meta span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.event-list-card-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding-left: 3.95rem;
}

.event-list-card-stats > div {
  border-color: color-mix(in srgb, var(--event-list-card-accent) 26%, var(--app-border));
  background: color-mix(in srgb, var(--event-list-card-soft) 12%, var(--app-surface-2));
}

.event-list-description {
  display: -webkit-box;
  margin: 0.75rem 0 0;
  overflow: hidden;
  color: var(--app-text-secondary);
  font-size: 0.78rem;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.event-list-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.8rem;
  padding-top: 0.7rem;
  border-top: 1px solid color-mix(in srgb, var(--event-list-card-accent) 18%, var(--app-border));
}

.event-list-game-pill {
  border-color: color-mix(in srgb, var(--app-accent) 10%, var(--app-border));
  background: color-mix(in srgb, var(--app-surface-2) 88%, var(--app-accent) 12%);
  color: var(--app-text-secondary);
}

.event-list-modal-section {
  padding: 0.9rem;
  border: 1px solid color-mix(in srgb, var(--event-list-card-accent) 20%, var(--app-border));
  border-radius: 1rem;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--event-list-card-soft) 8%, var(--app-bg-page)) 0%,
      var(--app-bg-page) 100%
    );
}

.event-list-detail-grid,
.event-list-detail-column,
.event-list-facts-grid {
  display: grid;
  gap: 0.75rem;
}

.event-list-detail-tip {
  display: none;
}

@media (min-width: 640px) {
  .event-list-grid {
    gap: 1rem;
  }

  .event-list-card {
    min-height: 15rem;
  }

  .event-list-card-main {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }

  .event-list-card-primary {
    grid-template-columns: 4.25rem minmax(0, 1fr);
    gap: 1rem;
  }

  .event-list-date {
    width: 4.25rem;
    height: 4.25rem;
    border-radius: 1.1rem;
  }

  .event-list-date-day {
    font-size: 1.65rem;
  }

  .event-list-date-month {
    font-size: 0.67rem;
  }

  .event-list-title {
    margin-top: 0.75rem;
    font-size: 1.2rem;
  }

  .event-list-meta {
    gap: 0.55rem;
    margin-top: 0.8rem;
    font-size: 0.88rem;
  }

  .event-list-card-stats {
    max-width: 12rem;
    justify-content: flex-end;
    padding-left: 0;
  }

  .event-list-description {
    font-size: 0.86rem;
  }

  .event-list-modal-section {
    padding: 1rem;
    border-radius: 1.2rem;
  }

  .event-list-facts-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .event-list-detail-tip {
    display: block;
  }
}

@media (min-width: 900px) {
  .event-list-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .event-list-detail-grid {
    grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.8fr);
    gap: 1rem;
  }

  .event-list-detail-column {
    align-content: start;
    gap: 1rem;
  }
}
</style>
