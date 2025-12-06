<template>
  <div>
    <!-- Hero Section -->
    <div class="relative overflow-hidden">
      <!-- No additional background needed - inherits from layout -->

      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div class="text-center">
          <!-- Main Heading -->
          <div class="flex justify-center items-center mb-2">
            <SparklesIcon class="w-6 h-6 md:w-7 md:h-7 text-yellow-500 mr-3" />
            <h1
              class="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight"
            >
              PTCG Event
              <span
                class="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              >
                Jams
              </span>
            </h1>
          </div>
          <p
            class="text-base md:text-lg text-gray-600 mb-4 max-w-2xl mx-auto leading-relaxed"
          >
            Discover, register, and participate in Pokemon TCG tournaments
            worldwide. Connect with the community and compete in style.
          </p>
          <!-- Feature Highlights -->
          <!--<div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div
              class="group bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300"
            >
              <div
                class="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300"
              >
                <CalendarDaysIcon class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-lg font-semibold text-white mb-2">
                Event Discovery
              </h3>
              <p class="text-blue-100 text-sm leading-relaxed">
                Browse tournaments with our interactive calendar and find events
                that match your schedule
              </p>
            </div>

            <div
              class="group bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300"
            >
              <div
                class="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300"
              >
                <DocumentTextIcon class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-lg font-semibold text-white mb-2">
                Smart Registration
              </h3>
              <p class="text-blue-100 text-sm leading-relaxed">
                Streamlined registration with flexible decklist management and
                status tracking
              </p>
            </div>

            <div
              class="group bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300"
            >
              <div
                class="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300"
              >
                <UsersIcon class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-lg font-semibold text-white mb-2">
                Community Hub
              </h3>
              <p class="text-blue-100 text-sm leading-relaxed">
                Connect with fellow players and see who's participating in your
                events
              </p>
            </div>
          </div> -->
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="w-full max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div
        class="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 xl:scale-110 origin-top"
      >
        <!-- Event Calendar Card -->
        <div
          class="group bg-white rounded-3xl shadow-2xl border-2 border-blue-100 overflow-hidden hover:shadow-3xl hover:border-blue-200 transition-all duration-300 transform hover:scale-[1.02] h-[750px] flex flex-col w-full"
        >
          <div
            class="bg-gradient-to-r from-blue-600 to-purple-700 px-5 py-6 sm:px-10 sm:py-10 flex-shrink-0"
          >
            <div class="flex items-center">
              <div
                class="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 rounded-xl flex items-center justify-center mr-4 sm:mr-5 group-hover:scale-110 transition-transform duration-300"
              >
                <CalendarDaysIcon class="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h2 class="text-2xl sm:text-3xl font-bold text-white">
                  Event Calendar
                </h2>
                <p class="text-blue-100 text-sm sm:text-base">
                  Discover upcoming tournaments
                </p>
              </div>
            </div>
          </div>
          <div class="p-5 sm:p-10 flex-1 overflow-hidden flex flex-col">
            <div class="h-full">
              <EventCalendarCard />
            </div>
          </div>
        </div>

        <!-- User Dashboard or Welcome Card -->
        <div
          v-if="userName"
          class="group bg-white rounded-3xl shadow-2xl border-2 border-emerald-100 overflow-hidden hover:shadow-3xl hover:border-emerald-200 transition-all duration-300 transform hover:scale-[1.02] h-[750px] flex flex-col w-full"
        >
          <div
            class="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-6 sm:px-10 sm:py-10 flex-shrink-0"
          >
            <div class="flex items-center">
              <div
                class="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 rounded-xl flex items-center justify-center mr-4 sm:mr-5 group-hover:scale-110 transition-transform duration-300"
              >
                <UserCircleIcon class="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h2 class="text-2xl sm:text-3xl font-bold text-white">
                  My Registrations
                </h2>
                <p class="text-emerald-100 text-sm sm:text-base">
                  Welcome back, {{ userName }}!
                </p>
              </div>
            </div>
          </div>
          <div class="p-5 sm:p-10 flex-1 overflow-hidden flex flex-col">
            <div class="h-full">
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
import EventCalendarCard from "~/components/landingPageCards/calendar/EventCalendarCardNew.vue";
import EventMiniDashboardCard from "~/components/landingPageCards/dashboard/EventMiniDashboardCard.vue";
import GetStartedCard from "~/components/landingPageCards/GetStartedCard.vue";

const userName = ref<string | null>(null);
const supabase = useSupabaseClient();

onMounted(async () => {
  const { data: session } = await supabase.auth.getSession();
  if (session?.session) {
    userName.value =
      session.session.user.user_metadata.name || session.session.user.email;
  }
});
</script>
