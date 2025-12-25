<template>
  <div
    class="group bg-[#2f3136] rounded-3xl shadow-2xl border-2 border-[#202225] overflow-hidden hover:shadow-3xl hover:border-[#40444b] transition-all duration-300 transform hover:scale-[1.02] h-[750px] flex flex-col w-full"
  >
    <div
      class="bg-gradient-to-r from-gray-800 to-gray-900 px-5 py-6 sm:px-10 sm:py-10 flex-shrink-0"
    >
      <div class="flex items-center">
        <div
          class="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 rounded-xl flex items-center justify-center mr-4 sm:mr-5 group-hover:scale-110 transition-transform duration-300"
        >
          <RocketLaunchIcon class="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
        <div>
          <h2 class="text-2xl sm:text-3xl font-bold text-white">Get Started</h2>
          <p class="text-violet-100 text-sm sm:text-base">
            Join the community today - it's free!
          </p>
        </div>
      </div>
    </div>
    <div
      class="p-5 sm:p-10 flex-1 overflow-hidden flex flex-col justify-center space-y-6"
    >
      <!-- Feature List -->
      <div class="space-y-4">
        <div class="flex items-start space-x-4 group">
          <div
            class="flex-shrink-0 w-8 h-8 bg-[#40444b] rounded-lg flex items-center justify-center group-hover:bg-[#4f545c] transition-colors duration-200"
          >
            <MagnifyingGlassIcon class="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 class="font-semibold text-white">Discover Events</h3>
            <p class="text-gray-300 text-sm">
              Find tournaments in your area with advanced filtering
            </p>
          </div>
        </div>

        <div class="flex items-start space-x-4 group">
          <div
            class="flex-shrink-0 w-8 h-8 bg-[#40444b] rounded-lg flex items-center justify-center group-hover:bg-[#4f545c] transition-colors duration-200"
          >
            <CheckCircleIcon class="w-4 h-4 text-green-400" />
          </div>
          <div>
            <h3 class="font-semibold text-white">Easy Registration</h3>
            <p class="text-gray-300 text-sm">
              Quick signup with flexible decklist options
            </p>
          </div>
        </div>

        <div class="flex items-start space-x-4 group">
          <div
            class="flex-shrink-0 w-8 h-8 bg-[#40444b] rounded-lg flex items-center justify-center group-hover:bg-[#4f545c] transition-colors duration-200"
          >
            <HeartIcon class="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 class="font-semibold text-white">Join Community</h3>
            <p class="text-gray-300 text-sm">
              Connect with players and track your tournament journey
            </p>
          </div>
        </div>
      </div>

      <!-- Call to Action -->
      <div class="pt-6 border-t border-[#40444b]">
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
</template>

<script setup lang="ts">
import {
  RocketLaunchIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  HeartIcon,
  UserPlusIcon,
  ArrowRightIcon,
} from "@heroicons/vue/24/outline";
</script>
