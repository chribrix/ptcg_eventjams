<template>
  <div v-if="isAdmin" class="shrink-0">
    <button type="button" class="app-btn-primary app-btn-sm whitespace-nowrap" @click="openCreate">
      <PlusIcon class="h-4 w-4" />
      {{ t("eventWorkspace.adminQuickCreateTitle") }}
    </button>

    <EventEditModal
      v-if="showModal"
      :templates="templates"
      @close="showModal = false"
      @saved="onSaved"
      @template-saved="loadTemplates"
    />
  </div>
</template>

<script setup lang="ts">
import { PlusIcon } from "@heroicons/vue/24/outline";
import type { AdminEventTemplate } from "~/components/events/eventTemplateForm";

const emit = defineEmits<{ created: [] }>();
const { t } = useI18n();
const { checkAdminStatus } = useAdmin();
const isAdmin = ref(false);
const showModal = ref(false);
const templates = ref<AdminEventTemplate[]>([]);

async function loadTemplates() {
  try {
    const response = await $fetch<{ templates: AdminEventTemplate[] }>("/api/admin/event-templates");
    templates.value = response.templates || [];
  } catch {
    templates.value = [];
  }
}

async function openCreate() {
  showModal.value = true;
  await loadTemplates();
}

function onSaved() {
  showModal.value = false;
  emit("created");
}

onMounted(async () => {
  isAdmin.value = await checkAdminStatus();
});
</script>
