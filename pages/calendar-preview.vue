<template>
  <main class="mx-auto min-h-screen max-w-3xl px-2 py-6 sm:px-6">
    <p class="app-text-secondary-soft mb-3 px-3 text-sm">Designvorschau · {{ showcaseDate }} · Beispieldaten</p>
    <article class="app-hero-surface min-w-0 overflow-hidden rounded-[1.8rem]">
      <div class="px-4 pt-5 pb-1 sm:px-5">
        <h1 class="app-text-primary text-[1.35rem] font-bold">Eventkalender</h1>
        <p class="app-hero-eyebrow mt-1 text-xs font-medium uppercase tracking-[0.16em]">Aktuelle Events</p>
      </div>
      <div class="px-1.5 pb-2.5 sm:px-3 sm:pb-3">
        <EventCalendarCard :showcase-date="showcaseDate" :show-mobile-auth-cta="false" />
      </div>
    </article>
  </main>
</template>

<script setup lang="ts">
import EventCalendarCard from "~/components/landingPageCards/calendar/EventCalendarCard.vue";
if (!import.meta.dev) throw createError({ statusCode: 404 });
const dateQuery = useRoute().query.date;
const showcaseDate = typeof dateQuery === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateQuery)
  ? dateQuery : "2026-10-31";
useHead({ title: "Kalender Vorschau | ChrispyJams" });
</script>
