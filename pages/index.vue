<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"
  >
    <!-- Hero Section -->
    <div class="relative overflow-hidden">
      <!-- Background Pattern -->
      <div
        class="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700"
      ></div>
      <div
        class="absolute inset-0 bg-gradient-to-br from-transparent via-blue-500/20 to-purple-500/30"
      ></div>

      <div
        class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24"
      >
        <div class="text-center">
          <!-- Main Heading -->
          <div class="flex justify-center mb-8">
            <div
              class="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20"
            >
              <SparklesIcon class="w-5 h-5 text-yellow-300 mr-2" />
              <span class="text-white/90 text-sm font-medium"
                >Tournament Management Platform</span
              >
            </div>
          </div>

          <h1
            class="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight"
          >
            PTCG Event
            <span
              class="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"
            >
              Jams
            </span>
          </h1>
          <p
            class="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Discover, register, and participate in Pokemon TCG tournaments
            worldwide. Connect with the community and compete in style.
          </p>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <NuxtLink
              to="/events"
              class="group inline-flex items-center px-8 py-4 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transform hover:scale-105 transition-all duration-200 shadow-xl hover:shadow-2xl"
            >
              <CalendarIcon class="w-5 h-5 mr-2 group-hover:animate-pulse" />
              Browse Events
              <ArrowRightIcon
                class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
              />
            </NuxtLink>
            <NuxtLink
              v-if="!userName"
              to="/login"
              class="group inline-flex items-center px-8 py-4 border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 backdrop-blur-sm transform hover:scale-105 transition-all duration-200"
            >
              <UserIcon class="w-5 h-5 mr-2" />
              Get Started
            </NuxtLink>
          </div>

          <!-- Feature Highlights -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
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
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <!-- Event Calendar Card -->
        <div
          class="group bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300"
        >
          <div class="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div
                  class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mr-3"
                >
                  <CalendarDaysIcon class="w-6 h-6 text-white" />
                </div>
                <h2 class="text-2xl font-bold text-white">Event Calendar</h2>
              </div>
              <div class="opacity-75 text-white text-sm">Interactive View</div>
            </div>
          </div>
          <div class="p-8">
            <EventCalendar />
          </div>
        </div>

        <!-- User Dashboard or Welcome Card -->
        <div
          v-if="userName"
          class="group bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300"
        >
          <div class="bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div
                  class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mr-3"
                >
                  <UserCircleIcon class="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 class="text-2xl font-bold text-white">Welcome back!</h2>
                  <p class="text-emerald-100 text-sm">{{ userName }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="p-8">
            <UserEventRegistrations />
          </div>
        </div>

        <!-- Getting Started Card (for non-logged users) -->
        <div
          v-else
          class="group bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300"
        >
          <div class="bg-gradient-to-r from-violet-500 to-purple-600 px-8 py-6">
            <div class="flex items-center">
              <div
                class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mr-3"
              >
                <RocketLaunchIcon class="w-6 h-6 text-white" />
              </div>
              <h2 class="text-2xl font-bold text-white">Getting Started</h2>
            </div>
          </div>
          <div class="p-8 space-y-6">
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
