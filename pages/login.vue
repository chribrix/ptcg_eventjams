<template>
  <div class="bg-white shadow-md rounded-lg p-8 w-full max-w-md mx-auto mt-12">
    <h2 class="text-2xl font-semibold mb-6 text-center">Log In</h2>

    <form @submit.prevent="submitLogin" class="space-y-4">
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        class="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring"
        required
      />
      <button
        type="submit"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Send Magic Link
      </button>
    </form>

    <p class="mt-4 text-center text-sm text-gray-600">
      Don't have an account?
      <NuxtLink
        :to="
          route.query.redirect
            ? `/register?redirect=${route.query.redirect}`
            : '/register'
        "
        class="text-green-600 hover:underline"
      >
        Register
      </NuxtLink>
    </p>

    <div
      v-if="linkSent"
      class="mt-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative"
    >
      A login link has been sent to your email.
    </div>

    <div
      v-if="error"
      class="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
    >
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
const email = ref("");
const linkSent = ref(false);
const error = ref("");
const runtimeConfig = useRuntimeConfig();

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

onMounted(() => {
  // If user is already authenticated, redirect to intended page or home
  if (user.value) {
    const redirectTo = route.query.redirect as string;
    navigateTo(redirectTo || "/");
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

  console.log("=== Magic Link Login Debug ===");
  console.log("Email:", email.value);
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

  if (signInError) {
    console.error("=== Magic Link Error ===");
    console.error("Error message:", signInError.message);
    console.error("Error status:", signInError.status);
    console.error("Error name:", signInError.name);
    console.error("Full error object:", JSON.stringify(signInError, null, 2));
    console.error("========================");
    error.value = signInError.message;
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
