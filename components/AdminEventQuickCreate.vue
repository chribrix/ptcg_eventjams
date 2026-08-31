<template>
  <div v-if="isAdmin" class="app-panel rounded-2xl p-4 sm:p-5">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h2 class="app-heading-2">{{ t("eventWorkspace.adminQuickCreateTitle") }}</h2>
        <p class="app-meta-text mt-0.5">{{ t("eventWorkspace.adminQuickCreateSubtitle") }}</p>
      </div>
      <button type="button" @click="openCreate" class="app-btn-primary app-btn-md">
        <PlusIcon class="w-4 h-4" />
        {{ t("eventWorkspace.newEvent") }}
      </button>
    </div>

    <!-- Saved templates: 1-2 clicks to spin up the next occurrence -->
    <div class="mt-4">
      <h3 class="app-meta-text uppercase tracking-wide text-xs font-semibold mb-2">
        {{ t("eventWorkspace.savedTemplatesTitle") }}
      </h3>
      <p v-if="!templates.length" class="app-meta-text">
        {{ t("eventWorkspace.noTemplates") }}
      </p>
      <div v-else class="flex flex-wrap gap-2">
        <div
          v-for="template in templates"
          :key="template.id"
          class="flex items-center gap-2 rounded-xl border app-border app-surface-1 px-3 py-2"
        >
          <div class="min-w-0">
            <p class="app-heading-3 truncate">{{ template.name }}</p>
            <p class="app-meta-text">
              {{ weekdayLabel(template.weekday) }} · {{ template.eventTime }} · {{ template.venue }}
            </p>
          </div>
          <button
            type="button"
            @click="createFromTemplate(template)"
            class="app-btn-neutral app-btn-sm"
            :title="t('eventWorkspace.createFromTemplate')"
          >
            <BoltIcon class="w-4 h-4" />
          </button>
          <button
            type="button"
            @click="openEditTemplate(template)"
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
    </div>

    <EventEditModal
      v-if="showModal"
      :prefill="prefill"
      @close="showModal = false"
      @saved="onSaved"
      @template-saved="loadTemplates"
    />

    <EventTemplateEditModal
      v-if="editingTemplate"
      :template="editingTemplate"
      @close="editingTemplate = null"
      @saved="onTemplateUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { PlusIcon, BoltIcon, TrashIcon, PencilSquareIcon } from "@heroicons/vue/24/outline";
import { getUserTimeZone, formatDateTimeLocalInput } from "~/utils/eventDateTime";
import type { EventTemplateData } from "~/components/EventTemplateEditModal.vue";

interface EventTemplate {
  id: string;
  name: string;
  venue: string;
  tagType: string;
  tags: any;
  maxParticipants: number;
  participationFee: number | null;
  description: string | null;
  requiresDecklist: boolean;
  weekday: number;
  eventTime: string;
  registrationDeadlineMinutesBefore: number | null;
}

const emit = defineEmits<{ created: [] }>();
const { t, locale } = useI18n();
const { checkAdminStatus } = useAdmin();
const { showToast } = useToast();

const isAdmin = ref(false);
const templates = ref<EventTemplate[]>([]);
const showModal = ref(false);
const editingTemplate = ref<EventTemplateData | null>(null);
const prefill = ref<Record<string, any> | undefined>(undefined);
const userTimeZone = getUserTimeZone();

function weekdayLabel(weekday: number): string {
  // 2023-01-01 was a Sunday (weekday 0); offset from there to name any weekday.
  const referenceSunday = new Date(Date.UTC(2023, 0, 1));
  const d = new Date(referenceSunday);
  d.setUTCDate(d.getUTCDate() + weekday);
  return d.toLocaleDateString(locale.value.startsWith("de") ? "de-DE" : "en-US", {
    weekday: "long",
  });
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
  try {
    const response = await $fetch<{ templates: EventTemplate[] }>(
      "/api/admin/event-templates",
    );
    templates.value = response.templates || [];
  } catch (err) {
    console.error("Failed to load event templates:", err);
  }
}

function openCreate() {
  prefill.value = undefined;
  showModal.value = true;
}

function createFromTemplate(template: EventTemplate) {
  const nextDate = computeNextOccurrence(template.weekday, template.eventTime);
  const eventDate = formatDateTimeLocalInput(nextDate, userTimeZone);

  let registrationDeadline = "";
  if (template.registrationDeadlineMinutesBefore != null) {
    const deadline = new Date(
      nextDate.getTime() - template.registrationDeadlineMinutesBefore * 60 * 1000,
    );
    registrationDeadline = formatDateTimeLocalInput(deadline, userTimeZone);
  }

  prefill.value = {
    name: template.name,
    venue: template.venue,
    tagType: template.tagType,
    tags: template.tags || undefined,
    maxParticipants: template.maxParticipants,
    participationFee: template.participationFee ? Number(template.participationFee) : 0,
    description: template.description || "",
    requiresDecklist: template.requiresDecklist,
    eventDate,
    registrationDeadline,
  };
  showModal.value = true;
}

async function deleteTemplate(template: EventTemplate) {
  if (!confirm(t("eventWorkspace.confirmDeleteTemplate", { name: template.name }))) {
    return;
  }

  try {
    await $fetch(`/api/admin/event-templates?id=${template.id}`, { method: "DELETE" });
    await loadTemplates();
  } catch (err) {
    console.error("Failed to delete template:", err);
  }
}

function onSaved() {
  showModal.value = false;
  emit("created");
}

function openEditTemplate(template: EventTemplate) {
  editingTemplate.value = template as unknown as EventTemplateData;
}

async function onTemplateUpdated() {
  editingTemplate.value = null;
  showToast(t("eventWorkspace.templateUpdated"), "success");
  await loadTemplates();
}

onMounted(async () => {
  isAdmin.value = await checkAdminStatus();
  if (isAdmin.value) {
    await loadTemplates();
  }
});
</script>
