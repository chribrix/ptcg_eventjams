<template>
  <div
    class="fixed inset-0 app-overlay flex items-center justify-center p-4 z-50"
    @click.self="$emit('close')"
  >
    <div
      class="app-modal-surface rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      @click.stop
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="app-heading-2">
          {{ eventId ? t("admin.eventsManager.editEvent") : t("admin.eventsManager.createNewEvent") }}
        </h3>
        <button type="button" @click="$emit('close')" class="app-btn-neutral app-btn-sm">
          &times;
        </button>
      </div>

      <div v-if="loading" class="flex items-center gap-2 app-text-secondary-soft text-sm py-6">
        <div
          class="w-4 h-4 border-2 app-border border-t-[var(--app-accent)] rounded-full animate-spin"
        ></div>
        <span>{{ t("common.loading") }}</span>
      </div>

      <div v-else-if="loadError" class="app-feedback-danger rounded-lg p-3 text-sm">
        {{ loadError }}
      </div>

      <div v-else-if="createdEvent" class="space-y-5">
        <div class="app-feedback-success rounded-lg p-4">
          <h4 class="app-heading-3">{{ t("eventWorkspace.eventCreated") }}</h4>
          <p class="app-meta-text mt-1">
            {{ t("eventWorkspace.registrationLinkReady") }}
          </p>
        </div>

        <div>
          <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
            {{ t("admin.eventsManager.registrationLink") }}
          </label>
          <div class="flex flex-col gap-2 sm:flex-row">
            <input :value="registrationUrl" readonly class="app-input px-4 py-3 flex-1" />
            <button type="button" @click="copyRegistrationLink" class="app-btn-neutral app-btn-md">
              <CheckIcon v-if="linkCopied" class="w-4 h-4" />
              <ClipboardDocumentIcon v-else class="w-4 h-4" />
              {{ linkCopied ? t("eventWorkspace.linkCopied") : t("eventWorkspace.copyLink") }}
            </button>
          </div>
        </div>

        <div class="flex flex-wrap justify-end gap-3">
          <NuxtLink :to="`/events/${createdEvent.id}`" class="app-btn-neutral app-btn-md no-underline">
            <ArrowTopRightOnSquareIcon class="w-4 h-4" />
            {{ t("eventWorkspace.openEvent") }}
          </NuxtLink>
          <button type="button" @click="$emit('close')" class="app-btn-primary app-btn-md">
            {{ t("eventWorkspace.done") }}
          </button>
        </div>
      </div>

      <form v-else @submit.prevent="saveEvent" class="space-y-4">
        <div v-if="formError" class="app-feedback-danger rounded-lg p-3 text-sm">
          {{ formError }}
        </div>

        <section v-if="!eventId" class="rounded-lg border app-border app-surface-1 p-4">
          <div class="flex items-center justify-between gap-3">
            <h4 class="app-heading-3">{{ t("eventWorkspace.savedTemplatesTitle") }}</h4>
            <span v-if="loadingTemplates" class="app-meta-text">{{ t("common.loading") }}</span>
          </div>
          <p v-if="!loadingTemplates && !templates.length" class="app-meta-text mt-2">
            {{ t("eventWorkspace.noTemplates") }}
          </p>
          <div v-else class="mt-3 grid gap-2 sm:grid-cols-2">
            <div
              v-for="template in templates"
              :key="template.id"
              class="flex min-w-0 items-center gap-2 rounded-lg border app-border px-3 py-2"
            >
              <button type="button" @click="applyTemplate(template)" class="min-w-0 flex-1 text-left">
                <span class="app-text-strong block truncate">{{ template.name }}</span>
                <span class="app-meta-text block truncate">
                  {{ weekdayLabel(template.weekday) }} · {{ template.eventTime }} · {{ template.venue }}
                </span>
              </button>
              <button
                type="button"
                @click="editingTemplate = template"
                class="app-btn-neutral app-btn-sm"
                :title="t('eventWorkspace.editTemplate')"
              >
                <PencilSquareIcon class="w-4 h-4" />
              </button>
              <button
                type="button"
                @click="deleteTemplate(template)"
                class="app-btn-danger app-btn-sm"
                :title="t('common.delete')"
              >
                <TrashIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        <div>
          <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
            {{ t("admin.eventsManager.eventName") }} *
          </label>
          <input v-model="eventForm.name" type="text" required class="app-input px-4 py-3" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
              {{ t("admin.eventsManager.gameCategory") }} *
            </label>
            <select v-model="eventForm.tagType" required class="app-input px-4 py-3">
              <option value="pokemon">Pokémon</option>
              <option value="riftbound">Riftbound</option>
              <option value="generic">{{ t("admin.eventsManager.genericGame") }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
              {{ t("admin.eventsManager.game") }} *
            </label>
            <input v-model="eventForm.tags.game" type="text" required class="app-input px-4 py-3" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
            {{ t("admin.eventsManager.format") }}
          </label>
          <select v-model="eventForm.tags.format" class="app-input px-4 py-3">
            <option
              v-for="formatOption in FORMAT_OPTIONS"
              :key="formatOption.value"
              :value="formatOption.value"
            >
              {{ formatOption.label }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
            {{ t("admin.eventsManager.eventType") }} *
          </label>
          <select v-model="eventForm.tags.type" required class="app-input px-4 py-3">
            <option value="custom">{{ t("admin.eventsManager.eventTypes.custom") }}</option>
            <option value="league_challenge">{{ t("admin.eventsManager.eventTypes.leagueChallenge") }}</option>
            <option value="league_cup">{{ t("admin.eventsManager.eventTypes.leagueCup") }}</option>
            <option value="local_tournament">{{ t("admin.eventsManager.eventTypes.localTournament") }}</option>
            <option value="prerelease">{{ t("admin.eventsManager.eventTypes.prerelease") }}</option>
            <option value="regional">{{ t("admin.eventsManager.eventTypes.regional") }}</option>
            <option value="international">{{ t("admin.eventsManager.eventTypes.international") }}</option>
            <option value="worlds">{{ t("admin.eventsManager.eventTypes.worlds") }}</option>
          </select>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
              {{ t("admin.venue.columns.organization") }}
            </label>
            <input
              v-model="eventForm.tags.host"
              type="text"
              class="app-input px-4 py-3"
              list="event-edit-host-options"
              @change="syncVenueFromOrganization"
              @blur="syncVenueFromOrganization"
            />
            <datalist id="event-edit-host-options">
              <option
                v-for="organization in hostOrganizationOptions"
                :key="organization"
                :value="organization"
              />
            </datalist>
          </div>
          <div>
            <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
              {{ t("common.venue") }} *
            </label>
            <input
              v-model="eventForm.venue"
              type="text"
              required
              class="app-input px-4 py-3"
              list="event-edit-venue-options"
              @change="syncOrganizationFromVenue"
              @blur="syncOrganizationFromVenue"
            />
            <datalist id="event-edit-venue-options">
              <option
                v-for="venueOption in venueOptions"
                :key="venueOption"
                :value="venueOption"
              />
            </datalist>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
              {{ t("events.maxParticipants") }} *
            </label>
            <input
              v-model.number="eventForm.maxParticipants"
              type="number"
              min="1"
              required
              class="app-input px-4 py-3"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
              {{ t("events.participationFee") }} (€)
            </label>
            <input
              v-model.number="eventForm.participationFee"
              type="number"
              step="0.01"
              min="0"
              class="app-input px-4 py-3"
              placeholder="0.00"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
              {{ t("events.eventDate") }} *
              <span v-if="eventForm.eventDate" class="app-meta-text block">
                {{ formatDateWithWeekday(eventForm.eventDate) }}
              </span>
            </label>
            <input
              v-model="eventForm.eventDate"
              type="datetime-local"
              required
              step="900"
              class="app-input px-4 py-3"
              @change="onEventDateChange"
              @blur="normalizeEventDateInput"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
              {{ t("events.registrationDeadline") }}
            </label>
            <input
              v-model="eventForm.registrationDeadline"
              type="datetime-local"
              step="900"
              class="app-input px-4 py-3"
              @change="normalizeRegistrationDeadlineInput"
              @blur="normalizeRegistrationDeadlineInput"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
            {{ t("common.description") }}
          </label>
          <textarea v-model="eventForm.description" class="app-input px-4 py-3" rows="3"></textarea>
        </div>

        <div>
          <label class="flex items-start gap-3 cursor-pointer">
            <input
              v-model="eventForm.requiresDecklist"
              type="checkbox"
              class="mt-0.5 w-4 h-4 rounded"
            />
            <span class="text-sm font-medium app-text-strong">
              {{ t("events.requiresDecklist") }}
            </span>
          </label>
        </div>

        <div v-if="eventId">
          <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
            {{ t("common.status") }}
          </label>
          <select v-model="eventForm.status" class="app-input px-4 py-3">
            <option value="upcoming">{{ t("events.eventStatus.upcoming") }}</option>
            <option value="ongoing">{{ t("events.eventStatus.ongoing") }}</option>
            <option value="completed">{{ t("events.eventStatus.completed") }}</option>
            <option value="cancelled">{{ t("events.eventStatus.cancelled") }}</option>
          </select>
        </div>

        <div class="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            @click="$emit('close')"
            class="app-btn-neutral app-btn-md flex-1"
          >
            {{ t("common.cancel") }}
          </button>
          <button
            type="button"
            @click="saveAsTemplate"
            :disabled="savingTemplate || !eventForm.eventDate"
            class="app-btn-neutral app-btn-md flex-1 disabled:opacity-50"
          >
            <BookmarkIcon class="w-4 h-4" />
            {{ savingTemplate ? t("eventWorkspace.savingTemplate") : t("eventWorkspace.saveAsTemplate") }}
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="app-btn-primary app-btn-md flex-1 disabled:opacity-50"
          >
            {{
              saving
                ? t("admin.eventsManager.saving")
                : eventId
                  ? t("admin.eventsManager.updateEvent")
                  : t("admin.eventsManager.createEvent")
            }}
          </button>
        </div>
      </form>
    </div>
  </div>

  <EventTemplateEditModal
    v-if="editingTemplate"
    :template="editingTemplate"
    @close="editingTemplate = null"
    @saved="onTemplateUpdated"
  />
</template>

<script setup lang="ts">
import { parseEventTags, FORMAT_OPTIONS, type TagType } from "~/types/eventTags";
import {
  ArrowTopRightOnSquareIcon,
  BookmarkIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/vue/24/outline";
import type { EventTemplateData } from "~/components/EventTemplateEditModal.vue";
import {
  formatDateInTimeZone,
  formatDateTimeLocalInput,
  parseDateTimeLocalInput,
  getUserTimeZone,
} from "~/utils/eventDateTime";

// Canonical event-edit/create form, reused wherever an event needs
// creating or editing in place (event workspace page "Turnier editieren",
// landing page "Event anlegen", and can replace the admin events manager's
// inline form to avoid a parallel implementation).
interface EventFormTags {
  type?: string;
  game: string;
  format?: string;
  host?: string;
}

interface EventPrefill {
  name?: string;
  venue?: string;
  tagType?: TagType;
  tags?: EventFormTags;
  maxParticipants?: number;
  participationFee?: number;
  description?: string;
  requiresDecklist?: boolean;
  eventDate?: string;
  registrationDeadline?: string;
}

const props = defineProps<{ eventId?: string; prefill?: EventPrefill }>();

interface SavedEvent {
  id: string;
  name: string;
}

const emit = defineEmits<{
  close: [];
  saved: [event?: SavedEvent];
  templateSaved: [];
}>();

const { t, locale } = useI18n();
const { showToast } = useToast();

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

interface VenueDirectoryEntry {
  id: string;
  organizationName: string;
  venueName: string;
}

const loading = ref(true);
const saving = ref(false);
const savingTemplate = ref(false);
const formError = ref("");
const loadError = ref("");
const loadingTemplates = ref(false);
const templates = ref<EventTemplateData[]>([]);
const editingTemplate = ref<EventTemplateData | null>(null);
const createdEvent = ref<SavedEvent | null>(null);
const linkCopied = ref(false);
const userTimeZone = ref(getUserTimeZone());
const venueDirectory = ref<VenueDirectoryEntry[]>([]);

const registrationUrl = computed(() => {
  if (!createdEvent.value) return "";
  const path = `/events/register/${createdEvent.value.id}`;
  return import.meta.client ? `${window.location.origin}${path}` : path;
});

const createEmptyEventTags = (): EventFormTags => ({
  type: "custom",
  game: "Pokemon",
  format: "standard",
  host: "",
});

const eventForm = ref<EventFormState>({
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
  const normalized = normalizeToQuarterHour(eventForm.value.eventDate);
  if (normalized !== eventForm.value.eventDate) {
    eventForm.value.eventDate = normalized;
  }
};

const normalizeRegistrationDeadlineInput = () => {
  if (!eventForm.value.registrationDeadline) return;
  const normalized = normalizeToQuarterHour(eventForm.value.registrationDeadline);
  if (normalized !== eventForm.value.registrationDeadline) {
    eventForm.value.registrationDeadline = normalized;
  }
};

const onEventDateChange = () => {
  normalizeEventDateInput();
  if (eventForm.value.eventDate) {
    const eventDate = parseDateTimeLocalInput(eventForm.value.eventDate, userTimeZone.value);
    const regDeadline = new Date(eventDate.getTime() - 15 * 60 * 1000);
    eventForm.value.registrationDeadline = formatDateTimeLocalInput(regDeadline, userTimeZone.value);
    normalizeRegistrationDeadlineInput();
  }
};

const formatDateWithWeekday = (dateString: string): string => {
  if (!dateString) return "";
  const weekday = formatDateInTimeZone(dateString, { weekday: "short" }, "de-DE", userTimeZone.value);
  const formatted = formatDateInTimeZone(
    dateString,
    { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" },
    "de-DE",
    userTimeZone.value,
  );
  return `${weekday}, ${formatted}`;
};

const normalizedText = (value?: string | null) => value?.trim().toLowerCase() || "";

const findVenueEntryByOrganization = (organizationName?: string) => {
  const search = normalizedText(organizationName);
  if (!search) return null;
  return venueDirectory.value.find((entry) => normalizedText(entry.organizationName) === search) || null;
};

const findVenueEntryByVenueName = (venueName?: string) => {
  const search = normalizedText(venueName);
  if (!search) return null;
  return venueDirectory.value.find((entry) => normalizedText(entry.venueName) === search) || null;
};

const syncVenueFromOrganization = () => {
  const entry = findVenueEntryByOrganization(eventForm.value.tags.host);
  if (entry) eventForm.value.venue = entry.venueName;
};

const syncOrganizationFromVenue = () => {
  const entry = findVenueEntryByVenueName(eventForm.value.venue);
  if (entry) eventForm.value.tags.host = entry.organizationName;
};

const hostOrganizationOptions = computed(() =>
  [...new Set(venueDirectory.value.map((entry) => entry.organizationName))].sort((a, b) => a.localeCompare(b)),
);

const venueOptions = computed(() =>
  [...new Set(venueDirectory.value.map((entry) => entry.venueName))].sort((a, b) => a.localeCompare(b)),
);

const getRequestErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== "object") return fallback;

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

async function loadVenueDirectory() {
  try {
    const response = await $fetch<{ venues: VenueDirectoryEntry[] }>("/api/admin/venues");
    venueDirectory.value = response.venues || [];
  } catch (err) {
    console.error("Error loading venue directory:", err);
  }
}

async function loadEvent() {
  if (!props.eventId) return;

  try {
    loading.value = true;
    loadError.value = "";

    const response = await $fetch<{ event: any }>(`/api/events/${props.eventId}`);
    const eventData = response.event;

    eventForm.value = {
      name: eventData.name,
      venue: eventData.venue,
      tagType: (eventData.tagType as TagType) || "pokemon",
      tags: {
        ...createEmptyEventTags(),
        ...(eventData.tags
          ? (parseEventTags(eventData.tags, (eventData.tagType as TagType) || "pokemon") as Record<string, string | undefined>)
          : {}),
      },
      maxParticipants: eventData.maxParticipants,
      participationFee: eventData.participationFee || 0,
      description: eventData.description || "",
      eventDate: formatDateTimeLocalInput(eventData.eventDate, userTimeZone.value),
      registrationDeadline: eventData.registrationDeadline
        ? formatDateTimeLocalInput(eventData.registrationDeadline, userTimeZone.value)
        : "",
      requiresDecklist: eventData.requiresDecklist,
      status: eventData.status,
    };
  } catch (err) {
    console.error("Failed to load event for editing:", err);
    loadError.value = t("eventWorkspace.editLoadError");
  } finally {
    loading.value = false;
  }
}

function applyPrefill() {
  const p = props.prefill;
  eventForm.value = {
    name: p?.name || "",
    venue: p?.venue || "",
    tagType: p?.tagType || "pokemon",
    tags: { ...createEmptyEventTags(), ...(p?.tags || {}) },
    maxParticipants: p?.maxParticipants ?? 20,
    participationFee: p?.participationFee ?? 0,
    description: p?.description || "",
    eventDate: p?.eventDate || "",
    registrationDeadline: p?.registrationDeadline || "",
    requiresDecklist: p?.requiresDecklist ?? false,
    status: "upcoming",
  };
}

function weekdayLabel(weekday: number): string {
  const referenceSunday = new Date(Date.UTC(2023, 0, 1 + weekday));
  return referenceSunday.toLocaleDateString(
    locale.value.startsWith("de") ? "de-DE" : "en-US",
    { weekday: "long" },
  );
}

function computeNextOccurrence(weekday: number, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();
  const result = new Date(now);
  result.setHours(hours, minutes, 0, 0);

  let daysUntil = (weekday - now.getDay() + 7) % 7;
  if (daysUntil === 0 && result.getTime() <= now.getTime()) {
    daysUntil = 7;
  }
  result.setDate(now.getDate() + daysUntil);
  return result;
}

async function loadTemplates() {
  if (props.eventId) return;

  try {
    loadingTemplates.value = true;
    const response = await $fetch<{ templates: EventTemplateData[] }>(
      "/api/admin/event-templates",
    );
    templates.value = response.templates || [];
  } catch (err) {
    console.error("Failed to load event templates:", err);
  } finally {
    loadingTemplates.value = false;
  }
}

function applyTemplate(template: EventTemplateData) {
  const nextDate = computeNextOccurrence(template.weekday, template.eventTime);
  const eventDate = formatDateTimeLocalInput(nextDate, userTimeZone.value);
  let registrationDeadline = "";

  if (template.registrationDeadlineMinutesBefore != null) {
    registrationDeadline = formatDateTimeLocalInput(
      new Date(
        nextDate.getTime() -
          template.registrationDeadlineMinutesBefore * 60 * 1000,
      ),
      userTimeZone.value,
    );
  }

  eventForm.value = {
    name: template.name,
    venue: template.venue,
    tagType: (template.tagType as TagType) || "pokemon",
    tags: {
      ...createEmptyEventTags(),
      ...(template.tags as Partial<EventFormTags> | null),
    },
    maxParticipants: template.maxParticipants,
    participationFee: template.participationFee
      ? Number(template.participationFee)
      : 0,
    description: template.description || "",
    eventDate,
    registrationDeadline,
    requiresDecklist: template.requiresDecklist,
    status: "upcoming",
  };
}

async function deleteTemplate(template: EventTemplateData) {
  if (!confirm(t("eventWorkspace.confirmDeleteTemplate", { name: template.name }))) {
    return;
  }

  try {
    await $fetch(`/api/admin/event-templates?id=${template.id}`, {
      method: "DELETE",
    });
    await loadTemplates();
  } catch (err) {
    console.error("Failed to delete template:", err);
  }
}

async function onTemplateUpdated() {
  editingTemplate.value = null;
  showToast(t("eventWorkspace.templateUpdated"), "success");
  await loadTemplates();
}

async function copyRegistrationLink() {
  if (!registrationUrl.value) return;

  try {
    await navigator.clipboard.writeText(registrationUrl.value);
  } catch {
    const input = document.createElement("input");
    input.value = registrationUrl.value;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
  }

  linkCopied.value = true;
  window.setTimeout(() => {
    linkCopied.value = false;
  }, 2000);
}

async function saveEvent() {
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
      participationFee: eventForm.value.participationFee ? Number(eventForm.value.participationFee) : undefined,
      timeZone: userTimeZone.value,
    };

    if (props.eventId) {
      await $fetch(`/api/admin/custom-events?id=${props.eventId}`, {
        method: "PUT",
        body: eventData,
      });
      emit("saved");
    } else {
      const event = await $fetch<SavedEvent>("/api/admin/custom-events", {
        method: "POST",
        body: eventData,
      });
      createdEvent.value = event;
      emit("saved", event);
    }
  } catch (err) {
    console.error("Error saving event:", err);
    formError.value = getRequestErrorMessage(err, t("admin.eventsManager.saveError"));
  } finally {
    saving.value = false;
  }
}

async function saveAsTemplate() {
  if (!eventForm.value.eventDate) return;

  try {
    savingTemplate.value = true;
    formError.value = "";
    normalizeEventDateInput();
    syncVenueFromOrganization();
    syncOrganizationFromVenue();

    const eventDate = parseDateTimeLocalInput(eventForm.value.eventDate, userTimeZone.value);
    const weekday = eventDate.getDay();
    const eventTime = eventForm.value.eventDate.split("T")[1] || "18:00";

    let registrationDeadlineMinutesBefore: number | undefined;
    if (eventForm.value.registrationDeadline) {
      const deadlineDate = parseDateTimeLocalInput(eventForm.value.registrationDeadline, userTimeZone.value);
      registrationDeadlineMinutesBefore = Math.max(
        0,
        Math.round((eventDate.getTime() - deadlineDate.getTime()) / 60000),
      );
    }

    await $fetch("/api/admin/event-templates", {
      method: "POST",
      body: {
        name: eventForm.value.name,
        venue: eventForm.value.venue.trim(),
        tagType: eventForm.value.tagType,
        tags: {
          ...eventForm.value.tags,
          host: eventForm.value.tags.host?.trim() || undefined,
          format: eventForm.value.tags.format || "standard",
        },
        maxParticipants: eventForm.value.maxParticipants,
        participationFee: eventForm.value.participationFee ? Number(eventForm.value.participationFee) : undefined,
        description: eventForm.value.description || undefined,
        requiresDecklist: eventForm.value.requiresDecklist,
        weekday,
        eventTime,
        registrationDeadlineMinutesBefore,
        timeZone: userTimeZone.value,
      },
    });

    showToast(t("eventWorkspace.templateSaved"), "success");
  await loadTemplates();
    emit("templateSaved");
  } catch (err) {
    console.error("Error saving template:", err);
    formError.value = getRequestErrorMessage(err, t("eventWorkspace.templateSaveError"));
  } finally {
    savingTemplate.value = false;
  }
}

onMounted(async () => {
  loadVenueDirectory();
  if (props.eventId) {
    await loadEvent();
  } else {
    applyPrefill();
    await loadTemplates();
    loading.value = false;
  }
});
</script>
