<template>
  <section class="w-full max-w-6xl mx-auto">
    <div class="app-panel overflow-hidden rounded-[2rem]">
      <div class="border-b app-border px-4 py-5 sm:px-6 lg:px-8">
        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div class="max-w-2xl">
            <p
              class="app-hero-eyebrow text-xs font-semibold uppercase tracking-[0.32em]"
            >
              {{ t("eventList.eyebrow") }}
            </p>
            <h2
              class="mt-2 text-2xl font-semibold tracking-tight app-text-primary sm:text-3xl"
            >
              {{ t("eventList.title") }}
            </h2>
            <p class="mt-2 text-sm leading-6 app-text-secondary-soft sm:text-base">
              {{ t("eventList.subtitle") }}
            </p>
            <p
              v-if="!user"
              class="mt-2 text-xs leading-5 app-text-secondary-soft sm:text-sm"
            >
              {{ t("eventList.guestBookmarkHint") }}
              <NuxtLink to="/register" class="underline font-semibold">
                {{ t("eventList.guestBookmarkHintCta") }}
              </NuxtLink>
            </p>
          </div>

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
        </div>
      </div>

      <div class="px-4 py-5 sm:px-6 lg:px-8">
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

      <div class="border-t app-border px-4 py-5 sm:px-6 lg:px-8">
        <div
          v-if="isLoading"
          class="flex min-h-[18rem] items-center justify-center"
        >
          <div class="flex flex-col items-center gap-3 app-text-secondary-soft">
            <div
              class="h-10 w-10 animate-spin rounded-full border-4 app-border"
              style="border-top-color: var(--app-button-blue);"
            ></div>
            <span class="text-sm font-medium">{{ t("eventList.loading") }}</span>
          </div>
        </div>

        <div
          v-else-if="filteredEvents.length === 0"
          class="flex min-h-[18rem] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-[var(--app-surface-3)] app-surface-0 px-6 text-center"
        >
          <CalendarIcon class="app-muted-icon h-12 w-12" />
          <h3 class="mt-4 text-lg font-semibold app-text-primary">
            {{ t("eventList.noMatchesTitle") }}
          </h3>
          <p class="mt-2 max-w-md text-sm leading-6 app-text-secondary-soft">
            {{ t("eventList.noMatchesText") }}
          </p>
        </div>

        <div v-else class="space-y-8">
          <section
            v-for="group in groupedEvents"
            :key="group.key"
            class="space-y-4"
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

            <div class="grid gap-4 lg:grid-cols-2">
              <article
                v-for="event in group.events"
                :key="event.key"
                class="event-list-card group cursor-pointer rounded-[1.25rem] border p-3 transition focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/70 focus:ring-offset-2 focus:ring-offset-[var(--app-surface-0)] sm:rounded-[1.75rem] sm:p-5"
                :class="getEventCardClass(event)"
                :style="getEventCardStyle(event)"
                role="button"
                tabindex="0"
                @click="openEventDetails(event)"
                @keydown.enter.prevent="openEventDetails(event)"
                @keydown.space.prevent="openEventDetails(event)"
              >
                <div
                  class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div class="flex min-w-0 gap-3">
                    <div
                      class="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl text-center sm:h-16 sm:w-16 sm:rounded-2xl"
                      :class="event.dateBadgeClass"
                    >
                      <div class="text-xl font-semibold leading-none sm:text-2xl">
                        {{ formatDay(event.date) }}
                      </div>
                      <div
                        class="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] sm:text-[0.7rem] sm:tracking-[0.18em]"
                      >
                        {{ formatMonth(event.date) }}
                      </div>
                    </div>

                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
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
                        class="mt-2 text-base font-semibold leading-tight app-text-primary sm:mt-3 sm:text-xl"
                      >
                        {{ event.title }}
                      </h4>

                      <div class="mt-2 space-y-1.5 text-xs app-text-secondary-soft sm:mt-3 sm:space-y-2 sm:text-sm">
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

                  <div
                    class="flex flex-wrap gap-2 sm:max-w-[13rem] sm:justify-end"
                  >
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
                  class="mt-3 text-xs leading-5 app-text-secondary-soft sm:mt-4 sm:text-sm sm:leading-6"
                >
                  {{ event.description }}
                </p>

                <div
                  class="mt-4 flex items-center justify-between gap-3 border-t app-border pt-3 sm:mt-5 sm:pt-4"
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
              </article>
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

    <div
      v-if="selectedEvent"
      class="app-overlay fixed inset-0 z-50 flex items-end p-0 sm:items-center sm:p-6"
      @click="closeEventDetails"
    >
      <div
        class="app-panel max-h-[92vh] w-full overflow-hidden rounded-t-[2rem] sm:mx-auto sm:max-w-3xl sm:rounded-[2rem]"
        @click.stop
      >
        <div
          class="flex items-start justify-between gap-4 border-b app-border px-5 py-4 sm:px-6"
        >
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full border px-3 py-1 text-xs font-medium"
                :class="selectedEvent.typeBadgeClass"
              >
                {{ selectedEvent.typeLabel }}
              </span>
            </div>
            <h3 class="mt-3 text-xl font-semibold app-text-primary sm:text-2xl">
              {{ selectedEvent.title }}
            </h3>
          </div>

          <button
            type="button"
            class="rounded-2xl border app-border p-2 app-text-muted transition hover:bg-[var(--app-surface-2)] hover:text-[var(--app-text-primary)]"
            @click="closeEventDetails"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <div
          class="max-h-[calc(92vh-5.5rem)] overflow-y-auto px-5 py-5 sm:px-6"
        >
          <div
            class="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]"
          >
            <div class="space-y-5">
              <div
                class="event-list-modal-section rounded-[1.5rem] border p-4"
              >
                <div class="grid gap-4 sm:grid-cols-2">
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
                class="event-list-modal-section rounded-[1.5rem] border p-4"
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

            <div class="space-y-4">
              <div
                class="event-list-modal-section rounded-[1.5rem] border p-4"
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
                class="event-list-modal-section rounded-[1.5rem] border p-4 text-sm app-text-secondary-soft"
              >
                <div class="font-semibold">{{ t("eventList.quickTipTitle") }}</div>
                <p class="mt-2 leading-6">
                  {{ t("eventList.quickFilterTip") }}
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
import { computed, onMounted, ref, watch } from "vue";
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
  XMarkIcon,
} from "@heroicons/vue/24/outline";
import {
  formatDateInTimeZone,
  getUserTimeZone,
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
const { t, locale } = useI18n();
const userTimeZone = getUserTimeZone();

onMounted(async () => {
  await fetchEvents();
  await loadBookmarks();
  await fetchWaitlistStatuses();
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
  selectedEvent.value = event;
};

const closeEventDetails = () => {
  selectedEvent.value = null;
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

function getEventCardAccent(event: UnifiedEvent): string {
  if (event.waitlistStatus === "waitlist_claim") {
    return "var(--app-button-blue-border)";
  }
  if (event.waitlistStatus === "waitlist") {
    return "var(--app-button-amber-border)";
  }
  if (event.source === "custom") {
    return "var(--app-accent)";
  }
  if (isBookmarked(event.id)) {
    return "var(--app-bookmark-border)";
  }
  return "var(--app-border)";
}

function getEventCardStyle(event: UnifiedEvent) {
  return {
    "--event-list-card-accent": getEventCardAccent(event),
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
      isBookmarked: isBookmarked(event.id),
      bookmark,
    });

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
    date: normalizeDateValue(event.dateTime),
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
  width: 4px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--event-list-card-accent) 96%, white),
    color-mix(in srgb, var(--event-list-card-accent) 60%, transparent)
  );
  opacity: 0.96;
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

.event-list-game-pill {
  border-color: color-mix(in srgb, var(--app-accent) 10%, var(--app-border));
  background: color-mix(in srgb, var(--app-surface-2) 88%, var(--app-accent) 12%);
  color: var(--app-text-secondary);
}

.event-list-modal-section {
  border-color: color-mix(in srgb, var(--app-accent) 14%, var(--app-border));
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--app-accent) 5%, var(--app-bg-page)) 0%,
      var(--app-bg-page) 100%
    );
}
</style>
