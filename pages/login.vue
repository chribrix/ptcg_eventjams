<template>
  <div class="max-w-md mx-auto">
    <!-- Event Context Card -->
    <EventDetailsCard :event-details="eventDetails" />

    <!-- Login Form Card -->
    <div
      class="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md mx-auto border border-gray-100"
    >
      <div class="text-center mb-8">
        <div
          class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center"
        >
          <svg
            class="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
            />
          </svg>
        </div>
        <h2 class="text-3xl font-bold text-gray-900 mb-2">Log In</h2>
        <p class="text-gray-600">Welcome back to the Pokémon TCG community</p>
      </div>

      <form @submit.prevent="submitLogin" class="space-y-6">
        <div class="relative">
          <div
            class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
          >
            <svg
              class="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <input
            v-model="email"
            type="email"
            placeholder="Email address"
            class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
            required
          />
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-400 disabled:to-purple-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-blue-200"
        >
          <div class="flex items-center justify-center space-x-2">
            <svg
              v-if="isLoading"
              class="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <svg
              v-else
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span>{{ isLoading ? "Sending..." : "Send Magic Link" }}</span>
          </div>
        </button>
      </form>

      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600">
          Don't have an account?
          <NuxtLink
            :to="
              route.query.redirect
                ? `/register?redirect=${route.query.redirect}`
                : '/register'
            "
            class="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors duration-200"
          >
            Create account
          </NuxtLink>
        </p>
      </div>

      <div
        v-if="linkSent"
        class="mt-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg relative"
      >
        <div class="flex items-center space-x-2">
          <svg
            class="w-5 h-5 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="font-medium">Magic link sent!</span>
        </div>
        <p class="text-sm mt-1 ml-7">Check your email for the login link.</p>
      </div>

      <div
        v-if="error"
        class="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative"
      >
        <p class="font-medium">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const email = ref("");
const linkSent = ref(false);
const error = ref("");
const isLoading = ref(false);
const runtimeConfig = useRuntimeConfig();
const eventDetails = ref<any>(null);

const logError = async (
  errorType: string,
  errorMessage: string,
  additionalData?: any
) => {
  if (!process.client) return;
  try {
    await $fetch("/api/admin/error-logs/create", {
      method: "POST",
      body: {
        userId: null,
        userEmail: email.value || null,
        errorType,
        errorMessage,
        userAgent: navigator.userAgent,
        url: window.location.href,
        metadata: additionalData || null,
      },
    });
  } catch (logError) {
    console.error("Failed to log error:", logError);
  }
};

const getMagicLinkRedirect = () => {
  console.log("--- getMagicLinkRedirect called ---");
  const configuredBase = runtimeConfig.public.appBaseUrl?.replace(/\/$/, "");
  console.log("Configured base URL from config:", configuredBase);

  if (configuredBase) {
    const result = `${configuredBase}/magic-login`;
    console.log("Using configured base, returning:", result);
    return result;
  }

  if (process.client) {
    const origin = window.location.origin.replace(/\/$/, "");
    const result = `${origin}/magic-login`;
    console.log("Using window.location.origin:", origin);
    console.log("Returning:", result);
    return result;
  }

  console.log("No redirect URL determined (SSR without config)");
  return undefined;
};

// Check if user is already authenticated and redirect
const { user } = useAuth();
const route = useRoute();

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
        const response = await $fetch<{
          event: any;
          registrationCount: number;
        }>(`/api/events/${eventId}`);
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

// Also watch for user changes (in case auth state changes while on login page)
watch(user, (newUser) => {
  if (newUser) {
    const redirectTo = route.query.redirect as string;
    navigateTo(redirectTo || "/");
  }
});

const submitLogin = async () => {
  linkSent.value = false;
  error.value = "";
  isLoading.value = true;

  console.log("=== Magic Link Login Debug ===");
  console.log("Email:", email.value);

  // First, check if a player account exists with this email
  try {
    const playerCheck = await $fetch("/api/players/check", {
      method: "POST",
      body: {
        email: email.value,
      },
    });

    if (!playerCheck.exists) {
      console.log("Player account not found for email:", email.value);
      error.value = `No account found for ${email.value}. Please register first before logging in.`;
      isLoading.value = false;
      await logError(
        "login_attempt_without_registration",
        "User tried to login without an account",
        {
          email: email.value,
        }
      );

      // Suggest registering instead
      setTimeout(() => {
        const returnPath = route.query.redirect as string;
        const redirectQuery = returnPath
          ? `?redirect=${encodeURIComponent(
              returnPath
            )}&email=${encodeURIComponent(email.value)}`
          : `?email=${encodeURIComponent(email.value)}`;
        navigateTo(`/register${redirectQuery}`);
      }, 3000);
      return;
    }

    console.log("✅ Player account exists, proceeding with magic link");
  } catch (checkError) {
    console.error("Error checking player existence:", checkError);
    error.value =
      "We couldn't verify your account. Redirecting you to registration...";
    isLoading.value = false;
    await logError(
      "login_player_check_failed",
      checkError instanceof Error ? checkError.message : "Unknown error",
      {
        email: email.value,
        checkError,
      }
    );

    // Redirect to register page with noAccount flag
    setTimeout(() => {
      const returnPath = route.query.redirect as string;
      const redirectQuery = returnPath
        ? `?redirect=${encodeURIComponent(
            returnPath
          )}&noAccount=true&email=${encodeURIComponent(email.value)}`
        : `?noAccount=true&email=${encodeURIComponent(email.value)}`;
      navigateTo(`/register${redirectQuery}`);
    }, 2000);
    return;
  }

  console.log("Supabase URL:", runtimeConfig.public.supabaseUrl);
  console.log("Has Supabase Key:", !!runtimeConfig.public.supabaseAnonKey);
  console.log("APP_BASE_URL:", runtimeConfig.public.appBaseUrl);

  const returnPath = route.query.redirect as string;
  console.log("Return path from query:", returnPath);

  let redirectTo = getMagicLinkRedirect();
  console.log("Base redirect URL:", redirectTo);

  // Append the return path if present
  if (redirectTo && returnPath) {
    redirectTo = `${redirectTo}?return=${encodeURIComponent(returnPath)}`;
    console.log("Final redirect URL with return path:", redirectTo);
  }

  console.log("Calling Supabase signInWithOtp...");
  const startTime = Date.now();

  const { error: signInError } = await useSupabaseClient().auth.signInWithOtp({
    email: email.value,
    options: redirectTo
      ? {
          emailRedirectTo: redirectTo,
        }
      : undefined,
  });

  const elapsed = Date.now() - startTime;
  console.log(`Supabase API call completed in ${elapsed}ms`);

  isLoading.value = false;

  if (signInError) {
    console.error("=== Magic Link Error ===");
    console.error("Error message:", signInError.message);
    console.error("Error status:", signInError.status);
    console.error("Error name:", signInError.name);
    console.error("Full error object:", JSON.stringify(signInError, null, 2));
    console.error("========================");
    error.value = signInError.message;
    await logError("login_magic_link_failed", signInError.message, {
      email: email.value,
      errorStatus: signInError.status,
      errorName: signInError.name,
    });
  } else {
    console.log("✅ Magic link sent successfully");
    console.log(
      "Expected redirect after clicking link:",
      redirectTo || "http://localhost:3000/magic-login"
    );
    console.log("=============================");
    linkSent.value = true;
  }
};
</script>
