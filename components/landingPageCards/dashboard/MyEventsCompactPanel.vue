<template>
  <section class="rounded-2xl border border-[#434b59] bg-[#303641] p-3">
    <div v-if="loading" class="text-xs text-gray-300">
      {{ t("dashboard.loadingRegistrations") }}
    </div>
    <div v-else-if="entries.length === 0" class="text-xs text-gray-300">
      {{ t("landingPage.myEventsCompactEmpty") }}
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="entry in entries"
        :key="entry.id"
        class="rounded-xl border p-0 overflow-hidden"
        :style="getEntryCardStyles(entry)"
      >
        <button
          type="button"
          class="flex w-full cursor-pointer text-left transition-colors hover:brightness-95"
          @click="openEventModal(entry)"
        >
          <div
            class="flex w-24 shrink-0 flex-col items-center justify-center border-r px-2 text-center"
            :style="getEntryDateStyles(entry)"
          >
            <p
              class="text-[15px] font-extrabold uppercase tracking-wide leading-none"
            >
              {{ formatCardDate(entry.customEvent.eventDate) }}
            </p>
            <p class="mt-2 text-[14px] font-semibold leading-none opacity-90">
              {{ formatTime(entry.customEvent.eventDate) }}
            </p>
          </div>

          <div class="min-w-0 flex-1 px-3 py-2">
            <div class="mb-1 flex items-start justify-between gap-2">
              <p class="truncate text-sm font-semibold">
                {{ entry.customEvent.name }}
              </p>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                :class="[
                  getEntryBadgeClass(entry),
                  entry.status === 'waitlist_claim'
                    ? 'claim-badge-animated'
                    : '',
                ]"
              >
                {{ getEntryBadgeText(entry) }}
              </span>
            </div>

            <div class="space-y-0.5 text-xs opacity-85">
              <p class="truncate">{{ entry.customEvent.venue }}</p>
              <p
                v-if="entry.status === 'waitlist_claim' && entry.claimExpiresAt"
                class="font-bold text-emerald-900 opacity-100"
              >
                Platz reserviert bis:
                {{ formatClaimRemaining(entry.claimExpiresAt) }}
              </p>
              <p
                class="text-right text-[10px] font-semibold uppercase tracking-wide opacity-70"
              >
                Klicken für Details
              </p>
            </div>
          </div>
        </button>
      </li>
    </ul>
    <p
      v-if="!userName && entries.length > 0"
      class="mt-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-2 text-xs leading-5 text-amber-100"
    >
      Diese Vormerkungen sind nur lokal gespeichert. Mit einem Nutzerkonto
      bleiben sie sicherer und geräteübergreifend erhalten.
    </p>
    <NuxtLink
      v-if="userName"
      to="/dashboard"
      class="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_18px_30px_-14px_rgba(37,99,235,0.98)] ring-1 ring-sky-300/30 hover:from-sky-400 hover:via-blue-500 hover:to-indigo-500"
    >
      {{ t("landingPage.toDashboard") }}
    </NuxtLink>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="selectedEvent"
          class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
          @click="selectedEvent = null"
        >
          <div
            class="w-full max-w-md rounded-2xl border border-[#4b5568] bg-[#2b303a] p-4 shadow-2xl"
            @click.stop
          >
            <div class="mb-3 flex items-start justify-between gap-3">
              <h4 class="text-base font-bold text-white">
                {{ selectedEvent.customEvent.name }}
              </h4>
              <button
                type="button"
                class="rounded-md px-2 py-1 text-sm font-semibold text-gray-300 hover:bg-[#3a4252] hover:text-white"
                @click="selectedEvent = null"
              >
                ×
              </button>
            </div>

            <div class="space-y-2 text-sm text-gray-200">
              <div class="grid grid-cols-[7rem_1fr] gap-2">
                <p class="text-gray-400">{{ tr("eventList.dateTime", "Datum & Uhrzeit") }}</p>
                <p>{{ formatLongDate(selectedEvent.customEvent.eventDate) }}</p>
              </div>
              <div class="grid grid-cols-[7rem_1fr] gap-2">
                <p class="text-gray-400">{{ tr("eventList.location", "Ort") }}</p>
                <p>{{ selectedEvent.customEvent.venue }}</p>
              </div>
              <div
                v-if="selectedEvent.customEvent.participationFee"
                class="grid grid-cols-[7rem_1fr] gap-2"
              >
                <p class="text-gray-400">{{ tr("eventList.entryFee", "Startgeld") }}</p>
                <p>{{ selectedEvent.customEvent.participationFee }}</p>
              </div>
              <div class="grid grid-cols-[7rem_1fr] gap-2">
                <p class="text-gray-400">{{ tr("dashboard.statusLabel", "Status") }}</p>
                <p>
                  {{ getEntryBadgeText(selectedEvent) }}
                </p>
              </div>
              <div
                v-if="
                  selectedEvent.status === 'waitlist_claim' &&
                  selectedEvent.claimExpiresAt
                "
                class="grid grid-cols-[7rem_1fr] gap-2"
              >
                <p class="text-gray-400">{{ tr("common.claim", "Claim") }}</p>
                <p>{{ formatClaimRemaining(selectedEvent.claimExpiresAt) }}</p>
              </div>
              <div
                v-if="selectedEvent.customEvent.description"
                class="border-t border-[#3f495b] pt-2"
              >
                <p class="text-gray-400">{{ tr("eventList.aboutEvent", "Infos zum Event") }}</p>
                <p class="mt-1 whitespace-pre-line text-gray-200">
                  {{ selectedEvent.customEvent.description }}
                </p>
              </div>
            </div>

            <div
              v-if="
                selectedEvent.entryType === 'registration' &&
                getActiveTickets(selectedEvent).length > 1
              "
              class="mt-3 rounded-lg border border-[#3f495b] bg-[#313846] p-3"
            >
              <div class="mb-2 flex items-center justify-between">
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-gray-300"
                >
                  Tickets absagen
                </p>
                <button
                  type="button"
                  class="text-xs font-semibold text-sky-300 hover:text-sky-200"
                  @click="toggleAllTickets"
                >
                  {{
                    hasAllActiveTicketsSelected
                      ? "Alle abwählen"
                      : "Alle auswählen"
                  }}
                </button>
              </div>
              <div class="grid gap-2">
                <label
                  v-for="ticket in getActiveTickets(selectedEvent)"
                  :key="ticket.id"
                  class="flex items-center gap-2 rounded-md border border-[#4b5568] bg-[#2b303a] px-2 py-2 text-xs text-gray-200"
                >
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-500 bg-transparent"
                    :checked="selectedTicketIds.includes(ticket.id)"
                    @change="toggleTicketSelection(ticket.id)"
                  />
                  <span class="truncate">
                    {{ ticket.participantName || "Unbenanntes Ticket" }}
                    <span
                      v-if="ticket.participantPlayerId"
                      class="text-gray-400"
                    >
                      (#{{ ticket.participantPlayerId }})
                    </span>
                  </span>
                </label>
              </div>
              <p class="mt-2 text-[11px] text-gray-400">
                Hinweis: Das letzte verbleibende Ticket kann nicht einzeln
                abgesagt werden.
              </p>
            </div>

            <p
              v-if="actionError"
              class="mt-3 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200"
            >
              {{ actionError }}
            </p>

            <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                :href="routePlannerUrl(selectedEvent)"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center gap-1 rounded-lg border border-[#4b5568] bg-[#313846] px-3 py-2 text-xs font-semibold text-gray-100 hover:bg-[#3a4252]"
              >
                <MapIcon class="h-4 w-4" />
                Maps
              </a>
              <button
                v-if="
                  selectedEvent.entryType === 'bookmark' &&
                  selectedEvent.externalEventId
                "
                type="button"
                class="inline-flex items-center justify-center rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                :disabled="actionPending"
                @click="removeBookmark(selectedEvent)"
              >
                {{
                  actionPending
                    ? t("dashboard.processingAction")
                    : t("dashboard.removeBookmarkAction")
                }}
              </button>
              <NuxtLink
                v-if="selectedEvent.entryType === 'registration'"
                :to="`/booking/${selectedEvent.id}`"
                class="inline-flex items-center justify-center gap-1 rounded-lg border border-[#4b5568] bg-[#313846] px-3 py-2 text-xs font-semibold text-gray-100 hover:bg-[#3a4252]"
                @click="selectedEvent = null"
              >
                <PencilSquareIcon class="h-4 w-4" />
                Buchung verwalten
              </NuxtLink>
              <button
                v-if="selectedEvent.entryType === 'registration'"
                type="button"
                class="inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                :disabled="
                  actionPending || getActiveTickets(selectedEvent).length === 0
                "
                @click="cancelSelectedTickets"
              >
                <XCircleIcon class="h-4 w-4" />
                {{ actionPending ? "Bitte warten..." : "Absagen" }}
              </button>
              <button
                v-if="
                  selectedEvent.entryType === 'waitlist' &&
                  selectedEvent.status === 'waitlist_claim'
                "
                type="button"
                class="inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                :disabled="actionPending"
                @click="confirmWaitlistSpot"
              >
                <CheckCircleIcon class="h-4 w-4" />
                {{ actionPending ? "Bitte warten..." : "Teilnehmen" }}
              </button>
              <button
                v-if="selectedEvent.entryType === 'waitlist'"
                type="button"
                class="inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                :disabled="actionPending"
                @click="dropFromWaitlist"
              >
                <ExclamationCircleIcon class="h-4 w-4" />
                {{ actionPending ? "Bitte warten..." : "Absagen" }}
              </button>
              <NuxtLink
                v-if="selectedEvent.customEvent.id"
                :to="`/events/${selectedEvent.customEvent.id}`"
                class="inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-3 py-2 text-xs font-bold text-white"
                @click="selectedEvent = null"
              >
                <TicketIcon class="h-4 w-4" />
                {{ tr("events.eventDetails", "Eventdetails") }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { getEventColor } from "~/utils/eventColors";
import {
  PencilSquareIcon,
  XCircleIcon,
  CheckCircleIcon,
  TicketIcon,
  ExclamationCircleIcon,
  MapIcon,
} from "@heroicons/vue/24/outline";
import {
  notifyEventBookmarksUpdated,
  onEventBookmarksUpdated,
} from "~/utils/eventBookmarks";
import {
  getGuestEventBookmarks,
  removeGuestEventBookmark,
} from "~/utils/guestEventBookmarks";

const { t, locale } = useI18n({ useScope: "global" });
const { userName } = useAuth();

const tr = (key: string, fallback: string, params?: Record<string, unknown>) => {
  const translated = t(key, params as any);
  return translated === key ? fallback : translated;
};

type CompactEventEntry = {
  id: string;
  entryType?: "registration" | "bookmark" | "waitlist";
  externalEventId?: string | null;
  status?: string;
  claimExpiresAt?: string | null;
  ticketCount?: number;
  tickets?: Array<{
    id: string;
    participantName: string | null;
    participantPlayerId: string | null;
    status: string;
    isAnonymous: boolean;
  }>;
  eventType?: string;
  customEvent: {
    id?: string;
    name: string;
    venue: string;
    eventDate: string;
    participationFee?: string | null;
    description?: string | null;
  };
};

const entries = ref<CompactEventEntry[]>([]);
const loading = ref(false);
const selectedEvent = ref<CompactEventEntry | null>(null);
const actionPending = ref(false);
const actionError = ref<string>("");
const selectedTicketIds = ref<string[]>([]);
let removeBookmarksListener: (() => void) | null = null;

const formatTime = (value: string) => {
  const date = new Date(value);
  return date.toLocaleTimeString(
    locale.value.startsWith("de") ? "de-DE" : "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
};

const formatLongDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString(
    locale.value.startsWith("de") ? "de-DE" : "en-US",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
};

const formatCardDate = (value: string) => {
  const date = new Date(value);
  const day = date.getDate();
  const month = date
    .toLocaleDateString("de-DE", { month: "short" })
    .replace(".", "");
  return `${day}. ${month.toUpperCase()}`;
};

const getEntryEventType = (entry: CompactEventEntry) =>
  entry.eventType || "local";

const getEntryCardStyles = (entry: CompactEventEntry) => {
  const color = getEventColor(getEntryEventType(entry));
  return {
    backgroundColor: color.bg,
    borderColor: color.text,
    color: color.text,
  };
};

const getEntryDateStyles = (entry: CompactEventEntry) => {
  const color = getEventColor(getEntryEventType(entry));
  return {
    borderColor: color.text,
    backgroundColor: `${color.text}22`,
    color: color.text,
  };
};

const openEventModal = (entry: CompactEventEntry) => {
  actionError.value = "";
  selectedTicketIds.value = getActiveTickets(entry).map((ticket) => ticket.id);
  selectedEvent.value = entry;
};

const getEntryBadgeClass = (entry: CompactEventEntry) => {
  if (entry.status === "waitlist_claim")
    return "bg-emerald-800 text-white ring-2 ring-emerald-200/70";
  if (entry.status === "waitlist") return "bg-amber-600 text-white";
  if (entry.entryType === "bookmark") return "bg-sky-700 text-white";
  return "bg-emerald-700 text-white";
};

const getEntryBadgeText = (entry: CompactEventEntry) => {
  if (entry.status === "waitlist_claim") return "Freier Platz!";
  if (entry.status === "waitlist") return "Warteliste";
  return entry.entryType === "bookmark"
    ? t("dashboard.timelineBookmarked")
    : t("dashboard.timelineRegistered");
};

const formatClaimRemaining = (expiresAt: string) => {
  const expires = new Date(expiresAt).getTime();
  const now = Date.now();
  const diffMs = expires - now;

  if (diffMs <= 0) return "abgelaufen";

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const until = new Date(expiresAt).toLocaleTimeString(
    locale.value.startsWith("de") ? "de-DE" : "en-US",
    { hour: "2-digit", minute: "2-digit" },
  );

  if (hours > 0) return `${until} (${hours}h ${minutes}m)`;
  return `${until} (${minutes}m)`;
};

const routePlannerUrl = (entry: CompactEventEntry) => {
  const target = entry.customEvent.venue || entry.customEvent.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`;
};

const getActiveTickets = (entry: CompactEventEntry | null) => {
  if (!entry?.tickets?.length) return [];
  return entry.tickets.filter((ticket) => ticket.status !== "cancelled");
};

const hasAllActiveTicketsSelected = computed(() => {
  const activeIds = getActiveTickets(selectedEvent.value).map(
    (ticket) => ticket.id,
  );
  return (
    activeIds.length > 0 &&
    activeIds.every((id) => selectedTicketIds.value.includes(id))
  );
});

const toggleTicketSelection = (ticketId: string) => {
  if (actionPending.value) return;
  if (selectedTicketIds.value.includes(ticketId)) {
    selectedTicketIds.value = selectedTicketIds.value.filter(
      (id) => id !== ticketId,
    );
    return;
  }
  selectedTicketIds.value = [...selectedTicketIds.value, ticketId];
};

const toggleAllTickets = () => {
  if (actionPending.value || !selectedEvent.value) return;
  const activeIds = getActiveTickets(selectedEvent.value).map(
    (ticket) => ticket.id,
  );
  if (hasAllActiveTicketsSelected.value) {
    selectedTicketIds.value = [];
    return;
  }
  selectedTicketIds.value = activeIds;
};

const refreshEntriesAfterAction = async () => {
  const currentId = selectedEvent.value?.id;
  await loadEntries();
  if (!currentId) {
    selectedEvent.value = null;
    return;
  }
  selectedEvent.value =
    entries.value.find((entry) => entry.id === currentId) || null;
  if (selectedEvent.value) {
    selectedTicketIds.value = getActiveTickets(selectedEvent.value).map(
      (ticket) => ticket.id,
    );
  }
};

const cancelSelectedTickets = async () => {
  const entry = selectedEvent.value;
  if (!entry || entry.entryType !== "registration" || actionPending.value)
    return;

  const activeTickets = getActiveTickets(entry);
  const selectedTickets = activeTickets.filter((ticket) =>
    selectedTicketIds.value.includes(ticket.id),
  );

  if (selectedTickets.length === 0) {
    actionError.value = "Bitte mindestens ein Ticket auswählen.";
    return;
  }

  const cancelAll = selectedTickets.length === activeTickets.length;
  const message = cancelAll
    ? `Möchtest du die komplette Buchung für "${entry.customEvent.name}" absagen?`
    : `Möchtest du ${selectedTickets.length} Ticket(s) für "${entry.customEvent.name}" absagen?`;
  if (!window.confirm(message)) return;

  try {
    actionPending.value = true;
    actionError.value = "";
    if (cancelAll) {
      await $fetch(`/api/dashboard/registrations/${entry.id}/cancel`, {
        method: "POST",
      });
    } else {
      await Promise.all(
        selectedTickets.map((ticket) =>
          $fetch(`/api/bookings/${entry.id}/tickets/${ticket.id}`, {
            method: "DELETE",
          }),
        ),
      );
    }
    await refreshEntriesAfterAction();
  } catch (error: any) {
    actionError.value = error?.data?.statusMessage || "Absage fehlgeschlagen.";
  } finally {
    actionPending.value = false;
  }
};

const confirmWaitlistSpot = async () => {
  const entry = selectedEvent.value;
  if (!entry || entry.entryType !== "waitlist" || actionPending.value) return;
  const eventId = entry.customEvent.id;
  if (!eventId) return;

  try {
    actionPending.value = true;
    actionError.value = "";
    await $fetch(`/api/events/${eventId}/waitlist/confirm`, {
      method: "POST",
    });
    await refreshEntriesAfterAction();
  } catch (error: any) {
    actionError.value =
      error?.data?.statusMessage || "Teilnahme konnte nicht bestätigt werden.";
  } finally {
    actionPending.value = false;
  }
};

const dropFromWaitlist = async () => {
  const entry = selectedEvent.value;
  if (!entry || entry.entryType !== "waitlist" || actionPending.value) return;
  const eventId = entry.customEvent.id;
  if (!eventId) return;

  const confirmed = window.confirm(
    `Wirklich von der Warteliste für "${entry.customEvent.name}" austragen?`,
  );
  if (!confirmed) return;

  try {
    actionPending.value = true;
    actionError.value = "";
    await $fetch(`/api/events/${eventId}/waitlist/drop`, {
      method: "POST",
    });
    await refreshEntriesAfterAction();
  } catch (error: any) {
    actionError.value =
      error?.data?.statusMessage || "Wartelisten-Austragung fehlgeschlagen.";
  } finally {
    actionPending.value = false;
  }
};

const removeBookmark = async (entry: CompactEventEntry) => {
  if (
    entry.entryType !== "bookmark" ||
    !entry.externalEventId ||
    actionPending.value
  ) {
    return;
  }

  const confirmed = window.confirm(
    t("dashboard.removeBookmarkConfirm", { eventName: entry.customEvent.name }),
  );
  if (!confirmed) return;

  try {
    actionPending.value = true;
    if (userName.value) {
      await $fetch(`/api/events/bookmarks/${entry.externalEventId}`, {
        method: "DELETE",
      });
    } else {
      removeGuestEventBookmark(entry.externalEventId);
    }
    notifyEventBookmarksUpdated();
    selectedEvent.value = null;
    await loadEntries();
  } catch (error) {
    console.error("Failed to remove bookmark:", error);
  } finally {
    actionPending.value = false;
  }
};

const loadEntries = async () => {
  loading.value = true;

  try {
    if (!userName.value) {
      entries.value = getGuestEventBookmarks()
        .map((bookmark) => ({
          id: `guest-${bookmark.externalEventId}`,
          entryType: "bookmark" as const,
          externalEventId: bookmark.externalEventId,
          eventType: bookmark.eventType || undefined,
          customEvent: {
            id: bookmark.externalEventId,
            name: bookmark.title,
            venue: bookmark.venue,
            eventDate: bookmark.eventDate,
            participationFee: bookmark.cost || null,
            description: null,
          },
        }))
        .slice(0, 4);
      return;
    }

    const response = await $fetch<{ data: CompactEventEntry[] }>(
      "/api/dashboard/registrations",
    );
    entries.value = (response.data || []).slice(0, 4);
  } catch {
    entries.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void loadEntries();
  removeBookmarksListener = onEventBookmarksUpdated(() => {
    void loadEntries();
  });
});

watch(userName, () => {
  void loadEntries();
});

onBeforeUnmount(() => {
  removeBookmarksListener?.();
});
</script>

<style scoped>
@keyframes claimPulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.55);
  }
  60% {
    transform: scale(1.03);
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}

.claim-badge-animated {
  animation: claimPulse 1.8s ease-in-out infinite;
}
</style>
