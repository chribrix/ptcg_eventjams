<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div
          class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"
        ></div>
        <p class="text-gray-600">Loading event details...</p>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="flex items-center justify-center min-h-screen px-4"
    >
      <div
        class="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
      >
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
        <p class="text-gray-600 mb-6">{{ error }}</p>
        <NuxtLink
          to="/"
          class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          ← Back to Events
        </NuxtLink>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="event" class="max-w-5xl mx-auto px-4 py-8">
      <div class="grid lg:grid-cols-[350px_1fr] gap-6">
        <!-- Event Info Card (Sidebar on desktop, top on mobile) -->
        <aside class="bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-8">
          <h1 class="text-2xl font-bold text-gray-900 mb-4">
            {{ event.name }}
          </h1>

          <div class="space-y-4">
            <div class="flex items-start gap-3">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                ></path>
              </svg>
              <div>
                <div class="text-xs text-gray-500 font-medium uppercase">
                  Date & Time
                </div>
                <div class="text-sm text-gray-900 font-medium">
                  {{ formatEventDate(event.eventDate) }}
                </div>
              </div>
            </div>

            <div class="flex items-start gap-3">
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
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                ></path>
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                ></path>
              </svg>
              <div>
                <div class="text-xs text-gray-500 font-medium uppercase">
                  Venue
                </div>
                <div class="text-sm text-gray-900 font-medium">
                  {{ event.venue }}
                </div>
              </div>
            </div>

            <div class="flex items-start gap-3">
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                ></path>
              </svg>
              <div>
                <div class="text-xs text-gray-500 font-medium uppercase">
                  Participants
                </div>
                <div class="text-sm text-gray-900 font-medium">
                  <span
                    :class="
                      registrationFull ? 'text-red-600' : 'text-green-600'
                    "
                  >
                    {{ registrationCount }}
                  </span>
                  <span class="text-gray-400"
                    >/{{ event.maxParticipants }}</span
                  >
                </div>
              </div>
            </div>

            <div class="flex items-start gap-3">
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
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                ></path>
              </svg>
              <div>
                <div class="text-xs text-gray-500 font-medium uppercase">
                  Entry Fee
                </div>
                <div
                  class="text-sm font-semibold"
                  :class="
                    event.participationFee > 0
                      ? 'text-gray-900'
                      : 'text-green-600'
                  "
                >
                  {{
                    event.participationFee > 0
                      ? `€${event.participationFee}`
                      : "Free Entry"
                  }}
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="event.requiresDecklist"
            class="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg"
          >
            <div class="flex items-center gap-2 text-amber-800">
              <svg
                class="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
              <span class="text-xs font-semibold">Decklist Required</span>
            </div>
          </div>

          <NuxtLink
            to="/"
            class="mt-6 block text-center text-sm text-gray-600 hover:text-blue-600 transition"
          >
            ← Back to Events
          </NuxtLink>
        </aside>

        <!-- Registration Form -->
        <main>
          <!-- Status Messages -->
          <div
            v-if="registrationFull"
            class="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6"
          >
            <h3 class="text-lg font-bold text-red-900 mb-2">Event Full</h3>
            <p class="text-red-700">
              This event has reached maximum capacity ({{
                event.maxParticipants
              }}
              participants).
            </p>
          </div>

          <div
            v-else-if="eventPassed"
            class="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6"
          >
            <h3 class="text-lg font-bold text-red-900 mb-2">
              Registration Closed
            </h3>
            <p class="text-red-700">This event has already taken place.</p>
          </div>

          <div
            v-else-if="registrationSuccess"
            class="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6"
          >
            <h3 class="text-lg font-bold text-green-900 mb-2">
              ✓ Registration Successful!
            </h3>
            <p class="text-green-700 mb-2">
              <strong>{{ form.tickets[0].name }}</strong> (ID:
              {{ form.tickets[0].playerId }}) has been registered for
              {{ event.name }}.
            </p>
            <p v-if="event.requiresDecklist" class="text-green-700 text-sm">
              Redirecting to your dashboard to submit your decklist...
            </p>
            <p v-else class="text-green-700 text-sm">
              Redirecting to your dashboard...
            </p>
          </div>

          <!-- Form Card -->
          <div v-else class="bg-white rounded-2xl shadow-lg p-6 lg:p-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">
              Complete Registration
            </h2>

            <form @submit.prevent="submitRegistration" class="space-y-5">
              <div
                v-if="userLoading"
                class="flex items-center justify-center py-8"
              >
                <div
                  class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"
                ></div>
                <p class="text-gray-600">Loading your profile...</p>
              </div>

              <div v-else class="space-y-5">
                <div>
                  <label
                    for="playerId"
                    class="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Player ID *
                  </label>
                  <input
                    id="playerId"
                    v-model="form.tickets[0].playerId"
                    type="text"
                    inputmode="numeric"
                    pattern="\d*"
                    required
                    :disabled="submitting"
                    class="w-full px-4 py-3 border-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    :class="
                      form.tickets[0].playerId
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                    "
                    placeholder="Your player ID (numbers only)"
                    @input="validatePlayerId($event, 0)"
                  />
                  <p
                    v-if="form.tickets[0].playerId"
                    class="mt-1.5 text-xs text-green-600 font-medium"
                  >
                    ✓ Auto-filled from your profile
                  </p>
                </div>

                <div>
                  <label
                    for="name"
                    class="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Full Name *
                  </label>
                  <input
                    id="name"
                    v-model="form.tickets[0].name"
                    type="text"
                    required
                    :disabled="submitting"
                    class="w-full px-4 py-3 border-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    :class="
                      form.tickets[0].name
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                    "
                    placeholder="Your full name"
                  />
                  <p
                    v-if="form.tickets[0].name"
                    class="mt-1.5 text-xs text-green-600 font-medium"
                  >
                    ✓ Auto-filled from your profile
                  </p>
                </div>

                <div>
                  <label
                    for="email"
                    class="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Email Address *
                  </label>
                  <input
                    id="email"
                    v-model="form.bookerEmail"
                    type="email"
                    required
                    :disabled="submitting"
                    class="w-full px-4 py-3 border-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    :class="
                      form.bookerEmail
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                    "
                    placeholder="your@email.com"
                  />
                  <p
                    v-if="form.bookerEmail"
                    class="mt-1.5 text-xs text-green-600 font-medium"
                  >
                    ✓ Auto-filled from your account
                  </p>
                </div>

                <!-- Privacy Notice & Anonymous Participation -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div class="flex items-start gap-3 mb-3">
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
                      <p class="font-semibold text-blue-900 text-sm">
                        Privacy Notice
                      </p>
                      <p class="text-blue-800 text-xs mt-1">
                        Your name will be visible to other event participants in
                        the participant list.
                      </p>
                    </div>
                  </div>

                  <label class="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      v-model="form.tickets[0].isAnonymous"
                      :disabled="submitting"
                      class="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <div class="flex-1">
                      <span class="text-sm font-medium text-gray-900"
                        >Anonymous Participation</span
                      >
                      <p class="text-xs text-gray-600 mt-0.5">
                        Your name will be hidden from other participants and
                        shown as part of "anonymous participants" count. Your
                        name will still be visible to event organizers.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div
                v-if="event.requiresDecklist"
                class="bg-amber-50 border border-amber-200 rounded-lg p-4"
              >
                <div class="flex items-start gap-3">
                  <svg
                    class="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"
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
                    <p class="font-semibold text-amber-900 text-sm">
                      Decklist Required
                    </p>
                    <p class="text-amber-800 text-xs mt-1">
                      After registration, you'll be redirected to submit your
                      decklist or select to bring it on-site.
                    </p>
                  </div>
                </div>
              </div>

              <div
                v-if="formError"
                class="bg-red-50 border border-red-200 rounded-lg p-4"
              >
                <p class="text-red-800 text-sm">{{ formError }}</p>
              </div>

              <button
                type="submit"
                :disabled="submitting || registrationFull"
                class="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <span v-if="submitting">Registering...</span>
                <span v-else>Complete Registration →</span>
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

interface CustomEvent {
  id: string | number;
  name: string;
  eventDate: string;
  venue: string;
  maxParticipants: number;
  participationFee: number;
  requiresDecklist: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface RegistrationForm {
  bookerPlayerId: string;
  bookerName: string;
  bookerEmail: string;
  tickets: Array<{
    name: string;
    playerId?: string;
    isAnonymous: boolean;
  }>;
  allAnonymous: boolean;
}

const route = useRoute();
const eventId = route.params.id as string;

// State
const event = ref<CustomEvent | null>(null);
const registrationCount = ref<number>(0);
const loading = ref<boolean>(true);
const error = ref<string>("");
const submitting = ref<boolean>(false);
const registrationSuccess = ref<boolean>(false);
const formError = ref<string>("");

const form = reactive<RegistrationForm>({
  bookerPlayerId: "",
  bookerName: "",
  bookerEmail: "",
  tickets: [
    {
      name: "",
      playerId: "",
      isAnonymous: false,
    },
  ],
  allAnonymous: false,
});

// Supabase user data
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const userLoading = ref<boolean>(true);

// Computed properties
const registrationFull = computed(() => {
  return event.value && registrationCount.value >= event.value.maxParticipants;
});

const eventPassed = computed(() => {
  if (!event.value) return false;
  const eventDate = new Date(event.value.eventDate);
  const now = new Date();
  return eventDate < now;
});

const hasPrefilledData = computed(() => {
  return (
    !userLoading.value &&
    (form.bookerPlayerId || form.bookerName || form.bookerEmail)
  );
});

// Methods
const formatEventDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const loadUserData = async (): Promise<void> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    if (user) {
      console.log("User found:", user.email);

      // Fetch player data from database
      try {
        const playerResponse = await $fetch("/api/players/me");

        if (playerResponse) {
          if (playerResponse.playerId) {
            form.bookerPlayerId = playerResponse.playerId;
            form.tickets[0].playerId = playerResponse.playerId;
          }
          if (playerResponse.name) {
            form.bookerName = playerResponse.name;
            form.tickets[0].name = playerResponse.name;
          }
          if (playerResponse.email) {
            form.bookerEmail = playerResponse.email;
          }
        }
      } catch (playerErr) {
        console.log("Player profile not found, using auth data");
        // Fallback to user metadata if player profile doesn't exist
        if (user.user_metadata) {
          if (user.user_metadata.playerId) {
            form.bookerPlayerId = user.user_metadata.playerId;
            form.tickets[0].playerId = user.user_metadata.playerId;
          }
          if (user.user_metadata.name) {
            form.bookerName = user.user_metadata.name;
            form.tickets[0].name = user.user_metadata.name;
          }
        }
      }

      // Always use auth email as fallback
      if (!form.bookerEmail && user.email) {
        form.bookerEmail = user.email;
      }
    } else {
      console.log("No user session found");
    }
  } catch (err) {
    console.error("Failed to load user data:", err);
  } finally {
    userLoading.value = false;
  }
};

const fetchEventDetails = async (): Promise<void> => {
  try {
    loading.value = true;
    error.value = "";

    const response = await $fetch<{
      event: CustomEvent;
      registrationCount: number;
    }>(`/api/events/${eventId}`);

    if (response.event) {
      event.value = response.event;
      registrationCount.value = response.registrationCount || 0;
    } else {
      error.value = "Event not found";
    }
  } catch (err: unknown) {
    console.error("Failed to fetch event:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Failed to load event details";
    error.value = errorMessage;
  } finally {
    loading.value = false;
  }
};

const validatePlayerId = (event: Event, ticketIndex: number): void => {
  const target = event.target as HTMLInputElement;
  const value = target.value;

  // Remove any non-numeric characters
  const numericOnly = value.replace(/\D/g, "");

  // Update the form with the cleaned value
  if (ticketIndex === 0) {
    form.tickets[0].playerId = numericOnly;
    form.bookerPlayerId = numericOnly;
  } else {
    form.tickets[ticketIndex].playerId = numericOnly;
  }

  // Update the input value directly to reflect the change
  target.value = numericOnly;
};

const submitRegistration = async (): Promise<void> => {
  try {
    submitting.value = true;
    formError.value = "";

    const response = await $fetch(`/api/events/${eventId}/register`, {
      method: "POST",
      body: form,
    });

    registrationSuccess.value = true;
    registrationCount.value += 1;

    // Redirect to dashboard after successful registration
    setTimeout(() => {
      navigateTo("/dashboard");
    }, 2000);
  } catch (err: unknown) {
    console.error("Registration failed:", err);
    const errorObj = err as { data?: { message?: string }; message?: string };
    formError.value =
      errorObj.data?.message ||
      errorObj.message ||
      "Registration failed. Please try again.";
  } finally {
    submitting.value = false;
  }
};

// Lifecycle
onMounted(async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));

  if (!user.value) {
    const returnUrl = encodeURIComponent(`/events/register/${eventId}`);
    await navigateTo(`/login?redirect=${returnUrl}`);
    return;
  }

  await Promise.all([loadUserData(), fetchEventDetails()]);
});

// SEO
useHead({
  title: computed(() =>
    event.value ? `Register - ${event.value.name}` : "Event Registration"
  ),
  meta: [
    {
      name: "description",
      content: computed(() =>
        event.value
          ? `Register for ${event.value.name} at ${event.value.venue}`
          : "Event Registration"
      ),
    },
  ],
});
</script>
