<template>
  <div class="min-h-screen bg-[#36393f]">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div
          class="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"
        ></div>
        <p class="text-gray-300">{{ tr("eventRegisterPage.loading", "Eventdetails werden geladen...") }}</p>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="flex items-center justify-center min-h-screen px-4"
    >
      <div
        class="bg-[#2f3136] rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-[#202225]"
      >
        <h2 class="text-2xl font-bold text-gray-100 mb-2">
          {{ t("eventRegisterPage.notFoundTitle") }}
        </h2>
        <p class="text-gray-400 mb-6">{{ error }}</p>
        <NuxtLink
          to="/"
          class="inline-block px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 transition"
        >
          {{ t("eventRegisterPage.backToEvents") }}
        </NuxtLink>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="event" class="max-w-5xl mx-auto px-4 py-8">
      <div class="grid lg:grid-cols-[350px_1fr] gap-6">
        <!-- Event Info Card (Sidebar on desktop, top on mobile) -->
        <aside
          class="bg-[#2f3136] rounded-2xl shadow-lg p-6 h-fit sticky top-8 border border-[#202225]"
        >
          <h1 class="text-2xl font-bold text-gray-100 mb-4">
            {{ event.name }}
          </h1>

          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <svg
                class="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                ></path>
              </svg>
              <div>
                <div class="text-xs text-gray-400 font-medium uppercase">
                  {{ tr("eventList.dateTime", "Datum & Uhrzeit") }}
                </div>
                <div class="text-sm text-gray-200 font-medium">
                  {{ formatEventDate(event.eventDate) }}
                </div>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <svg
                class="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0"
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
              <div>
                <div class="text-xs text-gray-400 font-medium uppercase">
                  {{ tr("common.venue", "Veranstaltungsort") }}
                </div>
                <div class="text-sm text-gray-200 font-medium">
                  {{ event.venue }}
                </div>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <svg
                class="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                ></path>
              </svg>
              <div>
                <div class="text-xs text-gray-400 font-medium uppercase">
                  {{ tr("common.participants", "Teilnehmer") }}
                </div>
                <div class="text-sm text-gray-200 font-medium">
                  <span
                    :class="
                      registrationFull ? 'text-red-500' : 'text-green-500'
                    "
                  >
                    {{ effectiveParticipantsCount }}
                  </span>
                  <span class="text-gray-500"
                    >/{{ event.maxParticipants }}</span
                  >
                </div>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <svg
                class="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0"
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
              <div>
                <div class="text-xs text-gray-400 font-medium uppercase">
                  {{ tr("eventDetailPage.entryFee", "Startgeld") }}
                </div>
                <div
                  class="text-sm font-semibold"
                  :class="
                    event.participationFee > 0
                      ? 'text-gray-200'
                      : 'text-green-500'
                  "
                >
                  {{
                    event.participationFee > 0
                      ? `${event.participationFee}`
                      : tr("eventRegisterPage.freeEntry", "Kostenloser Eintritt")
                  }}
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="event.requiresDecklist"
            class="mt-6 p-3 bg-amber-900/30 border border-amber-700/50 rounded-lg"
          >
            <div class="flex items-center gap-2 text-amber-400">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
              <span class="text-xs font-semibold">{{
                t("events.decklistRequired")
              }}</span>
            </div>
          </div>

          <NuxtLink
            to="/"
            class="mt-6 block text-center text-sm text-gray-400 hover:text-emerald-500 transition"
          >
            {{ tr("eventRegisterPage.backToEvents", "Zurück zu den Events") }}
          </NuxtLink>
        </aside>

        <!-- Registration Form -->
        <main>
          <!-- Status Messages -->
          <div
            v-if="
              existingRegistration &&
              !eventPassed &&
              !registrationSuccess
            "
            class="bg-blue-900/20 border border-blue-700/50 rounded-2xl p-6 mb-6"
          >
            <h3 class="text-lg font-bold text-blue-300 mb-2">
              {{ t("eventRegisterPage.alreadyRegisteredTitle") }}
            </h3>
            <p class="text-blue-100">
              {{
                t("eventRegisterPage.alreadyRegisteredText", {
                  count: existingRegistration.activeTicketCount,
                })
              }}
            </p>
            <p
              v-if="existingRegistration.ticketNames.length"
              class="text-sm text-blue-200 mt-2"
            >
              {{
                t("eventRegisterPage.registeredNames", {
                  names: existingRegistration.ticketNames.join(", "),
                })
              }}
            </p>
            <div class="mt-4 flex flex-col sm:flex-row gap-3">
              <NuxtLink
                :to="`/booking/${existingRegistration.bookingId}`"
                class="inline-flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                {{ t("eventRegisterPage.manageExistingBooking") }}
              </NuxtLink>
              <NuxtLink
                v-if="existingRegistration.canAddTickets"
                :to="`/booking/${existingRegistration.bookingId}?addTicket=1`"
                class="inline-flex items-center justify-center px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
              >
                {{
                  t("eventRegisterPage.addMoreTickets", {
                    count: existingRegistration.remainingSpots,
                  })
                }}
              </NuxtLink>
            </div>
            <p
              v-if="!existingRegistration.canAddTickets"
              class="text-sm text-blue-200 mt-3"
            >
              {{ t("eventRegisterPage.noAdditionalTicketsAvailable") }}
            </p>
          </div>

          <div
            v-if="
              registrationFull &&
              !eventPassed &&
              !registrationSuccess &&
              !existingRegistration
            "
            class="bg-red-900/20 border border-red-700/50 rounded-2xl p-6 mb-6"
          >
            <h3 class="text-lg font-bold text-red-400 mb-2">
              {{ tr("registration.eventFull", "Veranstaltung ausgebucht") }}
            </h3>
            <p class="text-red-300">
              {{
                tr("eventRegisterPage.eventFullText", "Dieses Event hat bereits die maximale Kapazität von {max} Teilnehmern erreicht.", {
                  max: event.maxParticipants,
                })
              }}
            </p>
            <div class="mt-4 border-t border-red-700/40 pt-4">
              <p class="text-sm text-red-200 mb-3">
                {{ tr("eventRegisterPage.waitlistAvailableHint", "Warteliste verfügbar.") }}
              </p>
              <p v-if="waitlistMessage" class="text-sm text-amber-100 mt-2">
                {{ waitlistMessage }}
              </p>
            </div>
          </div>

          <div
            v-if="eventPassed"
            class="bg-red-900/20 border border-red-700/50 rounded-2xl p-6 mb-6"
          >
            <h3 class="text-lg font-bold text-red-400 mb-2">
              {{ t("registration.registrationClosed") }}
            </h3>
            <p class="text-red-300">{{ t("eventRegisterPage.eventPassed") }}</p>
          </div>

          <div
            v-if="registrationSuccess"
            class="bg-green-900/20 border border-green-700/50 rounded-2xl p-6 mb-6"
          >
            <h3 class="text-lg font-bold text-green-400 mb-2">
              {{ t("registration.registrationSuccess") }}
            </h3>
            <p class="text-green-300 mb-2">
              <strong>{{ form.tickets[0].name }}</strong> (ID:
              {{ form.tickets[0].playerId }})
              {{ t("eventRegisterPage.successRegisteredFor", { eventName: event.name }) }}.
            </p>
            <p v-if="event.requiresDecklist" class="text-green-300 text-sm">
              {{ t("eventRegisterPage.redirectDecklist") }}
            </p>
            <p v-else class="text-green-300 text-sm">
              {{ t("eventRegisterPage.redirectDashboard") }}
            </p>
          </div>

          <!-- Form Card -->
          <div
            v-if="
              !eventPassed &&
              !registrationSuccess &&
              !registrationFull &&
              !existingRegistration
            "
            class="bg-[#2f3136] rounded-2xl shadow-lg p-6 lg:p-8 border border-[#202225]"
          >
            <h2 class="text-2xl font-bold text-gray-100 mb-6">
              {{ t("eventRegisterPage.completeRegistration") }}
            </h2>

            <form @submit.prevent="submitRegistration" class="space-y-5">
              <div
                v-if="userLoading"
                class="flex items-center justify-center py-8"
              >
                <div
                  class="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mr-3"
                ></div>
                <p class="text-gray-300">
                  {{ t("eventRegisterPage.loadingProfile") }}
                </p>
              </div>

              <div v-else class="space-y-5">
                <div
                  v-if="playerIntegrityError"
                  class="bg-red-900/20 border border-red-700/50 rounded-lg p-4"
                >
                  <p class="text-red-300 text-sm">{{ playerIntegrityError }}</p>
                </div>

                <div>
                  <label
                    for="playerId"
                    class="block text-sm font-semibold text-gray-200 mb-2"
                  >
                    {{ t("eventRegisterPage.playerIdLabel") }} *
                  </label>
                  <input
                    id="playerId"
                    v-model="form.tickets[0].playerId"
                    type="text"
                    inputmode="numeric"
                    pattern="\d*"
                    required
                    :disabled="submitting || !!playerIntegrityError"
                    class="w-full px-4 py-3 border-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-[#40444b] text-gray-200"
                    :class="
                      form.tickets[0].playerId
                        ? 'border-green-600'
                        : 'border-gray-600'
                    "
                    :placeholder="t('eventRegisterPage.playerIdPlaceholder')"
                    @input="validatePlayerId($event, 0)"
                  />
                  <p
                    v-if="form.tickets[0].playerId"
                    class="mt-1.5 text-xs text-green-500 font-medium"
                  >
                    ✓ {{ t("eventRegisterPage.autoFilledProfile") }}
                  </p>
                </div>

                <div>
                  <label
                    for="name"
                    class="block text-sm font-semibold text-gray-200 mb-2"
                  >
                    {{ t("eventRegisterPage.fullNameLabel") }} *
                  </label>
                  <input
                    id="name"
                    v-model="form.tickets[0].name"
                    type="text"
                    required
                    :disabled="submitting || !!playerIntegrityError"
                    class="w-full px-4 py-3 border-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-[#40444b] text-gray-200"
                    :class="
                      form.tickets[0].name
                        ? 'border-green-600'
                        : 'border-gray-600'
                    "
                    :placeholder="t('eventRegisterPage.fullNamePlaceholder')"
                  />
                  <p
                    v-if="form.tickets[0].name"
                    class="mt-1.5 text-xs text-green-500 font-medium"
                  >
                    ✓ {{ t("eventRegisterPage.autoFilledProfile") }}
                  </p>
                </div>

                <div>
                  <label
                    for="email"
                    class="block text-sm font-semibold text-gray-200 mb-2"
                  >
                    {{ t("eventRegisterPage.emailLabel") }} *
                  </label>
                  <input
                    id="email"
                    v-model="form.bookerEmail"
                    type="email"
                    required
                    :disabled="submitting || !!playerIntegrityError"
                    class="w-full px-4 py-3 border-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-[#40444b] text-gray-200"
                    :class="
                      form.bookerEmail ? 'border-green-600' : 'border-gray-600'
                    "
                    :placeholder="t('eventRegisterPage.emailPlaceholder')"
                  />
                  <p
                    v-if="form.bookerEmail"
                    class="mt-1.5 text-xs text-green-500 font-medium"
                  >
                    ✓ {{ t("eventRegisterPage.autoFilledAccount") }}
                  </p>
                </div>

                <!-- Privacy Notice & Anonymous Participation -->
                <div
                  class="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4"
                >
                  <div class="flex items-start gap-3 mb-3">
                    <svg
                      class="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    <div>
                      <p class="font-semibold text-blue-300 text-sm">{{ t("eventRegisterPage.privacyTitle") }}</p>
                      <p class="text-blue-200 text-xs mt-1">
                        {{ t("eventRegisterPage.privacyText") }}
                      </p>
                    </div>
                  </div>

                  <label class="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      v-model="form.tickets[0].isAnonymous"
                      :disabled="submitting || !!playerIntegrityError"
                      class="mt-0.5 w-4 h-4 text-emerald-600 border-gray-500 rounded focus:ring-emerald-500 focus:ring-2 bg-[#40444b]"
                    />
                    <div class="flex-1">
                      <span class="text-sm font-medium text-gray-200"
                        >{{ t("eventRegisterPage.anonymousParticipationTitle") }}</span
                      >
                      <p class="text-xs text-gray-400 mt-0.5">
                        {{ t("eventRegisterPage.anonymousParticipationText") }}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div
                v-if="event.requiresDecklist"
                class="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4"
              >
                <div class="flex items-start gap-3">
                  <svg
                    class="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <div>
                    <p class="font-semibold text-amber-300 text-sm">
                      {{ t("eventRegisterPage.decklistRequiredTitle") }}
                    </p>
                    <p class="text-amber-200 text-xs mt-1">
                      {{ t("eventRegisterPage.decklistRequiredText") }}
                    </p>
                  </div>
                </div>
              </div>

              <div
                v-if="formError"
                class="bg-red-900/20 border border-red-700/50 rounded-lg p-4"
              >
                <p class="text-red-300 text-sm">{{ formError }}</p>
              </div>

              <button
                type="submit"
                :disabled="submitting || !canSubmitRegistration"
                class="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-green-700 transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <span v-if="submitting">{{
                  t("registration.registering")
                }}</span>
                <span v-else
                  >{{ t("eventRegisterPage.completeRegistration") }} →</span
                >
              </button>
            </form>
          </div>

          <div
            v-if="
              !eventPassed &&
              !registrationSuccess &&
              registrationFull &&
              !existingRegistration
            "
            class="bg-[#2f3136] rounded-2xl shadow-lg p-6 lg:p-8 border border-[#202225]"
          >
            <h2 class="text-2xl font-bold text-gray-100 mb-6">
              {{ tr("eventRegisterPage.joinWaitlist", "Auf Warteliste setzen") }}
            </h2>
            <form @submit.prevent="joinWaitlist" class="space-y-5">
              <div v-if="userLoading" class="flex items-center justify-center py-8">
                <div class="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                <p class="text-gray-300">{{ t("eventRegisterPage.loadingProfile") }}</p>
              </div>
              <div v-else class="space-y-5">
                <div
                  v-if="playerIntegrityError"
                  class="bg-red-900/20 border border-red-700/50 rounded-lg p-4"
                >
                  <p class="text-red-300 text-sm">{{ playerIntegrityError }}</p>
                </div>
                <div>
                  <label for="waitlistPlayerId" class="block text-sm font-semibold text-gray-200 mb-2">
                    {{ t("eventRegisterPage.playerIdLabel") }} *
                  </label>
                  <input
                    id="waitlistPlayerId"
                    v-model="form.tickets[0].playerId"
                    type="text"
                    inputmode="numeric"
                    pattern="\d*"
                    required
                    :disabled="waitlistBusy || !!playerIntegrityError"
                    class="w-full px-4 py-3 border-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-[#40444b] text-gray-200"
                    :class="form.tickets[0].playerId ? 'border-amber-500' : 'border-gray-600'"
                    :placeholder="t('eventRegisterPage.playerIdPlaceholder')"
                    @input="validatePlayerId($event, 0)"
                  />
                </div>
                <div>
                  <label for="waitlistName" class="block text-sm font-semibold text-gray-200 mb-2">
                    {{ t("eventRegisterPage.fullNameLabel") }} *
                  </label>
                  <input
                    id="waitlistName"
                    v-model="form.tickets[0].name"
                    type="text"
                    required
                    :disabled="waitlistBusy || !!playerIntegrityError"
                    class="w-full px-4 py-3 border-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-[#40444b] text-gray-200"
                    :class="form.tickets[0].name ? 'border-amber-500' : 'border-gray-600'"
                    :placeholder="t('eventRegisterPage.fullNamePlaceholder')"
                  />
                </div>
                <div>
                  <label for="waitlistEmail" class="block text-sm font-semibold text-gray-200 mb-2">
                    {{ t("eventRegisterPage.emailLabel") }} *
                  </label>
                  <input
                    id="waitlistEmail"
                    v-model="form.bookerEmail"
                    type="email"
                    required
                    :disabled="waitlistBusy || !!playerIntegrityError"
                    class="w-full px-4 py-3 border-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-[#40444b] text-gray-200"
                    :class="form.bookerEmail ? 'border-amber-500' : 'border-gray-600'"
                    :placeholder="t('eventRegisterPage.emailPlaceholder')"
                  />
                </div>
                <p
                  v-if="waitlistStatus === 'none' || waitlistStatus === 'expired'"
                  class="text-xs text-red-100"
                >
                  {{ tr("eventRegisterPage.waitlistSingleSlotHint", "Pro Nutzer ist nur ein Wartelistenplatz möglich.") }}
                </p>
                <button
                  v-if="waitlistStatus === 'none' || waitlistStatus === 'expired'"
                  type="submit"
                  :disabled="!canJoinWaitlist"
                  class="w-full py-4 px-6 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:from-amber-700 hover:to-orange-700 transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {{ waitlistBusy ? tr("eventRegisterPage.pleaseWait", "Bitte warten...") : tr("eventRegisterPage.joinWaitlist", "Auf Warteliste setzen") }}
                </button>
                <button
                  v-else-if="waitlistStatus === 'pending_claim'"
                  type="button"
                  @click="confirmWaitlistSpot"
                  :disabled="waitlistBusy"
                  class="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-green-700 transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {{ waitlistBusy ? tr("eventRegisterPage.pleaseWait", "Bitte warten...") : tr("eventRegisterPage.confirmSpotNow", "Platz jetzt bestätigen") }}
                </button>
                <button
                  v-if="waitlistStatus === 'waiting' || waitlistStatus === 'pending_claim'"
                  type="button"
                  @click="dropWaitlist"
                  :disabled="waitlistBusy"
                  class="w-full py-3 px-6 bg-zinc-700 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50"
                >
                  {{ waitlistBusy ? tr("eventRegisterPage.pleaseWait", "Bitte warten...") : tr("eventRegisterPage.dropWaitlist", "Von Warteliste entfernen") }}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDateInTimeZone, getUserTimeZone } from "~/utils/eventDateTime";

import { ref, computed, onMounted } from "vue";

interface CustomEvent {
  id: string | number;
  name: string;
  eventDate: string;
  venue: string;
  maxParticipants: number;
  participationFee: number;
  requiresDecklist: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface RegistrationForm {
  bookerPlayerId: string;
  bookerName: string;
  bookerEmail: string;
  tickets: Array<{
    name: string;
    playerId?: string;
    isAnonymous: boolean;
  }>;
  allAnonymous: boolean;
}

interface ExistingRegistrationState {
  bookingId: string;
  activeTicketCount: number;
  ticketNames: string[];
  canAddTickets: boolean;
  remainingSpots: number;
  maxParticipants: number;
}

const route = useRoute();
const eventId = route.params.id as string;

// State
const event = ref<CustomEvent | null>(null);
const registrationCount = ref<number>(0);
const activeClaimCount = ref<number>(0);
const loading = ref<boolean>(true);
const error = ref<string>("");
const submitting = ref<boolean>(false);
const registrationSuccess = ref<boolean>(false);
const formError = ref<string>("");
const playerIntegrityError = ref<string>("");
const waitlistBusy = ref<boolean>(false);
const waitlistMessage = ref<string>("");
const waitlistStatus = ref<
  "none" | "waiting" | "pending_claim" | "confirmed" | "expired"
>("none");
const existingRegistration = ref<ExistingRegistrationState | null>(null);

const form = reactive<RegistrationForm>({
  bookerPlayerId: "",
  bookerName: "",
  bookerEmail: "",
  tickets: [
    {
      name: "",
      playerId: "",
      isAnonymous: false,
    },
  ],
  allAnonymous: false,
});

// Supabase user data
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const { t, locale } = useI18n({ useScope: "global" });
const userLoading = ref<boolean>(true);
const userTimeZone = getUserTimeZone();

const tr = (key: string, fallback: string, params?: Record<string, unknown>) => {
  const translated = t(key, params as any);
  return translated === key ? fallback : translated;
};

// Computed properties
const registrationFull = computed(() => {
  if (!event.value) return false;
  return (
    registrationCount.value + activeClaimCount.value >= event.value.maxParticipants
  );
});

const effectiveParticipantsCount = computed(() => {
  return registrationCount.value + activeClaimCount.value;
});

const eventPassed = computed(() => {
  if (!event.value) return false;
  const eventDate = new Date(event.value.eventDate);
  const now = new Date();
  return eventDate < now;
});

const canSubmitRegistration = computed(() => {
  return !registrationFull.value && !playerIntegrityError.value;
});

const canJoinWaitlist = computed(() => {
  const canJoinStatus =
    waitlistStatus.value === "none" || waitlistStatus.value === "expired";
  return (
    canJoinStatus &&
    !waitlistBusy.value &&
    !playerIntegrityError.value &&
    !!form.tickets[0].playerId &&
    !!form.tickets[0].name &&
    !!form.bookerEmail
  );
});

const fetchWaitlistStatus = async (): Promise<void> => {
  if (!eventId) return;

  try {
    const response = await $fetch<{
      status: "none" | "waiting" | "pending_claim" | "confirmed" | "expired";
      claimExpiresAt?: string | null;
    }>(`/api/events/${eventId}/waitlist-status`);

    waitlistStatus.value = response.status;

    if (response.status === "pending_claim" && response.claimExpiresAt) {
      waitlistMessage.value = `Du hast ein Platzangebot bis ${new Date(response.claimExpiresAt).toLocaleString()}.`;
    } else if (response.status === "waiting") {
      waitlistMessage.value = t("eventRegisterPage.waitlistAlreadyOnList");
    } else if (response.status === "expired") {
      waitlistMessage.value = t("eventRegisterPage.waitlistClaimExpired");
    } else {
      waitlistMessage.value = "";
    }
  } catch {
    waitlistStatus.value = "none";
    waitlistMessage.value = "";
  }
};

const fetchExistingRegistration = async (): Promise<void> => {
  try {
    const response = await $fetch<{
      hasRegistration: boolean;
      registration?: ExistingRegistrationState;
    }>(`/api/events/${eventId}/my-registration`);

    existingRegistration.value = response.hasRegistration
      ? response.registration || null
      : null;
  } catch {
    existingRegistration.value = null;
  }
};

const joinWaitlist = async (): Promise<void> => {
  if (form.tickets[0].playerId) form.bookerPlayerId = form.tickets[0].playerId;
  if (form.tickets[0].name) form.bookerName = form.tickets[0].name;

  if (!form.bookerPlayerId || !form.bookerName || !form.bookerEmail) {
    waitlistMessage.value = tr(
      "eventRegisterPage.completeAllRequiredFields",
      "Bitte fülle Spieler-ID, Name und E-Mail aus.",
    );
    return;
  }

  waitlistBusy.value = true;
  waitlistMessage.value = "";

  try {
    const response = await $fetch<{
      alreadyJoined?: boolean;
      status: "waiting" | "pending_claim";
      claimExpiresAt?: string | null;
    }>(`/api/events/${eventId}/waitlist`, {
      method: "POST",
    });

    waitlistStatus.value = response.status;
    if (response.status === "waiting") {
      waitlistMessage.value = response.alreadyJoined
        ? t("eventRegisterPage.waitlistAlreadyOnList")
        : t("eventRegisterPage.waitlistJoined");
    } else if (response.claimExpiresAt) {
      waitlistMessage.value = `Du hast ein Platzangebot bis ${new Date(response.claimExpiresAt).toLocaleString()}.`;
    }
  } catch (err: any) {
    waitlistMessage.value =
      err?.data?.statusMessage || t("eventRegisterPage.waitlistUpdateFailed");
  } finally {
    waitlistBusy.value = false;
  }
};

const confirmWaitlistSpot = async (): Promise<void> => {
  waitlistBusy.value = true;
  waitlistMessage.value = "";

  try {
    await $fetch(`/api/events/${eventId}/waitlist/confirm`, {
      method: "POST",
    });
    waitlistStatus.value = "confirmed";
    waitlistMessage.value = t("eventRegisterPage.waitlistConfirmed");
    registrationSuccess.value = true;
    await fetchEventDetails();
  } catch (err: any) {
    waitlistMessage.value =
      err?.data?.statusMessage || t("eventRegisterPage.waitlistConfirmFailed");
  } finally {
    waitlistBusy.value = false;
    await fetchWaitlistStatus();
  }
};

const dropWaitlist = async (): Promise<void> => {
  waitlistBusy.value = true;
  waitlistMessage.value = "";

  try {
    await $fetch(`/api/events/${eventId}/waitlist/drop`, {
      method: "POST",
    });
    waitlistStatus.value = "none";
    waitlistMessage.value = t("eventRegisterPage.waitlistDropped");
  } catch (err: any) {
    waitlistMessage.value =
      err?.data?.statusMessage || t("eventRegisterPage.waitlistDropFailed");
  } finally {
    waitlistBusy.value = false;
    await fetchWaitlistStatus();
  }
};

// Methods
const formatEventDate = (dateString: string): string => {
  return formatDateInTimeZone(
    dateString,
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
    locale.value,
    userTimeZone,
  );
};

const loadUserData = async (): Promise<void> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    if (user) {
      // Fetch player data from database
      try {
        const playerResponse = await $fetch<{
          playerId: string;
          name: string;
          email: string;
        }>("/api/players/me");

        if (playerResponse) {
          if (playerResponse.playerId) {
            form.bookerPlayerId = playerResponse.playerId;
            form.tickets[0].playerId = playerResponse.playerId;
          }
          if (playerResponse.name) {
            form.bookerName = playerResponse.name;
            form.tickets[0].name = playerResponse.name;
          }
          if (playerResponse.email) {
            form.bookerEmail = playerResponse.email;
          }

          if (!form.bookerEmail && user.email) {
            form.bookerEmail = user.email;
          }
        }
      } catch (playerErr: unknown) {
        const playerError = playerErr as {
          statusCode?: number;
          data?: { message?: string };
          message?: string;
        };

        if (playerError.statusCode === 404) {
          playerIntegrityError.value =
            t("eventRegisterPage.playerProfileMissing");
        } else {
          playerIntegrityError.value =
            playerError.data?.message ||
            playerError.message ||
            t("eventRegisterPage.playerProfileLoadFailed");
        }
      }
    }
  } catch (err) {
    console.error("Failed to load user data:", err);
    playerIntegrityError.value =
      t("eventRegisterPage.sessionPrepareFailed");
  } finally {
    userLoading.value = false;
  }
};

const fetchEventDetails = async (): Promise<void> => {
  try {
    loading.value = true;
    error.value = "";

    const response = await $fetch<{
      event: CustomEvent;
      registrationCount: number;
      activeClaimCount?: number;
    }>(`/api/events/${eventId}`);

    if (response.event) {
      event.value = response.event;
      registrationCount.value = response.registrationCount || 0;
      activeClaimCount.value = response.activeClaimCount || 0;
    } else {
      error.value = t("eventRegisterPage.notFoundTitle");
    }
  } catch (err: unknown) {
    console.error("Failed to fetch event:", err);
    const errorMessage =
      err instanceof Error ? err.message : t("eventRegisterPage.loading");
    error.value = errorMessage;
  } finally {
    loading.value = false;
  }
};

const validatePlayerId = (event: Event, ticketIndex: number): void => {
  const target = event.target as HTMLInputElement;
  const value = target.value;

  // Remove any non-numeric characters
  const numericOnly = value.replace(/\D/g, "");

  // Update the form with the cleaned value
  if (ticketIndex === 0) {
    form.tickets[0].playerId = numericOnly;
    form.bookerPlayerId = numericOnly;
  } else {
    form.tickets[ticketIndex].playerId = numericOnly;
  }

  // Update the input value directly to reflect the change
  target.value = numericOnly;
};

const submitRegistration = async (): Promise<void> => {
  try {
    submitting.value = true;
    formError.value = "";

    if (existingRegistration.value) {
      formError.value = t("eventRegisterPage.alreadyRegisteredFormBlocked");
      return;
    }

    if (playerIntegrityError.value) {
      formError.value = playerIntegrityError.value;
      return;
    }

    // Ensure bookerName and bookerPlayerId are in sync with the first ticket's values,
    // since the form binds the visible inputs to tickets[0] but the API requires these top-level fields.
    if (form.tickets[0].name) form.bookerName = form.tickets[0].name;
    if (form.tickets[0].playerId)
      form.bookerPlayerId = form.tickets[0].playerId;

    const response = await $fetch(`/api/events/${eventId}/register`, {
      method: "POST",
      body: form,
    });

    registrationSuccess.value = true;
    registrationCount.value += 1;

    // Redirect to dashboard after successful registration
    setTimeout(() => {
      navigateTo("/dashboard");
    }, 2000);
  } catch (err: unknown) {
    console.error("Registration failed:", err);
    const errorObj = err as { data?: { message?: string }; message?: string };
    const message =
      errorObj.data?.message ||
      errorObj.message ||
      t("registerForm.errorRegistrationFailed");

    if (message.toLowerCase().includes("not enough spots")) {
      await Promise.all([
        fetchEventDetails(),
        fetchWaitlistStatus(),
        fetchExistingRegistration(),
      ]);
      formError.value =
        t("eventRegisterPage.noDirectSpotUseWaitlist");
    } else if (message.toLowerCase().includes("already registered")) {
      await fetchExistingRegistration();
      formError.value = t("eventRegisterPage.alreadyRegisteredFormBlocked");
    } else {
      formError.value = message;
    }
  } finally {
    submitting.value = false;
  }
};

// Lifecycle
onMounted(async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));

  if (!user.value) {
    const returnUrl = encodeURIComponent(`/events/register/${eventId}`);
    await navigateTo(`/login?redirect=${returnUrl}`);
    return;
  }

  await Promise.all([
    loadUserData(),
    fetchEventDetails(),
    fetchWaitlistStatus(),
    fetchExistingRegistration(),
  ]);

  if (route.query.waitlistConfirm === "1") {
    await confirmWaitlistSpot();
  }
});

// SEO
useHead({
  title: computed(() =>
    event.value ? `Registrieren - ${event.value.name}` : "Event-Registrierung",
  ),
  meta: [
    {
      name: "description",
      content: computed(() =>
        event.value
          ? `Registriere dich fuer ${event.value.name} bei ${event.value.venue}`
          : "Event-Registrierung",
      ),
    },
  ],
});
</script>
