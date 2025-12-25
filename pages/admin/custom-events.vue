<template>
  <AdminPageLayout title="Custom Events">
    <!-- Search bar -->
    <div class="px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-10">
      <input
        v-model="searchTerm"
        type="text"
        placeholder="Search events..."
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <div class="p-4 pb-24">
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div
          class="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"
        ></div>
      </div>

      <div v-else>
        <!-- Upcoming Events -->
        <div class="mb-6">
          <h2
            class="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2"
          >
            <svg
              class="w-5 h-5 text-blue-600"
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
            Upcoming Events
            <span class="text-sm font-normal text-gray-500"
              >({{ upcomingEvents.length }})</span
            >
          </h2>

          <div v-if="upcomingEvents.length > 0" class="space-y-2">
            <div
              v-for="event in upcomingEvents"
              :key="event.id"
              class="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              @click="openEventDetails(event)"
            >
              <div class="p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <h3
                      class="font-semibold text-gray-900 mb-1 flex items-center gap-2 flex-wrap"
                    >
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
                    <div class="flex flex-col gap-1 text-sm text-gray-600">
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
                    class="w-5 h-5 flex-shrink-0 text-gray-400 mt-1"
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
          <div v-else class="text-center py-8 text-gray-500">
            No upcoming events
          </div>
        </div>

        <!-- Completed Events (Collapsible) -->
        <div class="mb-6">
          <button
            @click="showCompletedEvents = !showCompletedEvents"
            class="w-full text-left mb-3 flex items-center justify-between"
          >
            <h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">
              <svg
                class="w-5 h-5 text-green-600"
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
              Completed Events
              <span class="text-sm font-normal text-gray-500"
                >({{ completedEvents.length }})</span
              >
            </h2>
            <svg
              class="w-5 h-5 text-gray-400 transition-transform duration-200"
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
                class="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer opacity-75"
                @click="openEventDetails(event)"
              >
                <div class="p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <h3 class="font-semibold text-gray-700 mb-1">
                        {{ event.name }}
                      </h3>
                      <div class="flex flex-col gap-1 text-sm text-gray-500">
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
                      class="w-5 h-5 flex-shrink-0 text-gray-400 mt-1"
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
      class="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50"
      title="Create New Event"
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
          class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4"
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
              class="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl"
              @click.stop
            >
              <!-- Modal Header -->
              <div
                class="px-6 py-4 border-b border-gray-200 flex justify-between items-start"
              >
                <div class="flex-1">
                  <h3 class="text-xl font-bold text-gray-900 mb-2">
                    {{ selectedEvent.name }}
                  </h3>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span
                      v-for="tag in getDisplayTags(
                        selectedEvent.tags,
                        selectedEvent.tagType
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
                  class="text-gray-400 hover:text-gray-600 transition-colors p-1"
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
              <div class="px-6 py-4 overflow-y-auto flex-1">
                <div class="space-y-4">
                  <!-- Date and Time -->
                  <div class="flex items-start gap-3">
                    <svg
                      class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
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
                      <p class="text-sm font-medium text-gray-700">
                        Date & Time
                      </p>
                      <p class="text-sm text-gray-900">
                        {{ formatDate(selectedEvent.eventDate) }}
                      </p>
                    </div>
                  </div>

                  <!-- Venue -->
                  <div class="flex items-start gap-3">
                    <svg
                      class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
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
                      <p class="text-sm font-medium text-gray-700">Venue</p>
                      <p class="text-sm text-gray-900">
                        {{ selectedEvent.venue }}
                      </p>
                    </div>
                  </div>

                  <!-- Participants -->
                  <div class="flex items-start gap-3">
                    <svg
                      class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
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
                      <p class="text-sm font-medium text-gray-700">
                        Participants
                      </p>
                      <p class="text-sm text-gray-900">
                        {{ selectedEvent._count?.registrations || 0 }} /
                        {{ selectedEvent.maxParticipants }}
                        <span class="text-gray-500">registered</span>
                      </p>
                    </div>
                  </div>

                  <!-- Fee -->
                  <div
                    v-if="selectedEvent.participationFee"
                    class="flex items-start gap-3"
                  >
                    <svg
                      class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
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
                      <p class="text-sm font-medium text-gray-700">
                        Participation Fee
                      </p>
                      <p class="text-sm text-gray-900">
                        €{{ selectedEvent.participationFee }}
                      </p>
                    </div>
                  </div>

                  <!-- Decklist Required -->
                  <div
                    v-if="selectedEvent.requiresDecklist"
                    class="flex items-start gap-3"
                  >
                    <svg
                      class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
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
                      <p class="text-sm font-medium text-gray-700">Decklist</p>
                      <p class="text-sm text-gray-900">
                        Required after registration
                      </p>
                    </div>
                  </div>

                  <!-- Description -->
                  <div
                    v-if="selectedEvent.description"
                    class="flex items-start gap-3"
                  >
                    <svg
                      class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
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
                      <p class="text-sm font-medium text-gray-700">
                        Description
                      </p>
                      <p class="text-sm text-gray-900">
                        {{ selectedEvent.description }}
                      </p>
                    </div>
                  </div>

                  <!-- Registration Link -->
                  <div class="flex items-start gap-3">
                    <svg
                      class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
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
                      <p class="text-sm font-medium text-gray-700 mb-1">
                        Registration Link
                      </p>
                      <div class="flex gap-2">
                        <input
                          :value="getRegistrationUrl(selectedEvent.id)"
                          readonly
                          class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                          @click="($event.target as HTMLInputElement)?.select()"
                        />
                        <button
                          @click="copyRegistrationLink(selectedEvent.id)"
                          class="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          :class="{
                            'bg-green-600 hover:bg-green-700':
                              copiedEventId === selectedEvent.id,
                          }"
                        >
                          {{
                            copiedEventId === selectedEvent.id
                              ? "✓ Copied!"
                              : "Copy"
                          }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Modal Footer -->
              <div
                class="px-6 py-4 border-t border-gray-200 flex flex-wrap gap-2"
              >
                <NuxtLink
                  :to="`/events/register/${selectedEvent.id}`"
                  class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors no-underline"
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
                  Open Registration
                </NuxtLink>
                <button
                  @click="viewRegistrations(selectedEvent)"
                  class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
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
                  Registrations ({{ selectedEvent._count?.registrations || 0 }})
                </button>
                <template v-if="!selectedEvent.isExternalEvent">
                  <button
                    @click="editEvent(selectedEvent)"
                    class="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    @click="deleteEvent(selectedEvent)"
                    class="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </template>
                <template v-else>
                  <NuxtLink
                    to="/admin/external-events"
                    class="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors no-underline"
                  >
                    Manage in External Events
                  </NuxtLink>
                </template>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Registration Management Modal -->
    <div
      v-if="showRegistrations"
      class="modal-overlay"
      @click="closeRegistrationsModal"
    >
      <div class="modal-content modal-large" @click.stop>
        <div class="modal-header">
          <h2>{{ selectedEvent?.name }} - Registrations</h2>
          <button @click="closeRegistrationsModal" class="close-btn">
            &times;
          </button>
        </div>

        <div class="registrations-content">
          <div class="registrations-stats">
            <div class="stat-item">
              <span class="stat-number">{{ registrations.length }}</span>
              <span class="stat-label">Total Registered</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{
                selectedEvent?.maxParticipants || 0
              }}</span>
              <span class="stat-label">Max Capacity</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{
                (selectedEvent?.maxParticipants || 0) - registrations.length
              }}</span>
              <span class="stat-label">Available Spots</span>
            </div>
          </div>

          <div v-if="registrations.length > 0" class="registrations-table">
            <table>
              <thead>
                <tr>
                  <th>Player ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Registered At</th>
                  <th>Status</th>
                  <th v-if="selectedEvent?.requiresDecklist">Decklist</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="registration in registrations"
                  :key="registration.id"
                >
                  <td>{{ registration.player.playerId }}</td>
                  <td>{{ registration.player.name }}</td>
                  <td>{{ registration.player.email || "N/A" }}</td>
                  <td>{{ formatDate(registration.registeredAt) }}</td>
                  <td>
                    <span
                      class="status-badge"
                      :class="`status-${registration.status}`"
                    >
                      {{ registration.status }}
                    </span>
                  </td>
                  <td v-if="selectedEvent?.requiresDecklist">
                    <span
                      v-if="registration.decklist"
                      class="decklist-status status-success"
                    >
                      ✓ Submitted
                    </span>
                    <span
                      v-else-if="registration.bringingDecklistOnsite"
                      class="decklist-status status-warning"
                    >
                      📋 Bringing On-site
                    </span>
                    <span v-else class="decklist-status status-danger">
                      ✗ Not Submitted
                    </span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button
                        v-if="
                          selectedEvent?.requiresDecklist &&
                          registration.decklist
                        "
                        @click="viewDecklist(registration)"
                        class="btn btn-small btn-info"
                      >
                        View Decklist
                      </button>
                      <button
                        @click="cancelRegistration(registration)"
                        class="btn btn-small btn-danger"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="no-registrations">
            No registrations yet for this event.
          </div>
        </div>
      </div>
    </div>

    <!-- Decklist Viewer Modal -->
    <div
      v-if="selectedDecklist"
      class="modal-overlay"
      @click="closeDecklistModal"
      style="z-index: 1001"
    >
      <div class="modal-content modal-large" @click.stop>
        <div class="modal-header">
          <h2>Decklist - {{ selectedDecklist.player.name }}</h2>
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
            ← Zurück
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
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ editingEvent ? "Edit Event" : "Create New Event" }}</h2>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>

        <form @submit.prevent="saveEvent" class="event-form">
          <div class="form-group">
            <label for="name">Event Name *</label>
            <input
              id="name"
              v-model="eventForm.name"
              type="text"
              required
              class="form-input"
              placeholder="Enter event name"
            />
          </div>

          <div class="form-group">
            <label for="venue">Venue *</label>
            <input
              id="venue"
              v-model="eventForm.venue"
              type="text"
              required
              class="form-input"
              placeholder="Event venue"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="tagType">Game Category *</label>
              <select
                id="tagType"
                v-model="eventForm.tagType"
                required
                class="form-input"
              >
                <option value="pokemon">Pokémon</option>
                <option value="riftbound">Riftbound</option>
                <option value="generic">Generic</option>
              </select>
            </div>

            <div class="form-group">
              <label for="gameTag">Game *</label>
              <input
                id="gameTag"
                v-model="eventForm.tags.game"
                type="text"
                required
                class="form-input"
                placeholder="Pokemon, Riftbound, etc."
              />
            </div>
          </div>

          <div class="form-group">
            <label for="eventType">Event Type *</label>
            <select
              id="eventType"
              v-model="eventForm.tags.type"
              required
              class="form-input"
            >
              <option value="custom">Custom Event</option>
              <option value="league_challenge">League Challenge</option>
              <option value="league_cup">League Cup</option>
              <option value="local_tournament">Local Tournament</option>
              <option value="prerelease">Prerelease</option>
              <option value="regional">Regional Championship</option>
              <option value="international">International Championship</option>
              <option value="worlds">World Championship</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="formatTag">Format</label>
              <input
                id="formatTag"
                v-model="eventForm.tags.format"
                type="text"
                class="form-input"
                placeholder="Standard, Expanded, etc."
              />
            </div>

            <div class="form-group">
              <label for="hostTag">Host Organization</label>
              <input
                id="hostTag"
                v-model="eventForm.tags.host"
                type="text"
                class="form-input"
                placeholder="League name, store name, etc."
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="maxParticipants">Max Participants *</label>
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
              <label for="participationFee">Participation Fee (€)</label>
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

          <div class="form-group">
            <label for="eventDate">
              Event Date *
              <span v-if="eventForm.eventDate" class="field-help">
                {{ formatDateWithWeekday(eventForm.eventDate) }}
              </span>
            </label>
            <input
              id="eventDate"
              v-model="eventForm.eventDate"
              type="datetime-local"
              required
              class="form-input"
              @change="onEventDateChange"
            />
          </div>

          <div class="form-group">
            <label for="registrationDeadline">
              Registration Deadline
              <span class="field-help">
                Automatically set to 15 minutes before event start
              </span>
            </label>
            <input
              id="registrationDeadline"
              v-model="eventForm.registrationDeadline"
              type="datetime-local"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              v-model="eventForm.description"
              class="form-textarea"
              rows="3"
              placeholder="Event description..."
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
                Requires Decklist
                <span class="checkbox-help">
                  Participants must submit a decklist after registration
                </span>
              </label>
            </div>
          </div>

          <div v-if="editingEvent" class="form-group">
            <label for="status">Status</label>
            <select id="status" v-model="eventForm.status" class="form-select">
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeModal" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="saving" class="btn btn-primary">
              {{
                saving
                  ? "Saving..."
                  : editingEvent
                  ? "Update Event"
                  : "Create Event"
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
  type TagType,
  type PokemonEventTags,
} from "~/types/eventTags";
import { useTagDisplay } from "~/composables/useTagDisplay";

const { getDisplayTags } = useTagDisplay();

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

interface Registration {
  id: string;
  customEventId: string;
  playerId: string;
  registeredAt: string;
  status: string;
  notes?: string;
  decklist?: string | null;
  bringingDecklistOnsite?: boolean;
  player: {
    id: string;
    playerId: string;
    name: string;
    email?: string;
    birthDate: string;
  };
}

// Page metadata
// Reactive data
const events = ref<CustomEvent[]>([]);
const registrations = ref<Registration[]>([]);
const loading = ref(true);
const saving = ref(false);
const showCreateForm = ref(false);
const showRegistrations = ref(false);
const showCompletedEvents = ref(false);
const editingEvent = ref<CustomEvent | null>(null);
const selectedEvent = ref<CustomEvent | null>(null);
const searchTerm = ref("");
const copiedEventId = ref<string | null>(null);
const selectedDecklist = ref<Registration | null>(null);

// Computed properties for upcoming and completed events
const upcomingEvents = computed(() => {
  const now = new Date();
  const filtered = filteredEvents.value.filter((event) => {
    const eventDate = new Date(event.eventDate);
    // Only show events that are explicitly "upcoming" or have future date AND not completed
    return (
      event.status !== "completed" &&
      (event.status === "upcoming" || eventDate >= now)
    );
  });
  return filtered.sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );
});

const completedEvents = computed(() => {
  const now = new Date();
  const filtered = filteredEvents.value.filter((event) => {
    const eventDate = new Date(event.eventDate);
    return (
      event.status === "completed" ||
      (event.status !== "upcoming" && eventDate < now)
    );
  });
  return filtered.sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );
});

// Format compact date
const formatCompactDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if today
  if (date.toDateString() === now.toDateString()) {
    return `Today, ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  // Check if tomorrow
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow, ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  // Otherwise show full date
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Status badge classes
const getStatusBadgeClass = (status: string): string => {
  const classes = {
    upcoming: "bg-blue-100 text-blue-800",
    ongoing: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return classes[status as keyof typeof classes] || classes.upcoming;
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
const eventForm = ref({
  name: "",
  venue: "",
  tagType: "pokemon" as TagType,
  tags: {
    type: "custom" as PokemonEventTags["type"],
    game: "Pokemon",
  },
  maxParticipants: 20,
  participationFee: 0,
  description: "",
  eventDate: "",
  registrationDeadline: "",
  requiresDecklist: false,
  status: "upcoming",
});

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
    0
  );

  return nextFriday;
};

// Format date with weekday
const formatDateWithWeekday = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const weekday = date.toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
  });
  const formatted = date.toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${weekday}, ${formatted}`;
};

// Initialize form with default dates when creating new event
const initializeEventForm = () => {
  const nextFriday = getNextFriday();

  // Format for datetime-local input in German timezone
  const formatForInput = (date: Date): string => {
    const berlinDate = new Date(
      date.toLocaleString("en-US", { timeZone: "Europe/Berlin" })
    );
    const year = berlinDate.getFullYear();
    const month = String(berlinDate.getMonth() + 1).padStart(2, "0");
    const day = String(berlinDate.getDate()).padStart(2, "0");
    const hours = String(berlinDate.getHours()).padStart(2, "0");
    const minutes = String(berlinDate.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const eventDateTime = formatForInput(nextFriday);

  // Registration deadline: 15 minutes before event
  const regDeadline = new Date(nextFriday.getTime() - 15 * 60 * 1000);
  const regDeadlineString = formatForInput(regDeadline);

  eventForm.value = {
    name: "",
    venue: "",
    tagType: "pokemon" as TagType,
    tags: {
      type: "custom" as PokemonEventTags["type"],
      game: "Pokemon",
    },
    maxParticipants: 20,
    participationFee: 0,
    description: "",
    eventDate: eventDateTime,
    registrationDeadline: regDeadlineString,
    requiresDecklist: false,
    status: "upcoming",
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
      event.status.toLowerCase().includes(search)
  );
});

// Methods
const createNewEvent = () => {
  initializeEventForm();
  showCreateForm.value = true;
};

const onEventDateChange = () => {
  // Auto-set registration deadline based on event date
  if (eventForm.value.eventDate) {
    const eventDate = new Date(eventForm.value.eventDate);

    // Registration deadline: 15 minutes before event (but still editable)
    const regDeadline = new Date(eventDate.getTime() - 15 * 60 * 1000);

    // Format for datetime-local input in German timezone
    const berlinDate = new Date(
      regDeadline.toLocaleString("en-US", { timeZone: "Europe/Berlin" })
    );
    const year = berlinDate.getFullYear();
    const month = String(berlinDate.getMonth() + 1).padStart(2, "0");
    const day = String(berlinDate.getDate()).padStart(2, "0");
    const hours = String(berlinDate.getHours()).padStart(2, "0");
    const minutes = String(berlinDate.getMinutes()).padStart(2, "0");

    eventForm.value.registrationDeadline = `${year}-${month}-${day}T${hours}:${minutes}`;
  }
};

const loadEvents = async () => {
  try {
    loading.value = true;
    const response = await $fetch<{ events: CustomEvent[] }>(
      "/api/admin/events/combined"
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

    const eventData = {
      ...eventForm.value,
      participationFee: eventForm.value.participationFee
        ? Number(eventForm.value.participationFee)
        : undefined,
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
    closeModal();
    // TODO: Show success message
  } catch (error) {
    console.error("Error saving event:", error);
    // TODO: Show error message
  } finally {
    saving.value = false;
  }
};

const editEvent = (event: CustomEvent) => {
  // Prevent editing external events from this page
  if ((event as any).isExternalEvent) {
    alert("External events must be managed in the External Events page.");
    return;
  }

  editingEvent.value = event;

  // Convert dates from UTC to German timezone for datetime-local input
  const formatForInput = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    // Get the date in German timezone
    const berlinDate = new Date(
      date.toLocaleString("en-US", { timeZone: "Europe/Berlin" })
    );
    const year = berlinDate.getFullYear();
    const month = String(berlinDate.getMonth() + 1).padStart(2, "0");
    const day = String(berlinDate.getDate()).padStart(2, "0");
    const hours = String(berlinDate.getHours()).padStart(2, "0");
    const minutes = String(berlinDate.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  eventForm.value = {
    name: event.name,
    venue: event.venue,
    tagType: (event.tagType as TagType) || "pokemon",
    tags: event.tags
      ? parseEventTags(event.tags, (event.tagType as TagType) || "pokemon")
      : { game: "Pokemon" },
    maxParticipants: event.maxParticipants,
    participationFee: event.participationFee || 0,
    description: event.description || "",
    eventDate: formatForInput(event.eventDate),
    registrationDeadline: event.registrationDeadline
      ? formatForInput(event.registrationDeadline)
      : "",
    requiresDecklist: event.requiresDecklist,
    status: event.status,
  };
};

const deleteEvent = async (event: CustomEvent) => {
  // Prevent deleting external events from this page
  if ((event as any).isExternalEvent) {
    alert("External events must be managed in the External Events page.");
    return;
  }

  if (!confirm(`Are you sure you want to delete "${event.name}"?`)) return;

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
    const response = await $fetch<{ registrations: Registration[] }>(
      `/api/admin/registrations?eventId=${event.id}`
    );
    registrations.value = response.registrations || [];
    showRegistrations.value = true;
  } catch (error) {
    console.error("Error loading registrations:", error);
    // TODO: Show error message
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
  if (!confirm(`Remove ${registration.player.name} from this event?`)) return;

  try {
    await $fetch(`/api/admin/registrations?id=${registration.id}`, {
      method: "DELETE",
    });
    registrations.value = registrations.value.filter(
      (r) => r.id !== registration.id
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
  initializeEventForm();
};

const closeRegistrationsModal = () => {
  showRegistrations.value = false;
  selectedEvent.value = null;
  registrations.value = [];
};

const viewDecklist = (registration: Registration) => {
  selectedDecklist.value = registration;
};

const closeDecklistModal = () => {
  selectedDecklist.value = null;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
onMounted(loadEvents);
</script>

<style scoped>
@import "~/assets/css/admin-shared.css";

.events-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
}

.event-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid #e2e8f0;
  transition: all 0.2s;
}

.event-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.event-card.upcoming {
  border-left: 4px solid #3b82f6;
}

.event-card.ongoing {
  border-left: 4px solid #10b981;
}

.event-card.completed {
  border-left: 4px solid #6b7280;
}

.event-card.cancelled {
  border-left: 4px solid #ef4444;
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
  color: #1e293b;
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
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.ongoing {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.completed {
  background: #f3f4f6;
  color: #374151;
}

.status-badge.cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.event-details {
  margin-bottom: 1rem;
}

.event-details p {
  margin: 0.5rem 0;
  font-size: 0.95rem;
  color: #475569;
}

.decklist-required {
  color: #059669;
  font-weight: 500;
}

.description {
  color: #64748b;
  font-style: italic;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f1f5f9;
}

.registration-link-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.registration-link-label {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: #64748b;
}

.registration-link-container {
  display: flex;
  gap: 0.5rem;
}

.registration-link-input {
  flex: 1;
  padding: 0.625rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  background: #f8fafc;
  font-family: monospace;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.registration-link-input:hover {
  background-color: #eff6ff;
  border-color: #3b82f6;
}

.registration-link-input:focus {
  outline: none;
  border-color: #3b82f6;
  background-color: white;
}

.btn-copy {
  white-space: nowrap;
}

.btn-copy.copied {
  background: #10b981;
}

.event-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.btn-small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-info {
  background: #0ea5e9;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: #0284c7;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #059669;
}

.modal-large {
  max-width: 900px;
}

.registrations-content {
  padding: 1.5rem;
}

.registrations-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  text-align: center;
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
  border-bottom: 1px solid #e2e8f0;
}

.registrations-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
}

.registrations-table tr:hover {
  background: #f8fafc;
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
  background-color: #dbeafe;
  color: #1e40af;
}

.status-attended {
  background-color: #d1fae5;
  color: #065f46;
}

.status-no-show {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-cancelled {
  background-color: #f3f4f6;
  color: #6b7280;
}

.decklist-status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-success {
  background-color: #d1fae5;
  color: #065f46;
}

.status-warning {
  background-color: #fef3c7;
  color: #92400e;
}

.status-danger {
  background-color: #fee2e2;
  color: #991b1b;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.decklist-viewer {
  max-height: 60vh;
  overflow-y: auto;
  background-color: #f9fafb;
  border-radius: 0.5rem;
  padding: 1rem;
}

.decklist-content-modal {
  font-family: "Courier New", monospace;
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  color: #1f2937;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-start;
  gap: 0.5rem;
}

.event-form {
  padding: 1.5rem;
}

@media (min-width: 768px) {
  .events-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .events-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
