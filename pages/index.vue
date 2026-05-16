<template>
  <div class="min-h-screen overflow-x-clip">
    <LandingBanner />

    <section class="mx-auto w-full max-w-6xl px-1 pt-2 pb-6 sm:px-4 lg:px-6 lg:pt-3">
      <div class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <!-- Unified Calendar Card Template (from Mock B) -->
        <article class="app-hero-surface min-w-0 overflow-hidden rounded-[1.8rem]">
          <div class="px-4 pt-5 pb-1 sm:px-5">
            <div class="flex items-center gap-2">
              <CalendarDaysIcon class="h-5 w-5 app-icon-accent" />
              <h2
                class="text-[1.35rem] font-bold tracking-[0.01em] app-text-primary sm:text-[1.45rem]"
              >
                {{ t("landingPage.headline") }}
              </h2>
            </div>
            <p class="app-hero-eyebrow mt-1 text-xs font-medium uppercase tracking-[0.16em]">
              Aktuelle Events
            </p>
          </div>
          <div class="px-1.5 pb-2.5 sm:px-3 sm:pb-3">
            <EventCalendarCard :show-mobile-auth-cta="false" />
          </div>
        </article>

        <aside class="app-panel min-w-0 rounded-[1.8rem] p-4 sm:p-5">
          <div class="px-0 pt-0 pb-1">
            <div class="flex items-center gap-2">
              <QueueListIcon class="h-5 w-5 app-icon-accent" />
              <h2 class="text-[1.35rem] font-bold tracking-[0.01em] app-text-primary sm:text-[1.45rem]">
                {{ t("landingPage.myEventsCompactTitle") }}
              </h2>
            </div>
            <p class="mt-1 text-xs font-medium uppercase tracking-[0.16em] app-text-muted-soft">
              {{ userName ? "Registriert und vorgemerkt" : "Persoenliche Eventliste" }}
            </p>
          </div>

          <MyEventsCompactPanel class="mt-3" />

          <div v-if="!userName" class="mt-4 grid grid-cols-1 gap-2">
            <NuxtLink
              to="/register"
              class="app-btn-primary inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-bold"
            >
              {{ t("nav.register") }}
            </NuxtLink>
            <NuxtLink
              to="/login"
              class="app-btn-neutral inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold"
            >
              {{ t("nav.login") }}
            </NuxtLink>
          </div>
        </aside>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  CalendarDaysIcon,
  QueueListIcon,
} from "@heroicons/vue/24/outline";
import EventCalendarCard from "~/components/landingPageCards/calendar/EventCalendarCard.vue";
import MyEventsCompactPanel from "~/components/landingPageCards/dashboard/MyEventsCompactPanel.vue";

const { userName } = useAuth();
const { t } = useI18n();
</script>
