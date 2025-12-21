<template>
  <div>
    <!-- Main Content -->
    <div class="w-full">
      <!-- Mobile View with integrated tabs -->
      <div class="lg:hidden px-2">
        <!-- Unified Card with Tab Header -->
        <div
          class="rounded-3xl shadow-2xl h-[750px] flex flex-col w-full relative transition-all duration-500 ease-in-out"
          style="transition-property: background, border-color, box-shadow"
          :class="[
            activeTab === 'calendar'
              ? 'bg-gradient-to-br from-blue-50 via-white to-purple-50 border-2 border-blue-100 border-l-8 border-l-blue-600 border-t-8 border-t-blue-600'
              : 'bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-2 border-emerald-100 border-r-8 border-r-teal-700 border-t-8 border-t-teal-700',
          ]"
          :style="{
            boxShadow:
              activeTab === 'calendar'
                ? '0 20px 60px -10px rgba(59, 130, 246, 0.3), 0 10px 30px -5px rgba(147, 51, 234, 0.2)'
                : '0 20px 60px -10px rgba(16, 185, 129, 0.3), 0 10px 30px -5px rgba(20, 184, 166, 0.2)',
          }"
        >
          <!-- Tab Navigation as Card Header -->
          <div class="flex-shrink-0 mt-0.45">
            <div class="flex">
              <!-- Calendar Tab -->
              <button
                @click="activeTab = 'calendar'"
                :class="[
                  'flex items-center gap-3 font-semibold transition-all duration-300 ease-out min-h-[60px] relative',
                  activeTab === 'calendar'
                    ? 'flex-[3] bg-blue-600 text-white px-5 py-3 z-20'
                    : 'flex-1 bg-gray-50 text-gray-500 hover:bg-gray-100 px-4 py-2 z-10',
                ]"
                :style="
                  activeTab === 'calendar'
                    ? {
                        borderRadius: '1rem 0.25rem 0.25rem 0',
                        boxShadow:
                          '0 10px 40px -5px rgba(59, 130, 246, 0.5), 0 20px 60px -10px rgba(147, 51, 234, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
                      }
                    : { borderRadius: '1rem 0 0 1rem' }
                "
              >
                <CalendarDaysIcon
                  :class="[
                    'flex-shrink-0 transition-all duration-300',
                    activeTab === 'calendar' ? 'w-5 h-5' : 'w-4 h-4',
                  ]"
                />
                <span
                  :class="[
                    'transition-all duration-300',
                    activeTab === 'calendar'
                      ? 'text-base font-bold'
                      : 'text-xs font-medium',
                  ]"
                >
                  {{ activeTab === "calendar" ? "Event Calendar" : "Calendar" }}
                </span>
              </button>

              <!-- Registrations Tab (only when logged in) -->
              <button
                v-if="userName"
                @click="activeTab = 'registrations'"
                :class="[
                  'flex items-center gap-3 font-semibold transition-all duration-300 ease-out min-h-[60px] relative',
                  activeTab === 'registrations'
                    ? 'flex-[3] bg-teal-700 text-white px-5 py-3 z-20'
                    : 'flex-1 bg-gray-50 text-gray-500 hover:bg-gray-100 px-4 py-2 z-10',
                ]"
                :style="
                  activeTab === 'registrations'
                    ? {
                        borderRadius: '0.25rem 1rem 0 0.25rem',
                        boxShadow:
                          '0 10px 40px -5px rgba(16, 185, 129, 0.5), 0 20px 60px -10px rgba(20, 184, 166, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
                      }
                    : { borderRadius: '0 1rem 1rem 0' }
                "
              >
                <span
                  :class="[
                    'transition-all duration-300',
                    activeTab === 'registrations'
                      ? 'text-base font-bold'
                      : 'text-xs font-medium',
                  ]"
                >
                  {{
                    activeTab === "registrations"
                      ? "My Registrations"
                      : "My Events"
                  }}
                </span>
                <!-- When calendar is active and user has registrations: show count badge -->
                <span
                  v-if="activeTab === 'calendar' && registrationsCount > 0"
                  class="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-bold bg-teal-600 text-white shadow-sm"
                >
                  {{ registrationsCount }}
                </span>
                <!-- Otherwise, always show UserCircleIcon -->
                <UserCircleIcon
                  v-else
                  :class="[
                    'flex-shrink-0 transition-all duration-300',
                    activeTab === 'registrations' ? 'w-5 h-5' : 'w-4 h-4',
                  ]"
                />
              </button>
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
                  class="p-5 h-full flex flex-col absolute inset-0"
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
          class="rounded-3xl shadow-2xl overflow-hidden h-[calc(100vh-120px)] flex flex-col w-full relative transition-all duration-500 ease-in-out bg-gradient-to-br from-blue-50 via-white to-purple-50 border-2 border-blue-100 border-l-8 border-l-blue-600"
          style="
            box-shadow: 0 20px 60px -10px rgba(59, 130, 246, 0.3),
              0 10px 30px -5px rgba(147, 51, 234, 0.2);
          "
        >
          <!-- Calendar Header -->
          <div class="flex-shrink-0">
            <div class="p-2">
              <div
                class="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-700 text-white relative"
                style="
                  border-radius: 1rem 0.25rem 0.25rem 1rem;
                  box-shadow: 0 10px 40px -5px rgba(59, 130, 246, 0.5),
                    0 20px 60px -10px rgba(147, 51, 234, 0.4),
                    0 4px 6px -2px rgba(0, 0, 0, 0.1),
                    inset 0 2px 4px 0 rgba(255, 255, 255, 0.2);
                "
              >
                <CalendarDaysIcon class="w-5 h-5 flex-shrink-0" />
                <span class="text-base font-bold">Event Calendar</span>
              </div>
            </div>
          </div>
          <!-- Calendar Content -->
          <div class="flex-1 overflow-auto">
            <div class="p-5 h-full">
              <EventCalendarCard />
            </div>
          </div>
        </div>

        <!-- User Dashboard or Welcome Card -->
        <div
          v-if="userName"
          class="rounded-3xl shadow-2xl overflow-hidden h-[calc(100vh-120px)] flex flex-col w-full relative transition-all duration-500 ease-in-out bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-2 border-emerald-100 border-r-8 border-r-teal-700"
          style="
            box-shadow: 0 20px 60px -10px rgba(16, 185, 129, 0.3),
              0 10px 30px -5px rgba(20, 184, 166, 0.2);
          "
        >
          <!-- Registrations Header -->
          <div class="flex-shrink-0">
            <div class="p-2">
              <div
                class="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white relative"
                style="
                  border-radius: 0.25rem 1rem 1rem 0.25rem;
                  box-shadow: 0 10px 40px -5px rgba(16, 185, 129, 0.5),
                    0 20px 60px -10px rgba(20, 184, 166, 0.4),
                    0 4px 6px -2px rgba(0, 0, 0, 0.1),
                    inset 0 2px 4px 0 rgba(255, 255, 255, 0.2);
                "
              >
                <UserCircleIcon class="w-5 h-5 flex-shrink-0" />
                <span class="text-base font-bold">My Registrations</span>
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

      <!-- Mobile View for non-logged users - Single Calendar Card -->
      <div v-if="!userName" class="lg:hidden px-2 py-2">
        <div
          class="bg-white rounded-3xl shadow-2xl border-2 border-blue-100 overflow-hidden h-[750px] flex flex-col w-full"
        >
          <!-- Simple Header for non-logged users -->
          <div class="flex-shrink-0 p-2">
            <div
              class="bg-gradient-to-r from-blue-600 to-purple-700 text-white px-5 py-4 rounded-2xl"
            >
              <div class="flex items-center gap-3">
                <CalendarDaysIcon class="w-6 h-6 flex-shrink-0" />
                <div class="text-left flex-1">
                  <div class="text-base font-bold leading-tight">
                    Event Calendar
                  </div>
                  <div class="text-xs text-blue-100 leading-tight mt-0.5">
                    Discover tournaments
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Content -->
          <div class="p-5 flex-1 overflow-hidden flex flex-col">
            <div class="h-full">
              <EventCalendarCard />
            </div>
          </div>
        </div>
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

const userName = ref<string | null>(null);
const activeTab = ref<"calendar" | "registrations">("calendar");
const previousTab = ref<"calendar" | "registrations">("calendar");
const registrationsCount = ref<number>(0);
const supabase = useSupabaseClient();

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

onMounted(async () => {
  const { data: session } = await supabase.auth.getSession();
  if (session?.session) {
    userName.value =
      session.session.user.user_metadata.name || session.session.user.email;

    // Fetch registrations count
    try {
      const response = await $fetch("/api/dashboard/registrations");
      if (response && response.data && Array.isArray(response.data)) {
        registrationsCount.value = response.data.length;
      }
    } catch (error) {
      console.error("Failed to fetch registrations count:", error);
    }
  }
});
</script>
