<template>
  <main class="mx-auto min-h-screen max-w-3xl px-3 py-8">
    <article class="app-hero-surface rounded-2xl p-5">
      <div class="flex items-center justify-between gap-3">
        <h1 class="app-text-primary text-xl font-bold">Eventkalender</h1>
        <button class="app-btn-primary app-btn-sm" type="button" @click="showModal = true">Event anlegen</button>
      </div>
      <EventCalendarCard showcase-date="2026-11-01" :show-mobile-auth-cta="false" />
    </article>
    <EventEditModal v-if="showModal" :templates="templates" @close="showModal = false" @saved="showModal = false" />
  </main>
</template>

<script setup lang="ts">
import EventCalendarCard from "~/components/landingPageCards/calendar/EventCalendarCard.vue";
import EventEditModal from "~/components/EventEditModal.vue";
import type { AdminEventTemplate } from "~/components/events/eventTemplateForm";

if (!import.meta.dev) throw createError({ statusCode: 404 });
useHead({ title: "Event erstellen Vorschau | ChrispyJams" });
const showModal = ref(true);
const sampleTemplates: AdminEventTemplate[] = [
  { id: "locals", name: "Freitags-Locals", eventName: "Crow's and Owl's Locals", venue: "Herrngasse 379, 84028 Landshut", tagType: "pokemon", tags: { game: "Pokemon", type: "local_tournament", format: "standard" }, maxParticipants: 20, participationFee: 5, description: "", requiresDecklist: false, weekday: 5, eventTime: "18:30", registrationDeadlineMinutesBefore: 30 },
  { id: "cup", name: "Liga-Cup Samstag", eventName: "Crow's and Owl's League Cup", venue: "Herrngasse 379, 84028 Landshut", tagType: "pokemon", tags: { game: "Pokemon", type: "league_cup", format: "standard" }, maxParticipants: 32, participationFee: 15, description: "", requiresDecklist: true, weekday: 6, eventTime: "11:00", registrationDeadlineMinutesBefore: 60 },
  { id: "challenge", name: "Challenge Freitag", eventName: "Crow's and Owl's Challenge", venue: "Herrngasse 379, 84028 Landshut", tagType: "pokemon", tags: { game: "Pokemon", type: "league_challenge", format: "standard" }, maxParticipants: 24, participationFee: 8, description: "", requiresDecklist: true, weekday: 5, eventTime: "18:00", registrationDeadlineMinutesBefore: 45 },
];
const templates: AdminEventTemplate[] = [
  ...sampleTemplates,
  ...Array.from({ length: 57 }, (_, index) => ({
    ...sampleTemplates[index % sampleTemplates.length],
    id: `sample-${index + 1}`,
    name: `Beispielvorlage ${String(index + 1).padStart(2, "0")}`,
  })),
];
</script>
