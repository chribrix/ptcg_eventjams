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

    <EventEditModal
      v-if="showModal"
      @close="showModal = false"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { PlusIcon } from "@heroicons/vue/24/outline";

const emit = defineEmits<{ created: [] }>();
const { t } = useI18n();
const { checkAdminStatus } = useAdmin();

const isAdmin = ref(false);
const showModal = ref(false);

function openCreate() {
  showModal.value = true;
}

function onSaved() {
  emit("created");
}

onMounted(async () => {
  isAdmin.value = await checkAdminStatus();
});
</script>
