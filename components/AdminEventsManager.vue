<template>
  <AdminPageLayout :title="t('admin.eventsManager.title')">
    <!-- Search bar -->
    <div class="events-manager-toolbar sticky top-0 z-10">
      <input
        v-model="searchTerm"
        type="text"
        :placeholder="t('admin.eventsManager.searchPlaceholder')"
        class="app-input w-full px-4 py-2"
      />
    </div>

    <div class="p-4 pb-24">
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div
          class="events-manager-spinner"
        ></div>
      </div>

      <div v-else>
        <!-- Upcoming Events -->
        <div class="mb-6">
          <h2 class="events-manager-section-title">
            <svg
              class="w-5 h-5 app-icon-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {{ t("admin.upcomingEvents") }}
            <span class="text-sm font-normal app-text-muted-soft"
              >({{ upcomingEvents.length }})</span
            >
          </h2>

          <div v-if="upcomingEvents.length > 0" class="space-y-2">
            <div
              v-for="event in upcomingEvents"
              :key="event.id"
              class="events-manager-card"
              @click="openEventDetails(event)"
            >
              <div class="p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <h3 class="events-manager-card-title">
                      <span>{{ event.name }}</span>
                      <span
                        v-for="tag in getDisplayTags(event.tags, event.tagType)"
                        :key="tag.label"
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        :class="tag.badgeClass"
                      >
                        {{ tag.value }}
                      </span>
                    </h3>
                    <div class="flex flex-col gap-1 text-sm app-text-secondary-soft">
                      <div class="flex items-center gap-2">
                        <svg
                          class="w-4 h-4 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span>{{ formatCompactDate(event.eventDate) }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <svg
                          class="w-4 h-4 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span class="truncate">{{ event.venue }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <svg
                          class="w-4 h-4 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <span
                          >{{ event._count?.registrations || 0 }} /
                          {{ event.maxParticipants }}</span
                        >
                      </div>
                    </div>
                  </div>
                  <svg
                    class="w-5 h-5 flex-shrink-0 app-icon-muted mt-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 app-text-muted-soft">
            {{ t("admin.eventsManager.noUpcomingEvents") }}
          </div>
        </div>

        <!-- Completed Events (Collapsible) -->
        <div class="mb-6">
          <button
            @click="showCompletedEvents = !showCompletedEvents"
            class="w-full text-left mb-3 flex items-center justify-between"
          >
            <h2 class="events-manager-section-title mb-0">
              <svg
                class="w-5 h-5 text-[var(--app-button-green)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {{ t("admin.completedEvents") }}
              <span class="text-sm font-normal app-text-muted-soft"
                >({{ completedEvents.length }})</span
              >
            </h2>
            <svg
              class="w-5 h-5 app-icon-muted transition-transform duration-200"
              :class="{ 'rotate-180': showCompletedEvents }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="max-h-0 opacity-0"
            enter-to-class="max-h-[5000px] opacity-100"
            leave-active-class="transition-all duration-300 ease-in"
            leave-from-class="max-h-[5000px] opacity-100"
            leave-to-class="max-h-0 opacity-0"
          >
            <div v-if="showCompletedEvents" class="space-y-2 overflow-hidden">
              <div
                v-for="event in completedEvents"
                :key="event.id"
                class="events-manager-card app-card-interactive-muted"
                @click="openEventDetails(event)"
              >
                <div class="p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <h3 class="events-manager-card-title app-text-secondary-soft">
                        {{ event.name }}
                      </h3>
                      <div class="flex flex-col gap-1 text-sm app-text-muted-soft">
                        <div class="flex items-center gap-2">
                          <svg
                            class="w-4 h-4 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>{{ formatCompactDate(event.eventDate) }}</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <svg
                            class="w-4 h-4 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <span class="truncate">{{ event.venue }}</span>
                        </div>
                      </div>
                    </div>
                    <svg
                      class="w-5 h-5 flex-shrink-0 app-icon-muted mt-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Floating Create Button -->
    <button
      @click="createNewEvent"
      class="app-fab-primary fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full"
      :title="t('admin.eventsManager.createNewEvent')"
    >
      <svg
        class="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4v16m8-8H4"
        />
      </svg>
    </button>

    <!-- Event Details Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="selectedEvent"
          class="app-overlay fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
          @click="closeEventDetails"
        >
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="translate-y-full sm:translate-y-0 sm:scale-95"
            enter-to-class="translate-y-0 sm:scale-100"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="translate-y-0 sm:scale-100"
            leave-to-class="translate-y-full sm:translate-y-0 sm:scale-95"
          >
            <div
              class="app-modal-surface flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl sm:max-w-2xl sm:rounded-2xl"
              @click.stop
            >
              <!-- Modal Header -->
              <div
                class="flex items-start justify-between border-b app-border px-6 py-4"
              >
                <div class="flex-1">
                  <h3 class="mb-2 text-xl font-bold app-text-primary">
                    {{ selectedEvent.name }}
                  </h3>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span
                      v-for="tag in getDisplayTags(
                        selectedEvent.tags,
                        selectedEvent.tagType,
                      )"
                      :key="tag.label"
                      class="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                      :class="tag.badgeClass"
                    >
                      {{ tag.value }}
                    </span>
                    <span
                      class="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                      :class="getStatusBadgeClass(selectedEvent.status)"
                    >
                      {{ selectedEvent.status }}
                    </span>
                  </div>
                </div>
                <button
                  @click="closeEventDetails"
                  class="events-manager-close-button"
                >
                  <svg
                    class="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <!-- Modal Body -->
              <div class="flex-1 overflow-y-auto px-6 py-4">
                <div class="space-y-4">
                  <!-- Date and Time -->
                  <div class="flex items-start gap-3">
                    <svg
                      class="w-5 h-5 app-icon-muted mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <div>
                      <p class="text-sm font-medium app-text-secondary-soft">
                        {{ t("admin.eventsManager.dateTime") }}
                      </p>
                      <p class="text-sm app-text-primary">
                        {{ formatDate(selectedEvent.eventDate) }}
                      </p>
                    </div>
                  </div>

                  <!-- Venue -->
                  <div class="flex items-start gap-3">
                    <svg
                      class="w-5 h-5 app-icon-muted mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <div>
                      <p class="text-sm font-medium app-text-secondary-soft">
                        {{ t("common.venue") }}
                      </p>
                      <p class="text-sm app-text-primary">
                        {{ selectedEvent.venue }}
                      </p>
                    </div>
                  </div>

                  <!-- Participants -->
                  <div class="flex items-start gap-3">
                    <svg
                      class="w-5 h-5 app-icon-muted mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <div>
                      <p class="text-sm font-medium app-text-secondary-soft">
                        {{ t("common.participants") }}
                      </p>
                      <p class="text-sm app-text-primary">
                        {{ selectedEvent._count?.registrations || 0 }} /
                        {{ selectedEvent.maxParticipants }}
                        <span class="app-text-muted-soft">
                          {{ t("admin.eventsManager.registered") }}
                        </span>
                      </p>
                    </div>
                  </div>

                  <!-- Fee -->
                  <div
                    v-if="selectedEvent.participationFee"
                    class="flex items-start gap-3"
                  >
                    <svg
                      class="w-5 h-5 app-icon-muted mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p class="text-sm font-medium app-text-secondary-soft">
                        {{ t("events.participationFee") }}
                      </p>
                      <p class="text-sm app-text-primary">
                        {{ selectedEvent.participationFee }}
                      </p>
                    </div>
                  </div>

                  <!-- Decklist Required -->
                  <div
                    v-if="selectedEvent.requiresDecklist"
                    class="flex items-start gap-3"
                  >
                    <svg
                      class="w-5 h-5 app-icon-muted mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <div>
                      <p class="text-sm font-medium app-text-secondary-soft">
                        {{ t("admin.eventsManager.decklistLabel") }}
                      </p>
                      <p class="text-sm app-text-primary">
                        {{ t("admin.eventsManager.decklistRequiredAfterRegistration") }}
                      </p>
                    </div>
                  </div>

                  <!-- Description -->
                  <div
                    v-if="selectedEvent.description"
                    class="flex items-start gap-3"
                  >
                    <svg
                      class="w-5 h-5 app-icon-muted mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p class="text-sm font-medium app-text-secondary-soft">
                        {{ t("common.description") }}
                      </p>
                      <p class="text-sm app-text-primary">
                        {{ selectedEvent.description }}
                      </p>
                    </div>
                  </div>

                  <!-- Registration Link -->
                  <div class="flex items-start gap-3">
                    <svg
                      class="w-5 h-5 app-icon-muted mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                    <div class="flex-1">
                      <p class="mb-1 text-sm font-medium app-text-secondary-soft">
                        {{ t("admin.eventsManager.registrationLink") }}
                      </p>
                      <div class="flex gap-2">
                        <input
                          :value="getRegistrationUrl(selectedEvent.id)"
                          readonly
                          class="app-input app-input-readonly flex-1 px-3 py-2 text-sm"
                          @click="($event.target as HTMLInputElement)?.select()"
                        />
                        <button
                          @click="copyRegistrationLink(selectedEvent.id)"
                          class="app-action-button px-3 py-2 text-sm"
                          :class="{
                            'app-action-success':
                              copiedEventId === selectedEvent.id,
                            'app-action-primary':
                              copiedEventId !== selectedEvent.id,
                          }"
                        >
                          {{
                            copiedEventId === selectedEvent.id
                              ? t("admin.eventsManager.copied")
                              : t("admin.eventsManager.copy")
                          }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Modal Footer -->
              <div
                class="flex flex-wrap gap-2 border-t app-border px-6 py-4"
              >
                <NuxtLink
                  :to="`/events/register/${selectedEvent.id}`"
                  class="app-action-button app-action-primary flex-1 px-4 py-2 text-sm no-underline"
                  target="_blank"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  {{ t("admin.eventsManager.openRegistration") }}
                </NuxtLink>
                <button
                  @click="viewRegistrations(selectedEvent)"
                  class="app-action-button app-action-secondary flex-1 px-4 py-2 text-sm"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  {{
                    t("admin.eventsManager.registrationsCount", {
                      count: selectedEvent._count?.registrations || 0,
                    })
                  }}
                </button>
                <template v-if="!selectedEvent.isExternalEvent">
                  <button
                    @click="editEvent(selectedEvent)"
                    class="app-action-button app-action-secondary px-4 py-2 text-sm"
                  >
                    {{ t("common.edit") }}
                  </button>
                  <button
                    @click="deleteEvent(selectedEvent)"
                    class="app-action-button app-action-danger px-4 py-2 text-sm"
                  >
                    {{ t("common.delete") }}
                  </button>
                </template>
                <template v-else>
                  <NuxtLink
                    to="/admin/external-events"
                    class="app-action-button app-action-secondary px-4 py-2 text-sm no-underline"
                  >
                    {{ t("admin.eventsManager.manageInExternalEvents") }}
                  </NuxtLink>
                </template>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Registration Management Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showRegistrations"
          class="app-overlay fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-4"
          @click="closeRegistrationsModal"
        >
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="translate-y-full sm:translate-y-0 sm:scale-95"
            enter-to-class="translate-y-0 sm:scale-100"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="translate-y-0 sm:scale-100"
            leave-to-class="translate-y-full sm:translate-y-0 sm:scale-95"
          >
            <div
              class="app-modal-surface flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl sm:max-w-6xl sm:rounded-2xl"
              @click.stop
            >
              <div class="border-b app-border px-6 py-5">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-[var(--app-accent)]">
                      {{ t("admin.eventsManager.checkInLabel") }}
                    </p>
                    <h2 class="text-2xl font-bold app-text-primary">
                      {{
                        t("admin.eventsManager.registrationsTitle", {
                          name: selectedEvent?.name,
                        })
                      }}
                    </h2>
                    <p class="mt-1 text-sm app-text-muted-soft">
                      {{ t("admin.eventsManager.checkInHelp") }}
                    </p>
                  </div>
                  <button
                    @click="closeRegistrationsModal"
                    class="events-manager-close-button rounded-lg border app-border p-2"
                  >
                    <svg
                      class="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div class="mt-4 grid gap-3 sm:grid-cols-3">
                  <div class="registrations-stat-card">
                    <span class="registrations-stat-number">{{ ticketRows.length }}</span>
                    <span class="registrations-stat-label">
                      {{ t("admin.eventsManager.stats.totalRegistered") }}
                    </span>
                  </div>
                  <div class="registrations-stat-card">
                    <span class="registrations-stat-number">{{
                      checkedInCount
                    }}</span>
                    <span class="registrations-stat-label">
                      {{ t("admin.eventsManager.stats.checkedIn") }}
                    </span>
                  </div>
                  <div class="registrations-stat-card">
                    <span class="registrations-stat-number">{{
                      Math.max(
                        0,
                        (selectedEvent?.maxParticipants || 0) - ticketRows.length,
                      )
                    }}</span>
                    <span class="registrations-stat-label">
                      {{ t("admin.eventsManager.stats.availableSpots") }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                <div v-if="ticketRows.length > 0" class="registrations-table-shell">
                  <div class="registrations-table">
                    <table>
                      <thead>
                        <tr>
                          <th>{{ t("admin.eventsManager.columns.checkIn") }}</th>
                          <th>{{ t("admin.eventsManager.columns.participantId") }}</th>
                          <th>{{ t("common.name") }}</th>
                          <th>{{ t("admin.eventsManager.columns.birthYear") }}</th>
                          <th>{{ t("admin.eventsManager.columns.bookerEmail") }}</th>
                          <th>{{ t("admin.eventsManager.columns.registeredAt") }}</th>
                          <th>{{ t("common.status") }}</th>
                          <th v-if="selectedEvent?.requiresDecklist">
                            {{ t("admin.eventsManager.columns.decklist") }}
                          </th>
                          <th>{{ t("common.actions") }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="row in ticketRows"
                          :key="row.ticketId"
                          :class="getRegistrationRowClass(row)"
                          @click="toggleTicketCheckIn(row)"
                        >
                          <td>
                            <label class="checkin-toggle">
                              <input
                                type="checkbox"
                                :checked="isTicketCheckedIn(row)"
                                :disabled="isTicketUpdating(row.ticketId)"
                                @click.stop
                                @change="toggleTicketCheckIn(row)"
                              />
                            </label>
                          </td>
                          <td>{{ row.participantPlayerId || "—" }}</td>
                          <td class="font-medium app-text-primary">
                            {{ row.participantName }}
                          </td>
                          <td>{{ getBirthYear(row.birthDate) }}</td>
                          <td>
                            {{
                              row.bookerEmail ||
                              t("admin.externalEvents.notAvailable")
                            }}
                          </td>
                          <td>{{ formatDate(row.registeredAt) }}</td>
                          <td>
                            <span
                              class="registrations-status-badge"
                              :class="getTicketStatusClass(row.ticketStatus)"
                            >
                              {{ getTicketStatusLabel(row.ticketStatus) }}
                            </span>
                          </td>
                          <td v-if="selectedEvent?.requiresDecklist">
                            <span
                              v-if="row.decklist"
                              class="decklist-status status-success"
                            >
                              {{ t("admin.eventsManager.decklistStates.submitted") }}
                            </span>
                            <span
                              v-else-if="row.bringingDecklistOnsite"
                              class="decklist-status status-warning"
                            >
                              {{ t("admin.eventsManager.decklistStates.onsite") }}
                            </span>
                            <span v-else class="decklist-status status-danger">
                              {{ t("admin.eventsManager.decklistStates.notSubmitted") }}
                            </span>
                          </td>
                          <td>
                            <div class="action-buttons">
                              <button
                                v-if="selectedEvent?.requiresDecklist && row.decklist"
                                @click.stop="viewDecklist(row)"
                                class="app-action-button app-action-secondary btn-small"
                              >
                                {{ t("admin.eventsManager.viewDecklist") }}
                              </button>
                              <button
                                @click.stop="cancelRegistration(row.registration)"
                                class="app-action-button app-action-danger btn-small"
                              >
                                {{ t("dashboard.remove") }}
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div v-else class="registrations-empty-state">
                  {{ t("admin.eventsManager.noRegistrationsYet") }}
                </div>

                <div class="space-y-3">
                  <h3 class="text-base font-semibold app-text-primary">
                    {{
                      t("admin.eventsManager.waitlistTitle", {
                        count: waitlistEntries.length,
                      })
                    }}
                  </h3>
                  <div
                    v-if="waitlistEntries.length > 0"
                    class="registrations-table-shell"
                  >
                    <div class="registrations-table">
                      <table>
                        <thead>
                          <tr>
                            <th>{{ t("admin.eventsManager.columns.position") }}</th>
                            <th>{{ t("admin.eventsManager.columns.priority") }}</th>
                            <th>{{ t("registration.playerId") }}</th>
                            <th>{{ t("common.name") }}</th>
                            <th>{{ t("common.email") }}</th>
                            <th>{{ t("common.status") }}</th>
                            <th>{{ t("admin.eventsManager.columns.claimExpires") }}</th>
                            <th>{{ t("common.actions") }}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="(entry, index) in waitlistEntries"
                            :key="entry.id"
                          >
                            <td>{{ index + 1 }}</td>
                            <td>{{ entry.priority }}</td>
                            <td>{{ entry.player.playerId || "—" }}</td>
                            <td class="font-medium app-text-primary">
                              {{ entry.player.name }}
                            </td>
                            <td>
                              {{
                                entry.player.email ||
                                t("admin.externalEvents.notAvailable")
                              }}
                            </td>
                            <td>
                              <span
                                class="registrations-status-badge status-reserved"
                              >
                                {{ entry.status }}
                              </span>
                            </td>
                            <td>
                              {{
                                entry.claimExpiresAt
                                  ? formatDate(entry.claimExpiresAt)
                                  : "—"
                              }}
                            </td>
                            <td>
                              <div class="action-buttons">
                                <button
                                  @click="updateWaitlistPriority(entry, entry.priority + 1)"
                                  class="app-action-button app-action-secondary btn-small"
                                >
                                  +1
                                </button>
                                <button
                                  @click="updateWaitlistPriority(entry, entry.priority - 1)"
                                  class="app-action-button app-action-secondary btn-small"
                                >
                                  -1
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div v-else class="registrations-empty-state">
                    {{ t("admin.eventsManager.noWaitlistEntries") }}
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Decklist Viewer Modal -->
    <div
      v-if="selectedDecklist"
      class="modal-overlay"
      @click="closeDecklistModal"
      style="z-index: 1001"
    >
      <div class="modal-content modal-large" @click.stop>
        <div class="modal-header">
          <h2>
            {{ t("admin.eventsManager.decklistTitle", { name: selectedDecklist.playerName }) }}
          </h2>
          <button @click="closeDecklistModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="decklist-viewer">
            <pre class="decklist-content-modal">{{
              selectedDecklist.decklist
            }}</pre>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeDecklistModal" class="btn btn-secondary">
            ← {{ t("common.back") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Event Modal -->
    <div
      v-if="showCreateForm || editingEvent"
      class="modal-overlay"
      @click="closeModal"
    >
      <div class="modal-content event-form-modal" @click.stop>
        <div class="modal-header">
          <h2>
            {{
              editingEvent
                ? t("admin.eventsManager.editEvent")
                : t("admin.eventsManager.createNewEvent")
            }}
          </h2>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>

        <form @submit.prevent="saveEvent" class="event-form">
          <div v-if="formError" class="form-error-banner" role="alert">
            {{ formError }}
          </div>

          <div class="form-group">
            <label for="name">{{ t("admin.eventsManager.eventName") }} *</label>
            <input
              id="name"
              v-model="eventForm.name"
              type="text"
              required
              class="form-input"
              :placeholder="t('admin.eventsManager.placeholders.eventName')"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="tagType">{{ t("admin.eventsManager.gameCategory") }} *</label>
              <select
                id="tagType"
                v-model="eventForm.tagType"
                required
                class="form-input"
              >
                <option value="pokemon">Pokémon</option>
                <option value="riftbound">Riftbound</option>
                <option value="generic">{{ t("admin.eventsManager.genericGame") }}</option>
              </select>
            </div>

            <div class="form-group">
              <label for="gameTag">{{ t("admin.eventsManager.game") }} *</label>
              <input
                id="gameTag"
                v-model="eventForm.tags.game"
                type="text"
                required
                class="form-input"
                :placeholder="t('admin.eventsManager.placeholders.game')"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="formatTag">{{ t("admin.eventsManager.format") }}</label>
            <select
              id="formatTag"
              v-model="eventForm.tags.format"
              class="form-input"
            >
              <option
                v-for="formatOption in FORMAT_OPTIONS"
                :key="formatOption.value"
                :value="formatOption.value"
              >
                {{ formatOption.label }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="eventType">{{ t("admin.eventsManager.eventType") }} *</label>
            <select
              id="eventType"
              v-model="eventForm.tags.type"
              required
              class="form-input"
            >
              <option value="custom">{{ t("admin.eventsManager.eventTypes.custom") }}</option>
              <option value="league_challenge">
                {{ t("admin.eventsManager.eventTypes.leagueChallenge") }}
              </option>
              <option value="league_cup">
                {{ t("admin.eventsManager.eventTypes.leagueCup") }}
              </option>
              <option value="local_tournament">{{ t("admin.eventsManager.eventTypes.localTournament") }}</option>
              <option value="prerelease">
                {{ t("admin.eventsManager.eventTypes.prerelease") }}
              </option>
              <option value="regional">{{ t("admin.eventsManager.eventTypes.regional") }}</option>
              <option value="international">{{ t("admin.eventsManager.eventTypes.international") }}</option>
              <option value="worlds">{{ t("admin.eventsManager.eventTypes.worlds") }}</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="hostTag">{{ t("admin.venue.columns.organization") }}</label>
              <input
                id="hostTag"
                v-model="eventForm.tags.host"
                type="text"
                class="form-input"
                list="host-organization-options"
                :placeholder="t('admin.eventsManager.placeholders.hostOrganization')"
                @change="syncVenueFromOrganization"
                @blur="syncVenueFromOrganization"
              />
              <datalist id="host-organization-options">
                <option
                  v-for="organization in hostOrganizationOptions"
                  :key="organization"
                  :value="organization"
                />
              </datalist>
            </div>

            <div class="form-group">
              <label for="venue">{{ t("common.venue") }} *</label>
              <input
                id="venue"
                v-model="eventForm.venue"
                type="text"
                required
                class="form-input"
                list="venue-options"
                :placeholder="t('admin.eventsManager.placeholders.venue')"
                @change="syncOrganizationFromVenue"
                @blur="syncOrganizationFromVenue"
              />
              <datalist id="venue-options">
                <option
                  v-for="venueOption in venueOptions"
                  :key="venueOption"
                  :value="venueOption"
                />
              </datalist>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="maxParticipants">{{ t("events.maxParticipants") }} *</label>
              <input
                id="maxParticipants"
                v-model.number="eventForm.maxParticipants"
                type="number"
                min="1"
                required
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="participationFee">{{ t("events.participationFee") }} (€)</label>
              <input
                id="participationFee"
                v-model.number="eventForm.participationFee"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="0.00"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="eventDate">
                {{ t("events.eventDate") }} *
                <span v-if="eventForm.eventDate" class="field-help">
                  {{ formatDateWithWeekday(eventForm.eventDate) }}
                </span>
                <span class="field-help">
                  {{ t("admin.eventsManager.shownInTimezone", { timeZone: userTimeZone }) }}
                </span>
              </label>
              <input
                id="eventDate"
                v-model="eventForm.eventDate"
                type="datetime-local"
                required
                step="900"
                class="form-input"
                @change="onEventDateChange"
                @blur="normalizeEventDateInput"
              />
            </div>

            <div class="form-group">
              <label for="registrationDeadline">
                {{ t("events.registrationDeadline") }}
                <span class="field-help">
                  {{ t("admin.eventsManager.registrationDeadlineHelp") }}
                </span>
              </label>
              <input
                id="registrationDeadline"
                v-model="eventForm.registrationDeadline"
                type="datetime-local"
                step="900"
                class="form-input"
                @change="normalizeRegistrationDeadlineInput"
                @blur="normalizeRegistrationDeadlineInput"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="description">{{ t("common.description") }}</label>
            <textarea
              id="description"
              v-model="eventForm.description"
              class="form-textarea"
              rows="3"
              :placeholder="t('admin.eventsManager.placeholders.description')"
            ></textarea>
          </div>

          <div class="form-group">
            <div class="checkbox-wrapper">
              <input
                id="requiresDecklist"
                v-model="eventForm.requiresDecklist"
                type="checkbox"
                class="form-checkbox"
              />
              <label for="requiresDecklist" class="checkbox-label">
                {{ t("events.requiresDecklist") }}
                <span class="checkbox-help">
                  {{ t("admin.eventsManager.requiresDecklistHelp") }}
                </span>
              </label>
            </div>
          </div>

          <div v-if="editingEvent" class="form-group">
            <label for="status">{{ t("common.status") }}</label>
            <select id="status" v-model="eventForm.status" class="form-select">
              <option value="upcoming">{{ t("events.eventStatus.upcoming") }}</option>
              <option value="ongoing">{{ t("events.eventStatus.ongoing") }}</option>
              <option value="completed">{{ t("events.eventStatus.completed") }}</option>
              <option value="cancelled">{{ t("events.eventStatus.cancelled") }}</option>
            </select>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeModal" class="btn btn-secondary">
              {{ t("common.cancel") }}
            </button>
            <button type="submit" :disabled="saving" class="btn btn-primary">
              {{
                saving
                  ? t("admin.eventsManager.saving")
                  : editingEvent
                    ? t("admin.eventsManager.updateEvent")
                    : t("admin.eventsManager.createEvent")
              }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AdminPageLayout>
</template>

<script setup lang="ts">
import {
  parseEventTags,
  getEventTypeLabel,
  getEventTypeBadgeClass,
  FORMAT_OPTIONS,
  type TagType,
} from "~/types/eventTags";
import { useTagDisplay } from "~/composables/useTagDisplay";
import {
  isCompletedAdminEvent,
  isUpcomingAdminEvent,
} from "~/utils/adminEventBuckets";
import {
  DEFAULT_EVENT_TIME_ZONE,
  formatDateInTimeZone,
  formatDateTimeLocalInput,
  getDateKeyInTimeZone,
  getUserTimeZone,
  parseDateTimeLocalInput,
} from "~/utils/eventDateTime";

const { getDisplayTags } = useTagDisplay();
const { t } = useI18n();

interface CustomEvent {
  id: string;
  name: string;
  venue: string;
  tagType: string;
  tags: any;
  maxParticipants: number;
  participationFee?: number;
  description?: string;
  eventDate: string;
  registrationDeadline?: string;
  requiresDecklist: boolean;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isExternalEvent?: boolean;
  _count?: {
    registrations: number;
  };
}

interface Ticket {
  id: string;
  participantName: string;
  participantPlayerId?: string | null;
  status: string;
  decklist?: string | null;
  bringingDecklistOnsite?: boolean | null;
}

interface Registration {
  id: string;
  customEventId: string;
  playerId: string;
  registeredAt: string;
  status: string;
  notes?: string;
  decklist?: string | null;
  bringingDecklistOnsite?: boolean;
  tickets: Ticket[];
  player: {
    id: string;
    playerId: string;
    name: string;
    email?: string;
    birthDate: string;
  };
}

interface WaitlistEntry {
  id: string;
  status: "waiting" | "pending_claim" | "confirmed" | "expired" | "cancelled";
  priority: number;
  claimExpiresAt?: string | null;
  createdAt: string;
  queuePositionAt: string;
  player: {
    id: string;
    playerId?: string | null;
    name: string;
    email?: string | null;
  };
}

interface VenueDirectoryEntry {
  id: string;
  organizationName: string;
  venueName: string;
  createdAt: string;
  updatedAt: string;
}

interface EventFormTags {
  type?: string;
  game: string;
  format?: string;
  host?: string;
}

interface EventFormState {
  name: string;
  venue: string;
  tagType: TagType;
  tags: EventFormTags;
  maxParticipants: number;
  participationFee: number;
  description: string;
  eventDate: string;
  registrationDeadline: string;
  requiresDecklist: boolean;
  status: string;
}

// Page metadata
// Reactive data
const events = ref<CustomEvent[]>([]);
const registrations = ref<Registration[]>([]);
const waitlistEntries = ref<WaitlistEntry[]>([]);
const loading = ref(true);
const saving = ref(false);
const formError = ref("");
const showCreateForm = ref(false);
const showRegistrations = ref(false);
const showCompletedEvents = ref(false);
const editingEvent = ref<CustomEvent | null>(null);
const selectedEvent = ref<CustomEvent | null>(null);
const searchTerm = ref("");
const copiedEventId = ref<string | null>(null);
const selectedDecklist = ref<{ playerName: string; decklist: string } | null>(
  null,
);
const userTimeZone = ref(DEFAULT_EVENT_TIME_ZONE);
const venueDirectory = ref<VenueDirectoryEntry[]>([]);

// Flatten registrations → one row per ticket for display
interface TicketRow {
  ticketId: string;
  registrationId: string;
  participantName: string;
  participantPlayerId?: string | null;
  bookerEmail?: string;
  registeredAt: string;
  birthDate: string;
  ticketStatus: string;
  decklist?: string | null;
  bringingDecklistOnsite?: boolean | null;
  registration: Registration;
}

type TicketStatus =
  | "registered"
  | "reserved"
  | "attended"
  | "no-show"
  | "cancelled";

const ticketRows = computed<TicketRow[]>(() =>
  registrations.value.flatMap((reg) =>
    (reg.tickets || []).map((t) => ({
      ticketId: t.id,
      registrationId: reg.id,
      participantName: t.participantName,
      participantPlayerId: t.participantPlayerId,
      bookerEmail: reg.player.email,
      registeredAt: reg.registeredAt,
      birthDate: reg.player.birthDate,
      ticketStatus: t.status,
      decklist: t.decklist,
      bringingDecklistOnsite: t.bringingDecklistOnsite,
      registration: reg,
    })),
  ),
);

const updatingTicketIds = ref<string[]>([]);

const checkedInCount = computed(
  () => ticketRows.value.filter((row) => row.ticketStatus === "attended").length,
);

// Computed properties for upcoming and completed events
const upcomingEvents = computed(() => {
  const now = new Date();
  const filtered = filteredEvents.value.filter((event) =>
    isUpcomingAdminEvent(event, now),
  );
  return filtered.sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
  );
});

const completedEvents = computed(() => {
  const now = new Date();
  const filtered = filteredEvents.value.filter((event) =>
    isCompletedAdminEvent(event, now),
  );
  return filtered.sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
  );
});

// Format compact date
const formatCompactDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const timeZone = userTimeZone.value;
  const dateKey = getDateKeyInTimeZone(date, timeZone);

  // Check if today
  if (dateKey === getDateKeyInTimeZone(now, timeZone)) {
    return `Today, ${formatDateInTimeZone(
      date,
      {
        hour: "2-digit",
        minute: "2-digit",
      },
      "en-US",
      timeZone,
    )}`;
  }

  // Check if tomorrow
  if (dateKey === getDateKeyInTimeZone(tomorrow, timeZone)) {
    return `Tomorrow, ${formatDateInTimeZone(
      date,
      {
        hour: "2-digit",
        minute: "2-digit",
      },
      "en-US",
      timeZone,
    )}`;
  }

  // Otherwise show full date
  return formatDateInTimeZone(
    date,
    {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
    "en-US",
    timeZone,
  );
};

// Status badge classes
const getStatusBadgeClass = (status: string): string => {
  const classes = {
    upcoming: "app-status-upcoming",
    ongoing: "app-status-ongoing",
    completed: "app-status-completed",
    cancelled: "app-status-cancelled",
  };
  return classes[status as keyof typeof classes] || classes.upcoming;
};

const isTicketCheckedIn = (row: TicketRow): boolean =>
  row.ticketStatus === "attended";

const isTicketUpdating = (ticketId: string): boolean =>
  updatingTicketIds.value.includes(ticketId);

const setLocalTicketStatus = (ticketId: string, status: TicketStatus) => {
  for (const registration of registrations.value) {
    const ticket = registration.tickets.find((entry) => entry.id === ticketId);
    if (ticket) {
      ticket.status = status;
      return;
    }
  }
};

const getFallbackTicketStatus = (row: TicketRow): TicketStatus => {
  if (
    selectedEvent.value?.requiresDecklist &&
    !row.decklist &&
    !row.bringingDecklistOnsite
  ) {
    return "reserved";
  }

  return "registered";
};

const getRegistrationRowClass = (row: TicketRow): string =>
  isTicketCheckedIn(row) ? "registration-row-checked" : "";

const getTicketStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
    registered: "status-registered",
    reserved: "status-reserved",
    attended: "status-attended",
    "no-show": "status-no-show",
    cancelled: "status-cancelled",
  };

  return classes[status] || "status-registered";
};

const getTicketStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    registered: t("admin.eventsManager.ticketStatuses.registered"),
    reserved: t("admin.eventsManager.ticketStatuses.reserved"),
    attended: t("admin.eventsManager.ticketStatuses.attended"),
    "no-show": t("admin.eventsManager.ticketStatuses.noShow"),
    cancelled: t("admin.eventsManager.ticketStatuses.cancelled"),
  };

  return labels[status] || status;
};

const getBirthYear = (birthDate: string): string => {
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return String(date.getFullYear());
};

// Open event details modal
const openEventDetails = (event: CustomEvent) => {
  selectedEvent.value = event;
};

// Close event details modal
const closeEventDetails = () => {
  selectedEvent.value = null;
};

// Form data
const createEmptyEventTags = (): EventFormTags => ({
  type: "custom",
  game: "Pokemon",
  format: "standard",
  host: "",
});

const createEventFormState = (): EventFormState => ({
  name: "",
  venue: "",
  tagType: "pokemon",
  tags: createEmptyEventTags(),
  maxParticipants: 20,
  participationFee: 0,
  description: "",
  eventDate: "",
  registrationDeadline: "",
  requiresDecklist: false,
  status: "upcoming",
});

const eventForm = ref<EventFormState>(createEventFormState());

// Helper function to get next Friday at 18:00
const getNextFriday = (): Date => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;

  const nextFriday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysUntilFriday,
    18,
    0,
    0,
  );

  return nextFriday;
};

// Format date with weekday
const formatDateWithWeekday = (dateString: string): string => {
  if (!dateString) return "";
  const timeZone = userTimeZone.value;
  const weekday = formatDateInTimeZone(
    dateString,
    {
      weekday: "short",
    },
    "de-DE",
    timeZone,
  );
  const formatted = formatDateInTimeZone(
    dateString,
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
    "de-DE",
    timeZone,
  );
  return `${weekday}, ${formatted}`;
};

const formatDateTimeLocalString = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const normalizeToQuarterHour = (value: string): string => {
  if (!value) return "";

  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return value;

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const roundedDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const roundedMinutes = Math.round(roundedDate.getUTCMinutes() / 15) * 15;
  roundedDate.setUTCMinutes(roundedMinutes, 0, 0);

  return formatDateTimeLocalString(roundedDate);
};

const normalizeEventDateInput = () => {
  if (!eventForm.value.eventDate) return;

  const normalizedValue = normalizeToQuarterHour(eventForm.value.eventDate);
  if (normalizedValue !== eventForm.value.eventDate) {
    eventForm.value.eventDate = normalizedValue;
  }
};

const normalizeRegistrationDeadlineInput = () => {
  if (!eventForm.value.registrationDeadline) return;

  const normalizedValue = normalizeToQuarterHour(
    eventForm.value.registrationDeadline,
  );
  if (normalizedValue !== eventForm.value.registrationDeadline) {
    eventForm.value.registrationDeadline = normalizedValue;
  }
};

const normalizedText = (value?: string | null) =>
  value?.trim().toLowerCase() || "";

const findVenueEntryByOrganization = (organizationName?: string) => {
  const search = normalizedText(organizationName);
  if (!search) return null;

  return (
    venueDirectory.value.find(
      (entry) => normalizedText(entry.organizationName) === search,
    ) || null
  );
};

const findVenueEntryByVenueName = (venueName?: string) => {
  const search = normalizedText(venueName);
  if (!search) return null;

  return (
    venueDirectory.value.find(
      (entry) => normalizedText(entry.venueName) === search,
    ) || null
  );
};

const syncVenueFromOrganization = () => {
  const entry = findVenueEntryByOrganization(eventForm.value.tags.host);
  if (entry) {
    eventForm.value.venue = entry.venueName;
  }
};

const syncOrganizationFromVenue = () => {
  const entry = findVenueEntryByVenueName(eventForm.value.venue);
  if (entry) {
    eventForm.value.tags.host = entry.organizationName;
  }
};

const hostOrganizationOptions = computed(() =>
  [
    ...new Set(venueDirectory.value.map((entry) => entry.organizationName)),
  ].sort((left, right) => left.localeCompare(right)),
);

const venueOptions = computed(() =>
  [...new Set(venueDirectory.value.map((entry) => entry.venueName))].sort(
    (left, right) => left.localeCompare(right),
  ),
);

// Initialize form with default dates when creating new event
const initializeEventForm = () => {
  const nextFriday = getNextFriday();
  const eventDateTime = formatDateTimeLocalInput(
    nextFriday,
    userTimeZone.value,
  );

  // Registration deadline: 15 minutes before event
  const regDeadline = new Date(nextFriday.getTime() - 15 * 60 * 1000);
  const regDeadlineString = formatDateTimeLocalInput(
    regDeadline,
    userTimeZone.value,
  );

  eventForm.value = {
    ...createEventFormState(),
    eventDate: eventDateTime,
    registrationDeadline: regDeadlineString,
  };
};

// Computed
const filteredEvents = computed(() => {
  if (!searchTerm.value) return events.value;

  const search = searchTerm.value.toLowerCase();
  return events.value.filter(
    (event) =>
      event.name.toLowerCase().includes(search) ||
      event.venue.toLowerCase().includes(search) ||
      event.status.toLowerCase().includes(search),
  );
});

// Methods
const createNewEvent = () => {
  initializeEventForm();
  formError.value = "";
  showCreateForm.value = true;
};

const getRequestErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== "object") {
    return fallback;
  }

  if ("data" in error) {
    const data = (error as { data?: { statusMessage?: unknown } }).data;
    if (typeof data?.statusMessage === "string" && data.statusMessage.trim()) {
      return data.statusMessage;
    }
  }

  if ("statusMessage" in error) {
    const statusMessage = (error as { statusMessage?: unknown }).statusMessage;
    if (typeof statusMessage === "string" && statusMessage.trim()) {
      return statusMessage;
    }
  }

  if ("message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
};

const onEventDateChange = () => {
  normalizeEventDateInput();

  // Auto-set registration deadline based on event date
  if (eventForm.value.eventDate) {
    const eventDate = parseDateTimeLocalInput(
      eventForm.value.eventDate,
      userTimeZone.value,
    );

    // Registration deadline: 15 minutes before event (but still editable)
    const regDeadline = new Date(eventDate.getTime() - 15 * 60 * 1000);
    eventForm.value.registrationDeadline = formatDateTimeLocalInput(
      regDeadline,
      userTimeZone.value,
    );
    normalizeRegistrationDeadlineInput();
  }
};

const loadVenueDirectory = async () => {
  try {
    const response = await $fetch<{ venues: VenueDirectoryEntry[] }>(
      "/api/admin/venues",
    );
    venueDirectory.value = response.venues || [];
  } catch (error) {
    console.error("Error loading venue directory:", error);
  }
};

const loadEvents = async () => {
  try {
    loading.value = true;
    const response = await $fetch<{ events: CustomEvent[] }>(
      "/api/admin/events/combined",
    );
    events.value = response.events || [];
  } catch (error) {
    console.error("Error loading events:", error);
    // TODO: Show error message
  } finally {
    loading.value = false;
  }
};

const saveEvent = async () => {
  try {
    saving.value = true;
    formError.value = "";
    normalizeEventDateInput();
    normalizeRegistrationDeadlineInput();
    syncVenueFromOrganization();
    syncOrganizationFromVenue();

    const eventData = {
      ...eventForm.value,
      venue: eventForm.value.venue.trim(),
      tags: {
        ...eventForm.value.tags,
        host: eventForm.value.tags.host?.trim() || undefined,
        format: eventForm.value.tags.format || "standard",
      },
      participationFee: eventForm.value.participationFee
        ? Number(eventForm.value.participationFee)
        : undefined,
      timeZone: userTimeZone.value,
    };

    if (editingEvent.value) {
      await $fetch(`/api/admin/custom-events?id=${editingEvent.value.id}`, {
        method: "PUT",
        body: eventData,
      });
    } else {
      await $fetch("/api/admin/custom-events", {
        method: "POST",
        body: eventData,
      });
    }

    await loadEvents();
    await loadVenueDirectory();
    closeModal();
    // TODO: Show success message
  } catch (error) {
    console.error("Error saving event:", error);
    formError.value = getRequestErrorMessage(
      error,
      t("admin.eventsManager.saveError"),
    );
  } finally {
    saving.value = false;
  }
};

const editEvent = (event: CustomEvent) => {
  // Prevent editing external events from this page
  if ((event as any).isExternalEvent) {
    alert(t("admin.eventsManager.externalEventsManagedElsewhere"));
    return;
  }

  editingEvent.value = event;
  formError.value = "";

  eventForm.value = {
    name: event.name,
    venue: event.venue,
    tagType: (event.tagType as TagType) || "pokemon",
    tags: {
      ...createEmptyEventTags(),
      ...(event.tags
        ? (parseEventTags(
            event.tags,
            (event.tagType as TagType) || "pokemon",
          ) as Record<string, string | undefined>)
        : {}),
    },
    maxParticipants: event.maxParticipants,
    participationFee: event.participationFee || 0,
    description: event.description || "",
    eventDate: formatDateTimeLocalInput(event.eventDate, userTimeZone.value),
    registrationDeadline: event.registrationDeadline
      ? formatDateTimeLocalInput(event.registrationDeadline, userTimeZone.value)
      : "",
    requiresDecklist: event.requiresDecklist,
    status: event.status,
  };
};

const deleteEvent = async (event: CustomEvent) => {
  // Prevent deleting external events from this page
  if ((event as any).isExternalEvent) {
    alert(t("admin.eventsManager.externalEventsManagedElsewhere"));
    return;
  }

  if (!confirm(t("admin.eventsManager.confirmDeleteEvent", { name: event.name })))
    return;

  try {
    await $fetch(`/api/admin/custom-events?id=${event.id}`, {
      method: "DELETE",
    });
    await loadEvents();
    // TODO: Show success message
  } catch (error) {
    console.error("Error deleting event:", error);
    // TODO: Show error message
  }
};

const viewRegistrations = async (event: CustomEvent) => {
  try {
    selectedEvent.value = event;
    const response = await $fetch<{
      registrations: Registration[];
      waitlist: WaitlistEntry[];
    }>(
      `/api/admin/registrations?eventId=${event.id}`,
    );
    registrations.value = response.registrations || [];
    waitlistEntries.value = (response.waitlist || []).sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return (
        new Date(a.queuePositionAt).getTime() -
        new Date(b.queuePositionAt).getTime()
      );
    });
    showRegistrations.value = true;
  } catch (error) {
    console.error("Error loading registrations:", error);
    // TODO: Show error message
  }
};

const toggleTicketCheckIn = async (row: TicketRow) => {
  if (isTicketUpdating(row.ticketId)) {
    return;
  }

  const nextStatus: TicketStatus = isTicketCheckedIn(row)
    ? getFallbackTicketStatus(row)
    : "attended";
  const previousStatus = row.ticketStatus as TicketStatus;

  setLocalTicketStatus(row.ticketId, nextStatus);
  updatingTicketIds.value = [...updatingTicketIds.value, row.ticketId];

  try {
    await $fetch(`/api/admin/registrations?id=${row.registrationId}`, {
      method: "PUT",
      body: {
        ticketId: row.ticketId,
        status: nextStatus,
      },
    });
  } catch (error) {
    setLocalTicketStatus(row.ticketId, previousStatus);
    console.error("Error updating ticket check-in status:", error);
  } finally {
    updatingTicketIds.value = updatingTicketIds.value.filter(
      (ticketId) => ticketId !== row.ticketId,
    );
  }
};

const updateRegistrationStatus = async (registration: Registration) => {
  try {
    await $fetch(`/api/admin/registrations?id=${registration.id}`, {
      method: "PUT",
      body: { status: registration.status },
    });
    // TODO: Show success message
  } catch (error) {
    console.error("Error updating registration:", error);
    // TODO: Show error message
  }
};

const cancelRegistration = async (registration: Registration) => {
  if (
    !confirm(
      t("admin.eventsManager.confirmRemoveRegistration", {
        name: registration.player.name,
      }),
    )
  )
    return;

  try {
    await $fetch(`/api/admin/registrations?id=${registration.id}`, {
      method: "DELETE",
    });
    registrations.value = registrations.value.filter(
      (r) => r.id !== registration.id,
    );
    await loadEvents(); // Refresh event counts
    // TODO: Show success message
  } catch (error) {
    console.error("Error cancelling registration:", error);
    // TODO: Show error message
  }
};

const closeModal = () => {
  showCreateForm.value = false;
  editingEvent.value = null;
  formError.value = "";
  initializeEventForm();
};

const closeRegistrationsModal = () => {
  showRegistrations.value = false;
  selectedEvent.value = null;
  registrations.value = [];
  waitlistEntries.value = [];
  updatingTicketIds.value = [];
};

const updateWaitlistPriority = async (
  entry: WaitlistEntry,
  priority: number,
) => {
  try {
    await $fetch(`/api/admin/registrations?waitlistId=${entry.id}`, {
      method: "PUT",
      body: { priority },
    });
    entry.priority = priority;
    waitlistEntries.value = [...waitlistEntries.value].sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return (
        new Date(a.queuePositionAt).getTime() -
        new Date(b.queuePositionAt).getTime()
      );
    });
  } catch (error) {
    console.error("Error updating waitlist priority:", error);
  }
};

const viewDecklist = (row: TicketRow) => {
  selectedDecklist.value = {
    playerName: row.participantName,
    decklist: row.decklist ?? "",
  };
};

const closeDecklistModal = () => {
  selectedDecklist.value = null;
};

const formatDate = (dateString: string) => {
  return formatDateInTimeZone(
    dateString,
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
    "de-DE",
    userTimeZone.value,
  );
};

const getRegistrationUrl = (eventId: string) => {
  if (import.meta.client) {
    return `${window.location.origin}/events/register/${eventId}`;
  }
  return `/events/register/${eventId}`;
};

const copyRegistrationLink = async (eventId: string) => {
  const url = getRegistrationUrl(eventId);
  try {
    await navigator.clipboard.writeText(url);
    copiedEventId.value = eventId;
    setTimeout(() => {
      copiedEventId.value = null;
    }, 2000);
  } catch (error) {
    console.error("Failed to copy link:", error);
    // Fallback for older browsers
    const input = document.createElement("input");
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    copiedEventId.value = eventId;
    setTimeout(() => {
      copiedEventId.value = null;
    }, 2000);
  }
};

// Load events on mount
onMounted(async () => {
  userTimeZone.value = getUserTimeZone();
  loadVenueDirectory();
  await loadEvents();

  const editEventId = useRoute().query.edit as string | undefined;
  if (editEventId) {
    const match = events.value.find((candidate) => candidate.id === editEventId);
    if (match) {
      editEvent(match);
    }
  }
});
</script>

<style scoped>
@import "~/assets/css/admin-shared.css";

.events-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
}

.events-manager-toolbar {
  padding: 0.75rem 1rem;
  background: var(--app-surface-0);
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  box-shadow: var(--app-shadow-soft);
}

.events-manager-spinner {
  width: 2rem;
  height: 2rem;
  border: 4px solid var(--app-surface-3);
  border-top-color: var(--app-accent);
  border-radius: 9999px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.events-manager-section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--app-text-primary);
}

.events-manager-card {
  background: var(--app-surface-0);
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    border-color 0.2s,
    opacity 0.2s;
  box-shadow: var(--app-shadow-soft);
}

.events-manager-card:hover {
  transform: translateY(-1px);
  border-color: var(--app-surface-3);
  box-shadow: var(--app-shadow-strong);
}

.events-manager-card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
  font-weight: 600;
  color: var(--app-text-primary);
}

.events-manager-close-button {
  padding: 0.25rem;
  color: var(--app-text-muted);
  transition: color 0.2s;
}

.events-manager-close-button:hover {
  color: var(--app-text-primary);
}

.event-card {
  background: var(--app-surface-0);
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid var(--app-border);
  transition: all 0.2s;
  box-shadow: var(--app-shadow-soft);
}

.event-card:hover {
  border-color: var(--app-accent);
  box-shadow: var(--app-shadow-strong);
}

.event-card.upcoming {
  border-left: 4px solid var(--app-button-blue);
}

.event-card.ongoing {
  border-left: 4px solid var(--app-button-amber);
}

.event-card.completed {
  border-left: 4px solid var(--app-button-green);
}

.event-card.cancelled {
  border-left: 4px solid var(--app-button-red);
  opacity: 0.7;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.event-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  flex: 1;
}

.event-title-row h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--app-text-primary);
  margin: 0;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: capitalize;
}

.status-badge.upcoming {
  background: var(--app-badge-info-bg);
  color: var(--app-badge-info-text);
}

.status-badge.ongoing {
  background: var(--app-badge-warning-bg);
  color: var(--app-badge-warning-text);
}

.status-badge.completed {
  background: var(--app-badge-success-bg);
  color: var(--app-badge-success-text);
}

.status-badge.cancelled {
  background: var(--app-badge-error-bg);
  color: var(--app-badge-error-text);
}

.event-details {
  margin-bottom: 1rem;
}

.event-details p {
  margin: 0.5rem 0;
  font-size: 0.95rem;
  color: var(--app-text-secondary);
}

.decklist-required {
  color: var(--app-button-green);
  font-weight: 500;
}

.description {
  color: var(--app-text-muted);
  font-style: italic;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--app-border);
}

.registration-link-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--app-border);
}

.registration-link-label {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: var(--app-text-muted);
}

.registration-link-container {
  display: flex;
  gap: 0.5rem;
}

.registration-link-input {
  flex: 1;
  padding: 0.625rem;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  font-size: 0.875rem;
  background: var(--app-surface-1);
  font-family: monospace;
  color: var(--app-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.registration-link-input:hover {
  background-color: var(--app-surface-2);
  border-color: var(--app-accent);
}

.registration-link-input:focus {
  outline: none;
  border-color: var(--app-accent);
  background-color: var(--app-surface-0);
}

.btn-copy {
  white-space: nowrap;
}

.btn-copy.copied {
  background: var(--app-button-green);
}

.event-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding-top: 1rem;
  border-top: 1px solid var(--app-border);
}

.btn-small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-info {
  background: var(--app-button-blue);
  color: var(--app-button-blue-text);
  border-color: var(--app-button-blue-border);
}

.btn-info:hover:not(:disabled) {
  background: var(--app-button-blue-hover, #1d4ed8);
}

.btn-success {
  background: var(--app-button-green);
  color: var(--app-button-green-text);
  border-color: var(--app-button-green-border);
}

.btn-success:hover:not(:disabled) {
  background: var(--app-button-green-hover, #047857);
}

.modal-large {
  max-width: 900px;
}

.registrations-stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem 1.1rem;
  background: color-mix(in srgb, var(--app-surface-1) 92%, var(--app-accent));
  border: 1px solid color-mix(in srgb, var(--app-border) 82%, var(--app-accent));
  border-radius: 1rem;
}

.registrations-stat-number {
  font-size: 2rem;
  line-height: 1;
  font-weight: 700;
  color: var(--app-text-primary);
}

.registrations-stat-label {
  font-size: 0.875rem;
  color: var(--app-text-muted);
}

.registrations-table-shell {
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  overflow: hidden;
  background: var(--app-surface-0);
  box-shadow: var(--app-shadow-soft);
}

.registrations-table {
  overflow-x: auto;
}

.registrations-table table {
  width: 100%;
  border-collapse: collapse;
}

.registrations-table th,
.registrations-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--app-border);
}

.registrations-table th {
  background: color-mix(in srgb, var(--app-surface-1) 90%, var(--app-accent));
  font-weight: 600;
  color: var(--app-text-secondary);
}

.registrations-table tr:hover {
  background: var(--app-surface-1);
}

.registrations-status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding: 0.3rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid transparent;
  text-transform: capitalize;
}

.status-registered {
  background: var(--app-badge-info-bg);
  border-color: color-mix(in srgb, var(--app-button-blue-border) 65%, transparent);
  color: var(--app-badge-info-text);
}

.status-reserved {
  background: var(--app-badge-warning-bg);
  border-color: color-mix(in srgb, var(--app-button-amber-border) 65%, transparent);
  color: var(--app-badge-warning-text);
}

.status-attended {
  background: var(--app-badge-success-bg);
  border-color: color-mix(in srgb, var(--app-button-green-border) 65%, transparent);
  color: var(--app-badge-success-text);
}

.status-no-show,
.status-cancelled {
  background: var(--app-badge-error-bg);
  border-color: color-mix(in srgb, var(--app-button-red-border) 65%, transparent);
  color: var(--app-badge-error-text);
}

.registration-row-checked td {
  background: color-mix(in srgb, var(--app-button-green) 42%, var(--app-surface-0));
  border-bottom-color: color-mix(
    in srgb,
    var(--app-button-green-border) 58%,
    var(--app-border)
  );
}

.checkin-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.checkin-toggle input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--app-button-blue);
  cursor: pointer;
}

.checkin-toggle input:disabled {
  cursor: wait;
}

.registrations-empty-state {
  border: 1px dashed var(--app-border);
  border-radius: 1rem;
  padding: 1.25rem;
  text-align: center;
  color: var(--app-text-muted);
  background: var(--app-surface-0);
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.status-registered {
  background-color: var(--app-badge-info-bg);
  color: var(--app-badge-info-text);
}

.status-attended {
  background-color: var(--app-badge-success-bg);
  color: var(--app-badge-success-text);
}

.status-no-show {
  background-color: var(--app-badge-error-bg);
  color: var(--app-badge-error-text);
}

.status-cancelled {
  background-color: var(--app-surface-2);
  color: var(--app-text-secondary);
}

.decklist-status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-success {
  background-color: var(--app-badge-success-bg);
  color: var(--app-badge-success-text);
}

.status-warning {
  background-color: var(--app-badge-warning-bg);
  color: var(--app-badge-warning-text);
}

.status-danger {
  background-color: var(--app-badge-error-bg);
  color: var(--app-badge-error-text);
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.decklist-viewer {
  max-height: 60vh;
  overflow-y: auto;
  background-color: var(--app-surface-1);
  border-radius: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--app-border);
}

.decklist-content-modal {
  font-family: "Courier New", monospace;
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  color: var(--app-text-secondary);
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--app-border);
  display: flex;
  justify-content: flex-start;
  gap: 0.5rem;
}

.event-form {
  padding: 1.5rem;
}

.event-form-modal {
  width: min(100%, 820px);
  max-width: 820px;
}

.event-form {
  display: grid;
  gap: 0.75rem;
  padding: 1.25rem;
}

.form-error-banner {
  border: 1px solid color-mix(in srgb, var(--app-danger, #dc2626) 28%, transparent);
  background: color-mix(in srgb, var(--app-danger, #dc2626) 10%, white);
  color: var(--app-danger, #b91c1c);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  font-size: 0.95rem;
  line-height: 1.4;
}

.event-form :deep(.form-row) {
  gap: 0.75rem;
}

.event-form :deep(.form-group) {
  margin-bottom: 0;
}

.event-form :deep(.form-input),
.event-form :deep(.form-select),
.event-form :deep(.form-textarea) {
  padding: 0.7rem 0.85rem;
}

@media (max-width: 639px) {
  .event-form-modal {
    width: 100%;
    max-height: calc(100vh - 1.5rem);
    border-radius: 14px;
  }

  .event-form {
    padding: 1rem;
  }
}

@media (min-width: 768px) {
  .events-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .event-form-modal {
    max-width: 820px;
  }
}

@media (min-width: 1024px) {
  .events-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .event-form-modal {
    max-width: 860px;
  }
}
</style>
