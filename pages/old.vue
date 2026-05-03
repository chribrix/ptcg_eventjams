<template>
  <div>
    <LandingBanner />

    <!-- Main Content -->
    <div class="w-full">
      <!-- Mobile View with integrated tabs -->
      <div class="lg:hidden px-2">
        <!-- Unified Card with Tab Header -->
        <div
          class="mobile-landing-card rounded-[1.85rem] h-[760px] flex flex-col w-full relative overflow-hidden bg-[#2f3136] border border-[#3f4552]/80 shadow-[0_18px_46px_-26px_rgba(0,0,0,0.85)]"
        >
          <!-- Tab Navigation as Card Header -->
          <div v-if="userName" class="flex-shrink-0 p-3 pb-2">
            <div class="grid grid-cols-2 gap-2 rounded-2xl border border-[#454b58] bg-[#363b47] p-1">
              <!-- Calendar Tab -->
              <button
                @click="activeTab = 'calendar'"
                :class="[
                  'flex items-center justify-center gap-2 font-semibold rounded-xl px-4 py-2.5 transition-all duration-200',
                  activeTab === 'calendar'
                    ? 'bg-gradient-to-r from-[#1d2a3f] to-[#111a2f] text-white shadow-[0_8px_22px_-14px_rgba(0,0,0,0.9)]'
                    : 'text-gray-300 hover:bg-[#4f545c]',
                ]"
              >
                <CalendarDaysIcon
                  :class="[
                    'flex-shrink-0 transition-all duration-200',
                    activeTab === 'calendar' ? 'w-5 h-5' : 'w-4 h-4',
                  ]"
                />
                <span
                  :class="[
                    'transition-all duration-200',
                    activeTab === 'calendar' ? 'text-sm font-bold' : 'text-xs font-medium',
                  ]"
                >
                  {{
                    activeTab === "calendar"
                      ? t("landingPage.calendarTitle")
                      : t("landingPage.calendarShort")
                  }}
                </span>
              </button>

              <!-- Registrations Tab (only when logged in) -->
              <button
                v-if="userName"
                @click="activeTab = 'registrations'"
                :class="[
                  'flex items-center justify-center gap-2 font-semibold rounded-xl px-4 py-2.5 transition-all duration-200',
                  activeTab === 'registrations'
                    ? 'bg-gradient-to-r from-[#1d2a3f] to-[#111a2f] text-white shadow-[0_8px_22px_-14px_rgba(0,0,0,0.9)]'
                    : 'text-gray-300 hover:bg-[#4f545c]',
                ]"
              >
                <span
                  :class="[
                    'transition-all duration-200',
                    activeTab === 'registrations'
                      ? 'text-sm font-bold'
                      : 'text-xs font-medium',
                  ]"
                >
                  {{
                    activeTab === "registrations"
                      ? t("landingPage.myRegistrations")
                      : t("landingPage.myEvents")
                  }}
                </span>
                <!-- When calendar is active and user has registrations: show count badge -->
                <span
                  v-if="activeTab === 'calendar' && registrationsCount > 0"
                  class="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-bold bg-green-600 text-white shadow-sm"
                >
                  {{ registrationsCount }}
                </span>
                <!-- Otherwise, always show UserCircleIcon -->
                <UserCircleIcon
                  v-else
                  :class="[
                    'flex-shrink-0 transition-all duration-200',
                    activeTab === 'registrations' ? 'w-5 h-5' : 'w-4 h-4',
                  ]"
                />
              </button>
            </div>
          </div>

          <div v-else class="flex-shrink-0 px-4 pt-3 pb-1">
            <div class="rounded-2xl border border-[#3e4c63] bg-gradient-to-r from-[#1d2a3f] to-[#111a2f] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div class="flex items-center gap-3">
                <div class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-700/70">
                  <CalendarDaysIcon class="h-5 w-5 text-white" />
                </div>
                <div>
                  <p class="text-lg font-extrabold text-white leading-tight">
                    {{ t("landingPage.calendarTitle") }}
                  </p>
                  <p class="text-xs text-gray-300">{{ t("landingPage.calendarSubtitle") }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Card Content with Slide Transition -->
          <div
            class="flex-1 overflow-hidden relative"
            @touchstart="handleTouchStart"
            @touchend="handleTouchEnd"
          >
            <div class="h-full relative">
              <TransitionGroup
                enter-active-class="transition-transform duration-300 ease-out"
                leave-active-class="transition-transform duration-300 ease-out absolute inset-0"
                :enter-from-class="
                  slideFromLeft ? '-translate-x-full' : 'translate-x-full'
                "
                enter-to-class="translate-x-0"
                :leave-to-class="
                  slideFromLeft ? 'translate-x-full' : '-translate-x-full'
                "
                leave-from-class="translate-x-0"
              >
                <div
                  v-if="activeTab === 'calendar'"
                  key="calendar"
                  class="p-3 h-full flex flex-col absolute inset-0"
                >
                  <div class="h-full">
                    <EventCalendarCard />
                  </div>
                </div>
                <div
                  v-else-if="activeTab === 'registrations' && userName"
                  key="registrations"
                  class="p-5 h-full flex flex-col absolute inset-0"
                >
                  <div class="h-full">
                    <EventMiniDashboardCard />
                  </div>
                </div>
              </TransitionGroup>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop View (both cards side by side) -->
      <div class="hidden lg:grid grid-cols-2 gap-4 px-2 py-2">
        <!-- Event Calendar Card -->
        <div
          class="rounded-3xl shadow-2xl overflow-hidden h-[calc(100vh-120px)] flex flex-col w-full relative transition-all duration-500 ease-in-out bg-[#2f3136] border-2 border-[#202225] border-l-8 border-l-gray-800"
          style="
            box-shadow:
              0 20px 60px -10px rgba(0, 0, 0, 0.2),
              0 10px 30px -5px rgba(0, 0, 0, 0.15);
          "
        >
          <!-- Calendar Header -->
          <div
            class="flex min-h-[128px] items-center gap-4 bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-5 text-white"
          >
            <div
              class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-600/70"
            >
              <CalendarDaysIcon class="h-8 w-8" />
            </div>
            <div>
              <p class="text-4xl font-extrabold leading-tight">
                {{ t("landingPage.calendarTitle") }}
              </p>
              <p class="mt-2 text-xl text-gray-200">
                {{ t("landingPage.calendarSubtitle") }}
              </p>
            </div>
          </div>
          <!-- Calendar Content -->
          <div class="flex-1 overflow-auto">
            <div class="p-4 h-full">
              <EventCalendarCard />
            </div>
          </div>
        </div>

        <!-- User Dashboard or Welcome Card -->
        <div
          v-if="userName"
          class="rounded-3xl shadow-2xl overflow-hidden h-[calc(100vh-120px)] flex flex-col w-full relative transition-all duration-500 ease-in-out bg-[#2f3136] border-2 border-[#202225] border-r-8 border-r-gray-900"
          style="
            box-shadow:
              0 20px 60px -10px rgba(0, 0, 0, 0.2),
              0 10px 30px -5px rgba(0, 0, 0, 0.15);
          "
        >
          <!-- Registrations Header -->
          <div class="flex-shrink-0">
            <div class="p-2">
              <div
                class="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white relative"
                style="
                  border-radius: 0.25rem 1rem 1rem 0.25rem;
                  box-shadow:
                    0 10px 40px -5px rgba(0, 0, 0, 0.3),
                    0 20px 60px -10px rgba(0, 0, 0, 0.2),
                    0 4px 6px -2px rgba(0, 0, 0, 0.1),
                    inset 0 2px 4px 0 rgba(255, 255, 255, 0.2);
                "
              >
                <UserCircleIcon class="w-5 h-5 flex-shrink-0" />
                <span class="text-base font-bold">{{
                  t("landingPage.myRegistrations")
                }}</span>
              </div>
            </div>
          </div>
          <!-- Registrations Content -->
          <div class="flex-1 overflow-auto">
            <div class="p-5 h-full">
              <EventMiniDashboardCard />
            </div>
          </div>
        </div>

        <!-- Getting Started Card (for non-logged users) -->
        <GetStartedCard v-else />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  SparklesIcon,
  CalendarIcon,
  ArrowRightIcon,
  UserIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  UsersIcon,
  UserCircleIcon,
} from "@heroicons/vue/24/outline";

// Explicit component imports due to nested folder structure
import EventCalendarCard from "~/components/landingPageCards/calendar/EventCalendarCard.vue";
import EventMiniDashboardCard from "~/components/landingPageCards/dashboard/EventMiniDashboardCard.vue";
import GetStartedCard from "~/components/landingPageCards/GetStartedCard.vue";

const { userName, user, ensureValidSession } = useAuth();
const { t } = useI18n();
const activeTab = ref<"calendar" | "registrations">("calendar");
const previousTab = ref<"calendar" | "registrations">("calendar");
const registrationsCount = ref<number>(0);
const sessionReady = ref(false);

// Touch gesture tracking
const touchStartX = ref(0);
const touchEndX = ref(0);

// Watch for tab changes to track direction
watch(activeTab, (newTab, oldTab) => {
  previousTab.value = oldTab;
});

// Compute slide direction based on tab change
const slideFromLeft = computed(() => {
  // Calendar -> Registrations: slide from left
  // Registrations -> Calendar: slide from right
  return (
    previousTab.value === "calendar" && activeTab.value === "registrations"
  );
});

// Touch event handlers for swipe gestures
const handleTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.touches[0].clientX;
};

const handleTouchEnd = (e: TouchEvent) => {
  touchEndX.value = e.changedTouches[0].clientX;
  handleSwipe();
};

const handleSwipe = () => {
  const swipeThreshold = 50; // Minimum distance for swipe
  const diff = touchStartX.value - touchEndX.value;

  if (Math.abs(diff) > swipeThreshold) {
    if (diff > 0 && userName.value) {
      // Swiped left: go to registrations
      activeTab.value = "registrations";
    } else if (diff < 0) {
      // Swiped right: go to calendar
      activeTab.value = "calendar";
    }
  }
};

watch(
  userName,
  async (newUserName) => {
    if (!sessionReady.value) return;

    if (newUserName) {
      // Fetch registrations count
      try {
        const response = await $fetch("/api/dashboard/registrations");
        if (response && response.data && Array.isArray(response.data)) {
          registrationsCount.value = response.data.length;
        }
      } catch (error) {
        console.error("Failed to fetch registrations count:", error);
      }
    } else {
      registrationsCount.value = 0;
    }
  },
  { immediate: true },
);

onMounted(async () => {
  if (user.value) {
    await ensureValidSession();
  }
  sessionReady.value = true;
});
</script>
