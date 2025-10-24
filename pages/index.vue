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

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <NuxtLink
              to="/events"
              class="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <CalendarIcon class="w-4 h-4 mr-2 group-hover:animate-pulse" />
              Browse Events
              <ArrowRightIcon
                class="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform"
              />
            </NuxtLink>
            <NuxtLink
              v-if="!userName"
              to="/login"
              class="group inline-flex items-center px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 transition-all duration-200"
            >
              <UserIcon class="w-4 h-4 mr-2" />
              Get Started
            </NuxtLink>
          </div>

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
    <div class="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-8 scale-110 origin-top">
        <!-- Event Calendar Card -->
        <div
          class="group bg-white rounded-3xl shadow-2xl border-2 border-blue-100 overflow-hidden hover:shadow-3xl hover:border-blue-200 transition-all duration-300 transform hover:scale-[1.02] h-[750px] flex flex-col"
        >
          <div
            class="bg-gradient-to-r from-blue-600 to-purple-700 px-10 py-10 flex-shrink-0"
          >
            <div class="flex items-center">
              <div
                class="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mr-5 group-hover:scale-110 transition-transform duration-300"
              >
                <CalendarDaysIcon class="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 class="text-3xl font-bold text-white">Event Calendar</h2>
                <p class="text-blue-100 text-base">
                  Discover upcoming tournaments
                </p>
              </div>
            </div>
          </div>
          <div class="p-10 flex-1 overflow-hidden flex flex-col">
            <div class="h-full">
              <EventCalendar />
            </div>
          </div>
        </div>

        <!-- User Dashboard or Welcome Card -->
        <div
          v-if="userName"
          class="group bg-white rounded-3xl shadow-2xl border-2 border-emerald-100 overflow-hidden hover:shadow-3xl hover:border-emerald-200 transition-all duration-300 transform hover:scale-[1.02] h-[750px] flex flex-col"
        >
          <div
            class="bg-gradient-to-r from-emerald-600 to-teal-700 px-10 py-10 flex-shrink-0"
          >
            <div class="flex items-center">
              <div
                class="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mr-5 group-hover:scale-110 transition-transform duration-300"
              >
                <UserCircleIcon class="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 class="text-3xl font-bold text-white">My Registrations</h2>
                <p class="text-emerald-100 text-base">
                  Welcome back, {{ userName }}!
                </p>
              </div>
            </div>
          </div>
          <div class="p-10 flex-1 overflow-hidden flex flex-col">
            <div class="h-full">
              <UserEventRegistrations />
            </div>
          </div>
        </div>

        <!-- Getting Started Card (for non-logged users) -->
        <div
          v-else
          class="group bg-white rounded-3xl shadow-2xl border-2 border-violet-100 overflow-hidden hover:shadow-3xl hover:border-violet-200 transition-all duration-300 transform hover:scale-[1.02] h-[750px] flex flex-col"
        >
          <div
            class="bg-gradient-to-r from-violet-600 to-purple-700 px-10 py-10 flex-shrink-0"
          >
            <div class="flex items-center">
              <div
                class="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mr-5 group-hover:scale-110 transition-transform duration-300"
              >
                <RocketLaunchIcon class="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 class="text-3xl font-bold text-white">Get Started</h2>
                <p class="text-violet-100 text-base">
                  Join the community today - it's free!
                </p>
              </div>
            </div>
          </div>
          <div
            class="p-10 flex-1 overflow-hidden flex flex-col justify-center space-y-6"
          >
            <!-- Feature List -->
            <div class="space-y-4">
              <div class="flex items-start space-x-4 group">
                <div
                  class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200"
                >
                  <MagnifyingGlassIcon class="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">Discover Events</h3>
                  <p class="text-gray-600 text-sm">
                    Find tournaments in your area with advanced filtering
                  </p>
                </div>
              </div>

              <div class="flex items-start space-x-4 group">
                <div
                  class="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors duration-200"
                >
                  <CheckCircleIcon class="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">Easy Registration</h3>
                  <p class="text-gray-600 text-sm">
                    Quick signup with flexible decklist options
                  </p>
                </div>
              </div>

              <div class="flex items-start space-x-4 group">
                <div
                  class="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors duration-200"
                >
                  <HeartIcon class="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">Join Community</h3>
                  <p class="text-gray-600 text-sm">
                    Connect with players and track your tournament journey
                  </p>
                </div>
              </div>
            </div>

            <!-- Call to Action -->
            <div class="pt-6 border-t border-gray-100">
              <NuxtLink
                to="/login"
                class="group w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <UserPlusIcon class="w-5 h-5 mr-2" />
                Create Free Account
                <ArrowRightIcon
                  class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
                />
              </NuxtLink>
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
  RocketLaunchIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  HeartIcon,
  UserPlusIcon,
} from "@heroicons/vue/24/outline";

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
