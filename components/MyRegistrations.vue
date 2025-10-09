<template>
  <div class="w-full">
    <h2 class="text-2xl font-bold text-gray-800 mb-4 text-center">
      My Registrations
    </h2>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center gap-2 p-4 text-gray-600">
      <div
        class="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"
      ></div>
      <span>Loading your registrations...</span>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="registrations.length === 0"
      class="p-4 text-center text-gray-600"
    >
      <p class="mb-3">No event registrations yet.</p>
      <NuxtLink
        to="/events"
        class="text-blue-600 hover:text-blue-800 font-medium hover:underline"
      >
        Browse Events
      </NuxtLink>
    </div>

    <!-- Registrations List -->
    <div v-else class="space-y-3">
      <div
        v-for="registration in registrations"
        :key="registration.id"
        class="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200"
      >
        <div class="flex justify-between items-center mb-2">
          <h4 class="text-sm font-semibold text-gray-900">
            {{ registration.customEvent.name }}
          </h4>
          <span class="text-xs text-gray-500">
            {{ formatEventDate(registration.customEvent.eventDate) }}
          </span>
        </div>

        <!-- Decklist Alert -->
        <div
          v-if="
            registration.customEvent.requiresDecklist && !registration.decklist
          "
          class="flex justify-between items-center bg-yellow-50 border border-yellow-300 rounded px-3 py-2 text-xs text-yellow-800"
        >
          <span>⚠️ Decklist required - not submitted yet</span>
          <NuxtLink
            to="/dashboard"
            class="text-yellow-600 hover:text-yellow-800 font-medium hover:underline"
          >
            Submit Now
          </NuxtLink>
        </div>

        <div
          v-else-if="
            registration.customEvent.requiresDecklist && registration.decklist
          "
          class="flex items-center bg-green-50 border border-green-300 rounded px-3 py-2 text-xs text-green-800"
        >
          ✓ Decklist submitted
        </div>
      </div>

      <NuxtLink
        to="/dashboard"
        class="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors duration-200"
      >
        View Full Dashboard
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
interface EventRegistration {
  id: string;
  customEventId: string;
  playerId: string;
  registeredAt: string;
  status: string;
  notes?: string | null;
  decklist?: string | null;
  customEvent: {
    id: string;
    name: string;
    venue: string;
    eventDate: string;
    maxParticipants: number;
    participationFee?: string | null;
    description?: string | null;
    registrationDeadline?: string | null;
    requiresDecklist: boolean;
    status: string;
  };
}

const registrations = ref<EventRegistration[]>([]);
const isLoading = ref<boolean>(false);
const supabase = useSupabaseClient();

const formatEventDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const fetchUserRegistrations = async () => {
  try {
    isLoading.value = true;
    const { data } = await $fetch<{ data: EventRegistration[] }>(
      "/api/dashboard/registrations"
    );
    registrations.value = data || [];
  } catch (error) {
    console.error("Failed to fetch user registrations:", error);
    registrations.value = [];
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  const { data: session } = await supabase.auth.getSession();
  if (session?.session) {
    // Fetch user registrations if logged in
    await fetchUserRegistrations();
  }
});
</script>
