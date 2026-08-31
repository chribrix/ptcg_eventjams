<template>
  <div
    class="fixed inset-0 app-overlay flex items-center justify-center p-4 z-50"
    @click.self="$emit('close')"
  >
    <div
      class="app-modal-surface rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      @click.stop
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="app-heading-2">{{ t("eventWorkspace.editTemplate") }}</h3>
        <button type="button" @click="$emit('close')" class="app-btn-neutral app-btn-sm">
          &times;
        </button>
      </div>

      <form @submit.prevent="saveTemplate" class="space-y-4">
        <div v-if="formError" class="app-feedback-danger rounded-lg p-3 text-sm">
          {{ formError }}
        </div>

        <div>
          <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
            {{ t("admin.eventsManager.eventName") }} *
          </label>
          <input v-model="form.name" type="text" required class="app-input px-4 py-3" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
              {{ t("admin.eventsManager.gameCategory") }} *
            </label>
            <select v-model="form.tagType" required class="app-input px-4 py-3">
              <option value="pokemon">Pokémon</option>
              <option value="riftbound">Riftbound</option>
              <option value="generic">{{ t("admin.eventsManager.genericGame") }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
              {{ t("admin.eventsManager.game") }} *
            </label>
            <input v-model="form.tags.game" type="text" required class="app-input px-4 py-3" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
            {{ t("admin.eventsManager.format") }}
          </label>
          <select v-model="form.tags.format" class="app-input px-4 py-3">
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
          <select v-model="form.tags.type" required class="app-input px-4 py-3">
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
              v-model="form.tags.host"
              type="text"
              class="app-input px-4 py-3"
              list="template-edit-host-options"
              @change="syncVenueFromOrganization"
              @blur="syncVenueFromOrganization"
            />
            <datalist id="template-edit-host-options">
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
              v-model="form.venue"
              type="text"
              required
              class="app-input px-4 py-3"
              list="template-edit-venue-options"
              @change="syncOrganizationFromVenue"
              @blur="syncOrganizationFromVenue"
            />
            <datalist id="template-edit-venue-options">
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
              v-model.number="form.maxParticipants"
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
              v-model.number="form.participationFee"
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
              {{ t("eventWorkspace.weekday") }} *
            </label>
            <select v-model.number="form.weekday" required class="app-input px-4 py-3">
              <option v-for="(label, index) in weekdayLabels" :key="index" :value="index">
                {{ label }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
              {{ t("eventWorkspace.eventTime") }} *
            </label>
            <input v-model="form.eventTime" type="time" required class="app-input px-4 py-3" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
            {{ t("eventWorkspace.registrationDeadlineMinutesBefore") }}
          </label>
          <input
            v-model.number="form.registrationDeadlineMinutesBefore"
            type="number"
            min="0"
            step="5"
            class="app-input px-4 py-3"
          />
        </div>

        <div>
          <label class="block text-sm font-semibold app-text-secondary-soft mb-2">
            {{ t("common.description") }}
          </label>
          <textarea v-model="form.description" class="app-input px-4 py-3" rows="3"></textarea>
        </div>

        <div>
          <label class="flex items-start gap-3 cursor-pointer">
            <input v-model="form.requiresDecklist" type="checkbox" class="mt-0.5 w-4 h-4 rounded" />
            <span class="text-sm font-medium app-text-strong">
              {{ t("events.requiresDecklist") }}
            </span>
          </label>
        </div>

        <div class="flex flex-wrap gap-3 pt-2">
          <button type="button" @click="$emit('close')" class="app-btn-neutral app-btn-md flex-1">
            {{ t("common.cancel") }}
          </button>
          <button type="submit" :disabled="saving" class="app-btn-primary app-btn-md flex-1 disabled:opacity-50">
            {{ saving ? t("admin.eventsManager.saving") : t("eventWorkspace.updateTemplate") }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FORMAT_OPTIONS, type TagType } from "~/types/eventTags";

interface TemplateTags {
  type?: string;
  game: string;
  format?: string;
  host?: string;
}

export interface EventTemplateData {
  id: string;
  name: string;
  venue: string;
  tagType: string;
  tags: Record<string, unknown> | null;
  maxParticipants: number;
  participationFee: number | string | null;
  description: string | null;
  requiresDecklist: boolean;
  weekday: number;
  eventTime: string;
  registrationDeadlineMinutesBefore: number | null;
}

interface VenueDirectoryEntry {
  id: string;
  organizationName: string;
  venueName: string;
}

const props = defineProps<{ template: EventTemplateData }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const { t, locale } = useI18n();

const saving = ref(false);
const formError = ref("");
const venueDirectory = ref<VenueDirectoryEntry[]>([]);

const weekdayLabels = computed<string[]>(() => {
  const labels = t("common.weekdays");
  return Array.isArray(labels)
    ? labels
    : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
});

const form = ref({
  name: props.template.name,
  venue: props.template.venue,
  tagType: (props.template.tagType as TagType) || "pokemon",
  tags: {
    type: (props.template.tags?.type as string) || "custom",
    game: (props.template.tags?.game as string) || "Pokemon",
    format: (props.template.tags?.format as string) || "standard",
    host: (props.template.tags?.host as string) || "",
  } as TemplateTags,
  maxParticipants: props.template.maxParticipants,
  participationFee: props.template.participationFee ? Number(props.template.participationFee) : 0,
  description: props.template.description || "",
  requiresDecklist: props.template.requiresDecklist,
  weekday: props.template.weekday,
  eventTime: props.template.eventTime,
  registrationDeadlineMinutesBefore: props.template.registrationDeadlineMinutesBefore ?? undefined,
});

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
  const entry = findVenueEntryByOrganization(form.value.tags.host);
  if (entry) form.value.venue = entry.venueName;
};

const syncOrganizationFromVenue = () => {
  const entry = findVenueEntryByVenueName(form.value.venue);
  if (entry) form.value.tags.host = entry.organizationName;
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

async function saveTemplate() {
  try {
    saving.value = true;
    formError.value = "";
    syncVenueFromOrganization();
    syncOrganizationFromVenue();

    await $fetch(`/api/admin/event-templates?id=${props.template.id}`, {
      method: "PUT",
      body: {
        name: form.value.name,
        venue: form.value.venue.trim(),
        tagType: form.value.tagType,
        tags: {
          ...form.value.tags,
          host: form.value.tags.host?.trim() || undefined,
          format: form.value.tags.format || "standard",
        },
        maxParticipants: form.value.maxParticipants,
        participationFee: form.value.participationFee ? Number(form.value.participationFee) : undefined,
        description: form.value.description || undefined,
        requiresDecklist: form.value.requiresDecklist,
        weekday: form.value.weekday,
        eventTime: form.value.eventTime,
        registrationDeadlineMinutesBefore: form.value.registrationDeadlineMinutesBefore,
      },
    });

    emit("saved");
  } catch (err) {
    console.error("Error updating template:", err);
    formError.value = getRequestErrorMessage(err, t("eventWorkspace.templateUpdateError"));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadVenueDirectory();
});
</script>
