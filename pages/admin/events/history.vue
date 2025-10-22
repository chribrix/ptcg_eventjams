<template>
  <div class="admin-event-history">
    <div class="max-w-7xl mx-auto">
      <!-- Page Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Event History</h1>
            <p class="text-gray-600 mt-2">
              Complete history of all past events and their participants
            </p>
          </div>

          <!-- Back to Admin -->
          <NuxtLink
            to="/admin"
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            <ArrowLeftIcon class="w-4 h-4" />
            Back to Dashboard
          </NuxtLink>
        </div>
      </div>

      <!-- Event History Component -->
      <EventHistory :isAdmin="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";

// Page metadata
definePageMeta({
  layout: "default",
});

useHead({
  title: "Event History - Admin Dashboard - PTCG Event Jams",
});
</script>

<style scoped>
.admin-event-history {
  max-width: none;
  padding: 2rem;
  background: #f9fafb;
  min-height: 100vh;
}
</style>
