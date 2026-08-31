<template>
  <div class="min-h-screen app-bg-page py-6 sm:py-10">
    <div class="max-w-3xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="app-panel flex items-center gap-3 rounded-2xl p-6"
      >
        <div
          class="w-5 h-5 border-2 app-border border-t-[var(--app-accent)] rounded-full animate-spin"
        ></div>
        <span class="app-text-secondary-soft">{{ t("eventDetailPage.loading") }}</span>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="app-feedback-danger rounded-2xl p-6"
      >
        <p>{{ t("eventDetailPage.errorLoading") }}: {{ error }}</p>
      </div>

      <!-- Event Details -->
      <div v-else-if="event" class="space-y-5">
        <!-- Event Header: title, status and all key facts in one place -->
        <div class="app-hero-surface rounded-3xl px-6 py-6 sm:px-8 sm:py-7 lg:px-10 lg:py-9">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold app-text-primary break-words">
              {{ event.name }}
            </h1>
            <span :class="getStatusColor(event.status)" class="shrink-0">
              {{ event.status.charAt(0).toUpperCase() + event.status.slice(1) }}
            </span>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm lg:text-base app-text-secondary-soft">
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4 lg:w-5 lg:h-5 app-icon-accent shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clip-rule="evenodd"
                ></path>
              </svg>
              {{ formatEventDate(event.eventDate) }}
            </span>
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4 lg:w-5 lg:h-5 app-icon-accent shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clip-rule="evenodd"
                ></path>
              </svg>
              {{ event.venue }}
            </span>
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4 lg:w-5 lg:h-5 app-icon-accent shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"
                ></path>
              </svg>
              {{ t("eventDetailPage.registeredCount", { count: registrationCount, max: event.maxParticipants }) }}
            </span>
            <span v-if="event.participationFee" class="flex items-center gap-1.5">
              <svg class="w-4 h-4 lg:w-5 lg:h-5 app-icon-accent shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path>
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.766 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.766-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                  clip-rule="evenodd"
                ></path>
              </svg>
              {{ event.participationFee }}
            </span>
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4 lg:w-5 lg:h-5 app-icon-accent shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1.447.894L10 15.118l-4.553 1.776A1 1 0 014 16V4zm2-1a1 1 0 00-1 1v10.586l3.553-1.387a1 1 0 01.894 0L13 14.586V4a1 1 0 00-1-1H6z"
                  clip-rule="evenodd"
                ></path>
              </svg>
              {{ t("events.decklistRequired") }}: {{ event.requiresDecklist ? t("common.yes") : t("common.no") }}
            </span>
            <span v-if="event.registrationDeadline" class="flex items-center gap-1.5">
              <svg class="w-4 h-4 lg:w-5 lg:h-5 app-icon-accent shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clip-rule="evenodd"
                ></path>
              </svg>
              {{ t("events.registrationDeadline") }}: {{ formatEventDate(event.registrationDeadline) }}
            </span>
          </div>

          <p
            v-if="event.description"
            class="app-body-text whitespace-pre-wrap break-words mt-4"
          >
            {{ event.description }}
          </p>

          <div v-if="isAdmin" class="mt-4">
            <button
              type="button"
              @click="showEditTournamentModal = true"
              class="app-action-button app-action-primary inline-flex rounded-xl px-4 py-2 lg:px-5 lg:py-2.5 text-sm lg:text-base"
            >
              {{ t("eventWorkspace.editTournament") }}
            </button>
          </div>
        </div>

        <!-- Registration Section -->
        <div class="app-panel rounded-2xl p-5 sm:p-6 lg:p-8">
          <div v-if="user" class="space-y-4">
            <h2 class="app-heading-2">
              {{ t("registration.title") }}
            </h2>

            <!-- Booking loading -->
            <div
              v-if="bookingLoading"
              class="flex items-center gap-2 app-text-secondary-soft text-sm"
            >
              <div
                class="w-4 h-4 border-2 app-border border-t-[var(--app-accent)] rounded-full animate-spin"
              ></div>
              <span>{{ t("bookingPage.loading") }}</span>
            </div>

            <!-- Registered: manage booking inline (single canonical workspace, no /booking link-out) -->
            <div v-else-if="booking">
              <p class="text-sm lg:text-base app-text-secondary-soft mb-1">
                {{ t("eventDetailPage.registeredForEvent") }} · {{ t("bookingPage.activeTickets", { count: booking.statistics.activeTickets }) }}
              </p>

              <!-- Tickets -->
              <div class="divide-y app-border">
                <div
                  v-for="ticket in activeBookingTickets"
                  :key="ticket.id"
                  class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3"
                >
                  <div class="flex flex-wrap items-center gap-2 min-w-0">
                    <span class="app-heading-3 truncate">{{ ticket.participantName }}</span>
                    <span
                      v-if="ticket.participantPlayerId"
                      class="app-meta-text"
                      >#{{ ticket.participantPlayerId }}</span
                    >
                    <span
                      v-if="event.requiresDecklist && ticket.decklist"
                      class="app-badge app-status-completed"
                      >{{ t("eventDetailPage.decklistSubmitted") }}</span
                    >
                    <span
                      v-else-if="event.requiresDecklist && ticket.bringingDecklistOnsite"
                      class="app-badge app-status-upcoming"
                      >{{ t("eventDetailPage.bringingOnSite") }}</span
                    >
                    <span
                      v-else-if="event.requiresDecklist"
                      class="app-badge app-status-ongoing"
                      >{{ t("eventDetailPage.pending") }}</span
                    >
                  </div>

                  <div
                    v-if="booking.permissions.canModify || booking.permissions.canEditDecklist"
                    class="flex gap-2 flex-wrap shrink-0"
                  >
                    <button
                      v-if="event.requiresDecklist && booking.permissions.canEditDecklist"
                      @click="editTicketDecklist(ticket)"
                      class="app-btn-neutral app-btn-md"
                    >
                      <DocumentTextIcon class="w-4 h-4" />
                      {{ t("decklist.editDecklist") }}
                    </button>
                    <button
                      v-if="booking.permissions.canModify"
                      @click="editTicket(ticket)"
                      class="app-btn-neutral app-btn-md"
                    >
                      <PencilSquareIcon class="w-4 h-4" />
                      {{ t("common.edit") }}
                    </button>
                    <button
                      v-if="booking.permissions.canModify"
                      @click="confirmCancelTicket(ticket)"
                      class="app-btn-danger app-btn-md"
                    >
                      <XCircleIcon class="w-4 h-4" />
                      {{ t("common.cancel") }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="mt-3 flex flex-wrap items-center justify-between gap-3 border-t app-border pt-3">
                <button
                  v-if="booking.permissions.canAddTickets"
                  @click="showAddTicketModal = true"
                  class="app-btn-neutral app-btn-md"
                >
                  <PlusIcon class="w-4 h-4 lg:w-5 lg:h-5" />
                  {{ t("bookingPage.addTicket") }}
                </button>
                <button
                  v-if="booking.permissions.canModify"
                  @click="showCancelBookingModal = true"
                  class="app-btn-danger app-btn-md"
                >
                  <TrashIcon class="w-4 h-4 lg:w-5 lg:h-5" />
                  {{ t("eventWorkspace.cancelEntireBooking") }}
                </button>
              </div>

              <p v-if="!booking.permissions.canModify" class="mt-3 app-meta-text">
                {{ t("eventWorkspace.deadlinePassed") }}
              </p>
            </div>

            <!-- Waitlist status (not registered, but on the waitlist for this event) -->
            <div
              v-else-if="waitlistStatus && (waitlistStatus.status === 'waiting' || waitlistStatus.status === 'pending_claim')"
              class="rounded-2xl p-4 space-y-3"
              :class="waitlistStatus.status === 'pending_claim' ? 'app-feedback-success' : 'app-feedback-info'"
            >
              <div v-if="waitlistStatus.status === 'pending_claim'">
                <p class="font-semibold">{{ t("waitlist.spotAvailable") }}</p>
                <p v-if="waitlistStatus.claimExpiresAt" class="text-sm mt-1">
                  {{ t("waitlist.reservedUntil", { time: formatEventDate(waitlistStatus.claimExpiresAt) }) }}
                </p>
                <div class="flex gap-3 mt-3">
                  <button
                    @click="confirmWaitlistSpot"
                    :disabled="waitlistActionPending"
                    class="app-action-button app-action-success app-btn-md"
                  >
                    <CheckCircleIcon class="w-4 h-4" />
                    {{ waitlistActionPending ? t("eventRegisterPage.pleaseWait") : t("waitlist.confirmSpot") }}
                  </button>
                  <button
                    @click="dropFromWaitlist"
                    :disabled="waitlistActionPending"
                    class="app-action-button app-action-danger app-btn-md"
                  >
                    <XCircleIcon class="w-4 h-4" />
                    {{ waitlistActionPending ? t("eventRegisterPage.pleaseWait") : t("waitlist.leaveWaitlist") }}
                  </button>
                </div>
              </div>
              <div v-else>
                <p class="font-semibold">{{ t("waitlist.onWaitlist") }}</p>
                <button
                  @click="dropFromWaitlist"
                  :disabled="waitlistActionPending"
                  class="app-action-button app-action-danger app-btn-md mt-3"
                >
                  <XCircleIcon class="w-4 h-4" />
                  {{ waitlistActionPending ? t("eventRegisterPage.pleaseWait") : t("waitlist.removeFromWaitlist") }}
                </button>
              </div>
              <p v-if="waitlistActionError" class="app-meta-text">{{ waitlistActionError }}</p>
            </div>

            <!-- Register Button -->
            <div v-else class="flex justify-center">
              <NuxtLink
                :to="`/events/register/${event.id}`"
                class="app-action-button app-action-primary rounded-xl px-6 py-3 lg:px-8 lg:py-3.5 text-base lg:text-lg"
                :class="{
                  'opacity-50 cursor-not-allowed':
                    registrationCount >= event.maxParticipants,
                }"
              >
                <TicketIcon class="w-5 h-5" />
                <span v-if="registrationCount >= event.maxParticipants"
                  >{{ t("registration.eventFull") }}</span
                >
                <span v-else>{{ t("events.registerForEvent") }}</span>
              </NuxtLink>
            </div>
          </div>

          <!-- Login Required -->
          <div v-else class="text-center py-4">
            <p class="app-text-secondary-soft mb-4">
              {{ t("eventDetailPage.loginRequired") }}
            </p>
            <NuxtLink
              to="/login"
              class="app-action-button app-action-primary inline-flex rounded-xl px-6 py-3 text-base"
            >
              {{ t("auth.signIn") }}
            </NuxtLink>
          </div>
        </div>

        <!-- Participants List -->
        <EventParticipants
          :event-id="event.id"
          :show-decklist-status="event.requiresDecklist"
        />
      </div>
    </div>

    <!-- Edit Tournament Modal (admin) -->
    <EventEditModal
      v-if="showEditTournamentModal && event"
      :event-id="event.id"
      @close="showEditTournamentModal = false"
      @saved="onTournamentEdited"
    />

    <!-- Add Ticket Modal -->
    <div
      v-if="showAddTicketModal"
      class="fixed inset-0 app-overlay flex items-center justify-center p-4 z-50"
      @click.self="showAddTicketModal = false"
    >
      <div class="app-modal-surface rounded-2xl p-6 max-w-md w-full">
        <h3 class="app-heading-2 mb-4">{{ t("eventWorkspace.addTicketModalTitle") }}</h3>
        <form @submit.prevent="submitAddTicket" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
              {{ t("eventWorkspace.participantName") }} *
            </label>
            <input
              v-model="newTicket.participantName"
              type="text"
              required
              class="app-input px-4 py-3"
              :placeholder="t('eventWorkspace.participantNamePlaceholder')"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
              {{ t("eventWorkspace.playerIdOptional") }}
            </label>
            <input
              v-model="newTicket.participantPlayerId"
              type="text"
              inputmode="numeric"
              pattern="\d*"
              class="app-input px-4 py-3"
              :placeholder="t('eventWorkspace.playerIdPlaceholder')"
              @input="validateTicketPlayerId($event, 'new')"
            />
          </div>
          <div>
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="newTicket.isAnonymous"
                class="mt-0.5 w-4 h-4 rounded"
              />
              <div>
                <span class="text-sm font-medium app-text-strong"
                  >{{ t("eventWorkspace.anonymousParticipation") }}</span
                >
                <p class="app-meta-text mt-0.5">
                  {{ t("eventWorkspace.anonymousHint") }}
                </p>
              </div>
            </label>
          </div>
          <div
            v-if="addTicketError"
            class="app-feedback-danger rounded-lg p-3 text-sm"
          >
            {{ addTicketError }}
          </div>
          <div class="flex gap-3">
            <button
              type="button"
              @click="showAddTicketModal = false"
              class="app-btn-neutral app-btn-md flex-1"
            >
              {{ t("common.cancel") }}
            </button>
            <button
              type="submit"
              :disabled="addingTicket"
              class="app-btn-success app-btn-md flex-1 disabled:opacity-50"
            >
              {{ addingTicket ? t("eventWorkspace.adding") : t("bookingPage.addTicket") }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Ticket Modal -->
    <div
      v-if="showEditTicketModal && editingTicket"
      class="fixed inset-0 app-overlay flex items-center justify-center p-4 z-50"
      @click.self="showEditTicketModal = false"
    >
      <div class="app-modal-surface rounded-2xl p-6 max-w-md w-full">
        <h3 class="app-heading-2 mb-4">{{ t("eventWorkspace.editTicketModalTitle") }}</h3>
        <form @submit.prevent="submitEditTicket" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
              {{ t("eventWorkspace.participantName") }} *
            </label>
            <input
              v-model="editingTicket.participantName"
              type="text"
              required
              class="app-input px-4 py-3"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
              {{ t("eventWorkspace.playerIdOptional") }}
            </label>
            <input
              v-model="editingTicket.participantPlayerId"
              type="text"
              inputmode="numeric"
              pattern="\d*"
              class="app-input px-4 py-3"
              :placeholder="t('eventWorkspace.playerIdPlaceholder')"
              @input="validateTicketPlayerId($event, 'edit')"
            />
          </div>
          <div>
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="editingTicket.isAnonymous"
                class="mt-0.5 w-4 h-4 rounded"
              />
              <span class="text-sm font-medium app-text-strong"
                >{{ t("eventWorkspace.anonymousParticipation") }}</span
              >
            </label>
          </div>
          <div
            v-if="editTicketError"
            class="app-feedback-danger rounded-lg p-3 text-sm"
          >
            {{ editTicketError }}
          </div>
          <div class="flex gap-3">
            <button
              type="button"
              @click="showEditTicketModal = false"
              class="app-btn-neutral app-btn-md flex-1"
            >
              {{ t("common.cancel") }}
            </button>
            <button
              type="submit"
              :disabled="updatingTicket"
              class="app-btn-success app-btn-md flex-1 disabled:opacity-50"
            >
              {{ updatingTicket ? t("eventWorkspace.savingChanges") : t("eventWorkspace.saveChanges") }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Cancel Ticket Modal -->
    <div
      v-if="showCancelTicketModal && ticketToCancel"
      class="fixed inset-0 app-overlay flex items-center justify-center p-4 z-50"
      @click.self="showCancelTicketModal = false"
    >
      <div class="app-modal-surface rounded-2xl p-6 max-w-md w-full" @click.stop>
        <h3 class="app-heading-2 mb-4">{{ t("eventWorkspace.cancelTicketTitle") }}</h3>
        <p class="app-body-text mb-6">
          {{ t("eventWorkspace.cancelTicketConfirm", { name: ticketToCancel.participantName }) }}
        </p>
        <div class="flex gap-3">
          <button
            type="button"
            @click="showCancelTicketModal = false"
            :disabled="cancellingTicket"
            class="app-btn-neutral app-btn-md flex-1 disabled:opacity-50"
          >
            {{ t("eventWorkspace.keepTicket") }}
          </button>
          <button
            @click="cancelTicket"
            :disabled="cancellingTicket"
            class="app-btn-danger app-btn-md flex-1 disabled:opacity-50"
          >
            {{ cancellingTicket ? t("eventWorkspace.cancellingTicket") : t("eventWorkspace.confirmCancelTicket") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Cancel Booking Modal -->
    <div
      v-if="showCancelBookingModal && booking"
      class="fixed inset-0 app-overlay flex items-center justify-center p-4 z-50"
      @click.self="showCancelBookingModal = false"
    >
      <div class="app-modal-surface rounded-2xl p-6 max-w-md w-full" @click.stop>
        <h3 class="app-heading-2 mb-4">
          {{ t("eventWorkspace.cancelBookingTitle") }}
        </h3>
        <p class="app-body-text mb-4">
          {{ t("eventWorkspace.cancelBookingConfirm", { count: booking.statistics.activeTickets }) }}
        </p>
        <p class="app-meta-text mb-6">
          {{ t("eventWorkspace.cancelBookingWarning") }}
        </p>
        <div class="flex gap-3">
          <button
            type="button"
            @click="showCancelBookingModal = false"
            :disabled="cancellingBooking"
            class="app-btn-neutral app-btn-md flex-1 disabled:opacity-50"
          >
            {{ t("eventWorkspace.keepBooking") }}
          </button>
          <button
            @click="cancelBooking"
            :disabled="cancellingBooking"
            class="app-btn-danger app-btn-md flex-1 disabled:opacity-50"
          >
            {{ cancellingBooking ? t("eventWorkspace.cancellingBooking") : t("eventWorkspace.confirmCancelBooking") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Ticket Decklist Modal -->
    <div
      v-if="showDecklistModal && editingTicketForDecklist"
      class="fixed inset-0 app-overlay flex items-center justify-center p-4 z-50"
      @click.self="showDecklistModal = false"
    >
      <div
        class="app-modal-surface rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <h3 class="app-heading-2 mb-2">
          {{ t("eventWorkspace.decklistForParticipant", { name: editingTicketForDecklist.participantName }) }}
        </h3>
        <p class="app-meta-text mb-6">
          {{ t("eventWorkspace.decklistSubmitHint") }}
        </p>

        <div class="space-y-4">
          <!-- Bringing Onsite Checkbox -->
          <div class="flex items-center gap-3 p-3 rounded-lg border app-border app-surface-1">
            <input
              v-model="decklistForm.bringingOnsite"
              type="checkbox"
              id="ticketBringingOnsite"
              class="w-4 h-4 rounded"
            />
            <label
              for="ticketBringingOnsite"
              class="text-sm font-medium app-text-secondary-soft"
            >
              {{ t("decklist.bringOnsiteOption") }}
            </label>
          </div>

          <!-- Decklist Textarea (hidden if bringing onsite) -->
          <div v-if="!decklistForm.bringingOnsite">
            <label class="block text-sm font-medium app-text-secondary-soft mb-2">
              {{ t("decklist.title") }}
            </label>
            <textarea
              v-model="decklistForm.decklist"
              rows="12"
              class="app-input px-3 py-2 font-mono text-sm"
              :placeholder="t('decklist.enterDecklist')"
            ></textarea>
            <p class="app-meta-text mt-1">
              {{ t("eventDetailPage.decklistFormatsHint") }}
            </p>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            type="button"
            @click="showDecklistModal = false"
            :disabled="savingDecklist"
            class="app-btn-neutral app-btn-md flex-1 disabled:opacity-50"
          >
            {{ t("common.cancel") }}
          </button>
          <button
            @click="saveDecklistForTicket"
            :disabled="
              savingDecklist ||
              (!decklistForm.bringingOnsite && !decklistForm.decklist)
            "
            class="app-btn-primary app-btn-md flex-1 disabled:opacity-50"
          >
            {{ savingDecklist ? t("decklist.saving") : t("decklist.saveDecklist") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import {
  formatDateInTimeZone,
  getUserTimeZone,
} from "~/utils/eventDateTime";
import {
  PencilSquareIcon,
  XCircleIcon,
  PlusIcon,
  DocumentTextIcon,
  TrashIcon,
  TicketIcon,
  CheckCircleIcon,
} from "@heroicons/vue/24/outline";

interface CustomEvent {
  id: string;
  name: string;
  venue: string;
  eventDate: string;
  maxParticipants: number;
  participationFee?: string | null;
  description?: string | null;
  registrationDeadline?: string | null;
  requiresDecklist: boolean;
  status: string;
}

interface EventResponse {
  event: CustomEvent;
  registrationCount: number;
}

interface BookingTicket {
  id: string;
  participantName: string;
  participantPlayerId: string | null;
  status: string;
  isAnonymous: boolean;
  decklist: string | null;
  bringingDecklistOnsite: boolean;
  placement: number | null;
  points: number | null;
}

interface Booking {
  id: string;
  tickets: BookingTicket[];
  statistics: {
    totalTickets: number;
    activeTickets: number;
    cancelledTickets: number;
  };
  permissions: {
    canModify: boolean;
    canAddTickets: boolean;
    canCancelTickets: boolean;
    canEditDecklist: boolean;
  };
}

interface WaitlistStatus {
  status: "none" | "waiting" | "pending_claim" | "confirmed" | "expired" | string;
  claimExpiresAt?: string | null;
}

const { id } = useRoute().params;
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const { t, locale } = useI18n();
const { checkAdminStatus } = useAdmin();

const event = ref<CustomEvent | null>(null);
const registrationCount = ref(0);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isAdmin = ref(false);
const showEditTournamentModal = ref(false);
const userTimeZone = getUserTimeZone();

// Canonical event workspace: this page owns all booking + waitlist mutation logic for the event
const booking = ref<Booking | null>(null);
const bookingLoading = ref(false);
const waitlistStatus = ref<WaitlistStatus | null>(null);

const activeBookingTickets = computed(() => {
  if (!booking.value) return [];
  return booking.value.tickets.filter((ticket) => ticket.status !== "cancelled");
});

const showAddTicketModal = ref(false);
const addingTicket = ref(false);
const addTicketError = ref("");
const newTicket = reactive({
  participantName: "",
  participantPlayerId: "",
  isAnonymous: false,
});

const showEditTicketModal = ref(false);
const updatingTicket = ref(false);
const editTicketError = ref("");
const editingTicket = ref<BookingTicket | null>(null);

const showCancelTicketModal = ref(false);
const cancellingTicket = ref(false);
const ticketToCancel = ref<BookingTicket | null>(null);

const showCancelBookingModal = ref(false);
const cancellingBooking = ref(false);

const showDecklistModal = ref(false);
const savingDecklist = ref(false);
const editingTicketForDecklist = ref<BookingTicket | null>(null);
const decklistForm = reactive({
  decklist: "",
  bringingOnsite: false,
});

const waitlistActionPending = ref(false);
const waitlistActionError = ref("");

function formatEventDate(dateString: string): string {
  return formatDateInTimeZone(dateString, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }, locale.value, userTimeZone);
}

function getStatusColor(status: string): string {
  const base = "app-badge";
  switch (status.toLowerCase()) {
    case "upcoming":
      return `${base} app-status-upcoming`;
    case "ongoing":
      return `${base} app-status-ongoing`;
    case "completed":
      return `${base} app-status-completed`;
    case "cancelled":
      return `${base} app-status-cancelled`;
    default:
      return `${base} app-status-neutral`;
  }
}

async function fetchEventDetails(): Promise<void> {
  if (!id || Array.isArray(id)) return;

  try {
    isLoading.value = true;
    error.value = null;

    const response = await $fetch<EventResponse>(`/api/events/${id}`);
    event.value = response.event;
    registrationCount.value = response.registrationCount;
  } catch (err: unknown) {
    console.error("Failed to fetch event details:", err);
    error.value =
      err instanceof Error ? err.message : t("eventDetailPage.errorLoading");
  } finally {
    isLoading.value = false;
  }
}

async function onTournamentEdited(): Promise<void> {
  showEditTournamentModal.value = false;
  await fetchEventDetails();
}

async function fetchBooking(): Promise<void> {
  if (!id || Array.isArray(id) || !user.value) {
    booking.value = null;
    return;
  }

  try {
    bookingLoading.value = true;

    const myRegistration = await $fetch<{
      hasRegistration: boolean;
      registration?: { bookingId: string };
    }>(`/api/events/${id}/my-registration`);

    if (!myRegistration.hasRegistration || !myRegistration.registration) {
      booking.value = null;
      return;
    }

    const response = await $fetch<{ success: boolean; booking: Booking }>(
      `/api/bookings/${myRegistration.registration.bookingId}`,
    );
    booking.value = response.booking;
  } catch (err: unknown) {
    console.error("Failed to fetch booking:", err);
    booking.value = null;
  } finally {
    bookingLoading.value = false;
  }
}

async function fetchWaitlistStatus(): Promise<void> {
  if (!id || Array.isArray(id) || !user.value) {
    waitlistStatus.value = null;
    return;
  }

  try {
    waitlistStatus.value = await $fetch<WaitlistStatus>(
      `/api/events/${id}/waitlist-status`,
    );
  } catch (err: unknown) {
    console.error("Failed to fetch waitlist status:", err);
    waitlistStatus.value = null;
  }
}

function validateTicketPlayerId(event: Event, context: "new" | "edit"): void {
  const target = event.target as HTMLInputElement;
  const numericOnly = target.value.replace(/\D/g, "");

  if (context === "new") {
    newTicket.participantPlayerId = numericOnly;
  } else if (context === "edit" && editingTicket.value) {
    editingTicket.value.participantPlayerId = numericOnly;
  }

  target.value = numericOnly;
}

async function submitAddTicket(): Promise<void> {
  if (!booking.value) return;

  try {
    addingTicket.value = true;
    addTicketError.value = "";

    await $fetch(`/api/bookings/${booking.value.id}/tickets/add`, {
      method: "POST",
      body: {
        participantName: newTicket.participantName,
        participantPlayerId: newTicket.participantPlayerId || null,
        isAnonymous: newTicket.isAnonymous,
      },
    });

    newTicket.participantName = "";
    newTicket.participantPlayerId = "";
    newTicket.isAnonymous = false;
    showAddTicketModal.value = false;

    await Promise.all([fetchBooking(), fetchEventDetails()]);
  } catch (err: any) {
    console.error("Failed to add ticket:", err);
    addTicketError.value = err.data?.message || "Failed to add ticket";
  } finally {
    addingTicket.value = false;
  }
}

function editTicket(ticket: BookingTicket): void {
  editingTicket.value = { ...ticket };
  showEditTicketModal.value = true;
  editTicketError.value = "";
}

async function submitEditTicket(): Promise<void> {
  if (!booking.value || !editingTicket.value) return;

  try {
    updatingTicket.value = true;
    editTicketError.value = "";

    await $fetch(
      `/api/bookings/${booking.value.id}/tickets/${editingTicket.value.id}`,
      {
        method: "PATCH",
        body: {
          participantName: editingTicket.value.participantName,
          participantPlayerId: editingTicket.value.participantPlayerId || null,
          isAnonymous: editingTicket.value.isAnonymous,
        },
      },
    );

    showEditTicketModal.value = false;
    editingTicket.value = null;

    await fetchBooking();
  } catch (err: any) {
    console.error("Failed to update ticket:", err);
    editTicketError.value = err.data?.message || "Failed to update ticket";
  } finally {
    updatingTicket.value = false;
  }
}

function confirmCancelTicket(ticket: BookingTicket): void {
  ticketToCancel.value = ticket;
  showCancelTicketModal.value = true;
}

async function cancelTicket(): Promise<void> {
  if (!booking.value || !ticketToCancel.value) return;

  try {
    cancellingTicket.value = true;
    await $fetch(
      `/api/bookings/${booking.value.id}/tickets/${ticketToCancel.value.id}`,
      {
        method: "DELETE",
      },
    );

    showCancelTicketModal.value = false;
    ticketToCancel.value = null;

    await Promise.all([fetchBooking(), fetchEventDetails()]);
  } catch (err: any) {
    console.error("Failed to cancel ticket:", err);
    alert(err.data?.message || "Failed to cancel ticket");
  } finally {
    cancellingTicket.value = false;
  }
}

async function cancelBooking(): Promise<void> {
  if (!booking.value) return;

  try {
    cancellingBooking.value = true;
    await $fetch(`/api/dashboard/registrations/${booking.value.id}/cancel`, {
      method: "POST",
    });

    showCancelBookingModal.value = false;
    booking.value = null;

    await Promise.all([fetchEventDetails(), fetchWaitlistStatus()]);
  } catch (err: any) {
    console.error("Failed to cancel booking:", err);
    alert(err.data?.message || "Failed to cancel booking");
  } finally {
    cancellingBooking.value = false;
  }
}

function editTicketDecklist(ticket: BookingTicket): void {
  editingTicketForDecklist.value = ticket;
  decklistForm.decklist = ticket.decklist || "";
  decklistForm.bringingOnsite = ticket.bringingDecklistOnsite || false;
  showDecklistModal.value = true;
}

async function saveDecklistForTicket(): Promise<void> {
  if (!booking.value || !editingTicketForDecklist.value) return;

  try {
    savingDecklist.value = true;

    await $fetch(`/api/dashboard/decklist`, {
      method: "PUT",
      body: {
        registrationId: booking.value.id,
        ticketId: editingTicketForDecklist.value.id,
        decklist: decklistForm.bringingOnsite ? null : decklistForm.decklist,
        bringingDecklistOnsite: decklistForm.bringingOnsite,
      },
    });

    showDecklistModal.value = false;
    editingTicketForDecklist.value = null;

    await fetchBooking();
  } catch (err: any) {
    console.error("Failed to save decklist:", err);
    alert(err.data?.message || "Failed to save decklist");
  } finally {
    savingDecklist.value = false;
  }
}

async function confirmWaitlistSpot(): Promise<void> {
  if (!id || Array.isArray(id) || waitlistActionPending.value) return;

  try {
    waitlistActionPending.value = true;
    waitlistActionError.value = "";

    await $fetch(`/api/events/${id}/waitlist/confirm`, { method: "POST" });

    await Promise.all([fetchBooking(), fetchEventDetails(), fetchWaitlistStatus()]);
  } catch (err: any) {
    console.error("Failed to confirm waitlist spot:", err);
    waitlistActionError.value =
      err.data?.statusMessage || err.data?.message || "Failed to confirm spot";
  } finally {
    waitlistActionPending.value = false;
  }
}

async function dropFromWaitlist(): Promise<void> {
  if (!id || Array.isArray(id) || waitlistActionPending.value) return;

  try {
    waitlistActionPending.value = true;
    waitlistActionError.value = "";

    await $fetch(`/api/events/${id}/waitlist/drop`, { method: "POST" });

    await fetchWaitlistStatus();
  } catch (err: any) {
    console.error("Failed to drop from waitlist:", err);
    waitlistActionError.value =
      err.data?.statusMessage || err.data?.message || "Failed to leave waitlist";
  } finally {
    waitlistActionPending.value = false;
  }
}

// Fetch event details on mount
onMounted(async () => {
  await fetchEventDetails();
  isAdmin.value = await checkAdminStatus();
  if (user.value) {
    await fetchBooking();
    if (!booking.value) {
      await fetchWaitlistStatus();
    }
  }
});

// Watch for user login/logout
watch(user, async (newUser) => {
  if (newUser) {
    await fetchBooking();
    if (!booking.value) {
      await fetchWaitlistStatus();
    }
  } else {
    booking.value = null;
    waitlistStatus.value = null;
  }
});
</script>
