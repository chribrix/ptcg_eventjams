<template>
  <div class="min-h-screen overflow-x-clip">
    <LandingBanner />

    <section class="mx-auto w-full max-w-6xl px-3 pt-2 pb-6 sm:px-4 lg:px-6 lg:pt-3">
      <div class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <!-- Unified Calendar Card Template (from Mock B) -->
        <article class="min-w-0 rounded-[1.8rem] border border-[#404857] bg-[#2f3136] overflow-hidden shadow-[0_24px_65px_-35px_rgba(0,0,0,0.9)]">
          <div class="px-5 pt-5 pb-2">
            <p class="text-base font-bold uppercase tracking-[0.18em] text-emerald-300">{{ t("landingPage.calendarEyebrow") }}</p>
            <p class="mt-2 text-sm text-gray-300">{{ t("landingPage.subline") }}</p>
          </div>
          <div class="px-3 pb-3">
            <EventCalendarCard :show-mobile-auth-cta="false" />
          </div>
        </article>

        <aside class="min-w-0 rounded-[1.8rem] border border-[#404857] bg-[#2f3136] p-5">
          <div class="px-0 pt-0 pb-2">
            <p class="text-base font-bold uppercase tracking-[0.18em] text-amber-300">{{ t("landingPage.mockEditorialEyebrow") }}</p>
            <p class="mt-1 text-sm text-gray-300">
              {{ userName ? t("landingPage.sideTextLoggedIn") : t("landingPage.sideText") }}
            </p>
          </div>

          <MyEventsCompactPanel v-if="userName" class="mt-4" />

          <div v-else class="mt-4 grid grid-cols-1 gap-2">
            <NuxtLink
              to="/register"
              class="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-bold text-white"
            >
              {{ t("nav.register") }}
            </NuxtLink>
            <NuxtLink
              to="/login"
              class="inline-flex items-center justify-center rounded-xl border border-[#596172] bg-[#3a4150] px-4 py-3 text-sm font-semibold text-gray-100"
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
import EventCalendarCard from "~/components/landingPageCards/calendar/EventCalendarCard.vue";
import MyEventsCompactPanel from "~/components/landingPageCards/dashboard/MyEventsCompactPanel.vue";

const { userName } = useAuth();
const { t } = useI18n();
</script>
