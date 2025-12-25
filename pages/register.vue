<template>
  <div class="max-w-md mx-auto">
    <!-- Event Context Card -->
    <EventDetailsCard :event-details="eventDetails" />

    <!-- Info message when redirected from failed login -->
    <div
      v-if="route.query.noAccount"
      class="max-w-md mx-auto mt-8 mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg"
    >
      <div class="flex items-start space-x-3">
        <svg
          class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <div>
          <h3 class="font-semibold mb-1">No Account Found</h3>
          <p class="text-sm">
            We couldn't find an account with your email address. Please complete
            registration below to create your account.
          </p>
        </div>
      </div>
    </div>
    <RegisterForm />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { user } = useAuth();
const eventDetails = ref<any>(null);

onMounted(async () => {
  // If user is already authenticated, redirect to intended page or home
  if (user.value) {
    const redirectTo = route.query.redirect as string;
    navigateTo(redirectTo || "/");
    return;
  }

  // Check if redirected from an event page
  const redirectTo = route.query.redirect as string;
  if (redirectTo) {
    // Extract event ID from redirect URL
    const eventRegisterMatch = redirectTo.match(/\/events\/register\/(\w+)/);
    const eventViewMatch = redirectTo.match(/\/events\/(\w+)/);
    const eventId = eventRegisterMatch?.[1] || eventViewMatch?.[1];

    if (eventId) {
      try {
        const response = await $fetch(`/api/events/${eventId}`);
        if (response.event) {
          eventDetails.value = {
            ...response.event,
            registrationCount: response.registrationCount,
          };
        }
      } catch (err) {
        console.error("Failed to fetch event details:", err);
      }
    }
  }
});

// Also watch for user changes
watch(user, (newUser) => {
  if (newUser) {
    const redirectTo = route.query.redirect as string;
    navigateTo(redirectTo || "/");
  }
});
</script>
