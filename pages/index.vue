<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-8">
    <div
      class="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] gap-8 max-w-7xl mx-auto"
    >
      <!-- Hero Section -->
      <div class="flex-1 flex items-center justify-center">
        <div class="text-center text-white max-w-lg">
          <h1 class="text-4xl lg:text-6xl font-bold mb-4 drop-shadow-lg">
            Pokemon TCG Event Jams
          </h1>
          <p class="text-xl mb-12 opacity-90">
            Find Pokemon TCG events in your area
          </p>

          <div class="text-left mb-12 space-y-8">
            <div class="space-y-2">
              <h3 class="text-xl font-semibold">🗓️ Event Calendar</h3>
              <p class="opacity-80 leading-relaxed">
                Browse events by date with our interactive calendar view
              </p>
            </div>
            <div class="space-y-2">
              <h3 class="text-xl font-semibold">📍 Local Events</h3>
              <p class="opacity-80 leading-relaxed">
                Find Pokemon TCG tournaments, league cups, and challenges near
                you
              </p>
            </div>
            <div class="space-y-2">
              <h3 class="text-xl font-semibold">⚡ Real-time Updates</h3>
              <p class="opacity-80 leading-relaxed">
                Get the latest event information directly from official sources
              </p>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <NuxtLink
              to="/events"
              class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 hover:-translate-y-1 shadow-lg"
            >
              Full Event View
            </NuxtLink>
            <NuxtLink
              to="/eventlist"
              class="bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-8 rounded-lg border border-white/30 transition-all duration-200 hover:-translate-y-1 shadow-lg"
            >
              List View
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Right Panel -->
      <div
        class="flex-1 flex flex-col gap-8 bg-white/95 rounded-2xl p-8 shadow-xl"
      >
        <!-- Calendar Section -->
        <div class="flex-shrink-0 flex flex-col">
          <h2 class="text-2xl font-bold text-gray-800 mb-4 text-center">
            Event Calendar
          </h2>
          <EventCalendar />
        </div>

        <!-- User Dashboard Section -->
        <div v-if="userName" class="flex-shrink-0">
          <MyRegistrations />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
