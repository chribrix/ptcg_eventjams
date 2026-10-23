<template>
  <main class="min-h-screen app-bg-page grid place-items-center p-6">
    <AppStatePanel
      v-if="errorMessage"
      kind="error"
      title="Turnierzugang nicht gefunden"
      :message="errorMessage"
    />
    <AppStatePanel v-else kind="loading" message="Turnierzugang wird geöffnet …" />
  </main>
</template>

<script setup lang="ts">
definePageMeta({ layout: false });

const route = useRoute();
const errorMessage = ref("");

onMounted(async () => {
  try {
    const code = String(route.params.code || "");
    const result = await $fetch<{ eventId: string }>(`/api/tournament-enrollment/${encodeURIComponent(code)}`);
    await navigateTo(`/tournaments/${result.eventId}`);
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || "Bitte prüfe den Link oder melde dich beim Veranstalter.";
  }
});
</script>
