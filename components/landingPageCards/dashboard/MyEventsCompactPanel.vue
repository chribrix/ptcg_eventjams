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
            class="flex w-14 shrink-0 flex-col items-center justify-center border-r px-1 text-center"
            :style="getEntryDateStyles(entry)"
          >
            <p class="text-[11px] font-semibold">
              {{ getDay(entry.customEvent.eventDate) }}.{{
                getMonth(entry.customEvent.eventDate)
              }}
            </p>
          </div>

          <div class="min-w-0 flex-1 px-3 py-2">
            <div class="mb-1 flex items-start justify-between gap-2">
              <p class="truncate text-sm font-semibold">
                {{ entry.customEvent.name }}
              </p>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                :class="
                  entry.entryType === 'bookmark'
                    ? 'bg-sky-700 text-white'
                    : 'bg-emerald-700 text-white'
                "
              >
                {{
                  entry.entryType === "bookmark"
                    ? t("dashboard.timelineBookmarked")
                    : t("dashboard.timelineRegistered")
                }}
              </span>
            </div>

            <div class="space-y-0.5 text-xs opacity-85">
              <p>{{ formatTime(entry.customEvent.eventDate) }}</p>
              <p class="truncate">{{ entry.customEvent.venue }}</p>
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
                <p class="text-gray-400">{{ t("eventList.dateTime") }}</p>
                <p>{{ formatLongDate(selectedEvent.customEvent.eventDate) }}</p>
              </div>
              <div class="grid grid-cols-[7rem_1fr] gap-2">
                <p class="text-gray-400">{{ t("eventList.location") }}</p>
                <p>{{ selectedEvent.customEvent.venue }}</p>
              </div>
              <div
                v-if="selectedEvent.customEvent.participationFee"
                class="grid grid-cols-[7rem_1fr] gap-2"
              >
                <p class="text-gray-400">{{ t("eventList.entryFee") }}</p>
                <p>{{ selectedEvent.customEvent.participationFee }}</p>
              </div>
              <div class="grid grid-cols-[7rem_1fr] gap-2">
                <p class="text-gray-400">{{ t("dashboard.statusLabel") }}</p>
                <p>
                  {{
                    selectedEvent.entryType === "bookmark"
                      ? t("dashboard.timelineBookmarked")
                      : t("dashboard.timelineRegistered")
                  }}
                </p>
              </div>
              <div
                v-if="selectedEvent.customEvent.description"
                class="border-t border-[#3f495b] pt-2"
              >
                <p class="text-gray-400">{{ t("eventList.aboutEvent") }}</p>
                <p class="mt-1 whitespace-pre-line text-gray-200">
                  {{ selectedEvent.customEvent.description }}
                </p>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                :href="routePlannerUrl(selectedEvent)"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center rounded-lg border border-[#4b5568] bg-[#313846] px-3 py-2 text-xs font-semibold text-gray-100 hover:bg-[#3a4252]"
              >
                {{ t("dashboard.openRoutePlanner") }}
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
              <div v-else></div>
              <NuxtLink
                v-if="selectedEvent.customEvent.id"
                :to="`/events/${selectedEvent.customEvent.id}`"
                class="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-3 py-2 text-xs font-bold text-white"
                @click="selectedEvent = null"
              >
                {{ t("events.eventDetails") }}
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
  notifyEventBookmarksUpdated,
  onEventBookmarksUpdated,
} from "~/utils/eventBookmarks";
import {
  getGuestEventBookmarks,
  removeGuestEventBookmark,
} from "~/utils/guestEventBookmarks";

const { t, locale } = useI18n();
const { userName } = useAuth();

type CompactEventEntry = {
  id: string;
  entryType?: "registration" | "bookmark";
  externalEventId?: string | null;
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

const getDay = (value: string) =>
  String(new Date(value).getDate()).padStart(2, "0");
const getMonth = (value: string) =>
  String(new Date(value).getMonth() + 1).padStart(2, "0");

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
  selectedEvent.value = entry;
};

const routePlannerUrl = (entry: CompactEventEntry) => {
  const target = entry.customEvent.venue || entry.customEvent.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`;
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
