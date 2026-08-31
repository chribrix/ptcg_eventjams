<template>
  <div class="min-h-screen app-bg-page flex items-center justify-center py-8">
    <div class="flex items-center gap-2 app-text-secondary-soft">
      <div
        class="w-4 h-4 border-2 app-border border-t-[var(--app-accent)] rounded-full animate-spin"
      ></div>
      <span>{{ t("bookingPage.loading") }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
// Booking management now lives on the canonical event workspace page (pages/events/[id].vue).
// This route only exists to redirect old links/bookmarks there.
const route = useRoute();
const bookingId = route.params.id as string;
const { t } = useI18n();

const { data } = await useFetch<{
  success: boolean;
  booking?: { event?: { id?: string } };
}>(`/api/bookings/${bookingId}`);

const eventId = data.value?.booking?.event?.id;

if (eventId) {
  await navigateTo(`/events/${eventId}`, { replace: true });
} else {
  await navigateTo("/dashboard", { replace: true });
}
</script>

