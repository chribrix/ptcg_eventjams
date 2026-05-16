<template>
  <section class="mx-auto w-full max-w-6xl space-y-6">
    <div class="app-hero-surface rounded-[2rem] px-6 py-8 sm:px-8">
      <p class="app-hero-eyebrow text-xs font-semibold uppercase tracking-[0.32em]">
        Public Events
      </p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight app-text-primary sm:text-4xl">
        Pokemon TCG Events
      </h1>
      <p class="mt-3 max-w-2xl text-sm leading-6 app-text-secondary-soft sm:text-base">
        Finde kommende Events, filtere nach Typ und springe direkt in die passende Registrierung.
      </p>
    </div>
    <div class="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)]">
      <EventCalendarCard />
      <EventList />
    </div>
  </section>
</template>

<script setup lang="ts">
// Explicit component import due to nested folder structure
import EventCalendarCard from "~/components/landingPageCards/calendar/EventCalendarCard.vue";

definePageMeta({});
</script>
