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
  const configuredBase = runtimeConfig.public.appBaseUrl?.replace(/\/$/, "");
  if (configuredBase) {
    return `${configuredBase}/magic-login`;
  }
  if (process.client) {
    return `${window.location.origin.replace(/\/$/, "")}/magic-login`;
  }
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

  const returnPath = route.query.redirect as string;
  let redirectTo = getMagicLinkRedirect();

  // Append the return path if present
  if (redirectTo && returnPath) {
    redirectTo = `${redirectTo}?return=${encodeURIComponent(returnPath)}`;
  }

  const { error: signInError } = await useSupabaseClient().auth.signInWithOtp({
    email: email.value,
    options: redirectTo
      ? {
          emailRedirectTo: redirectTo,
        }
      : undefined,
  });

  if (signInError) {
    error.value = signInError.message;
  } else {
    linkSent.value = true;
  }
};
</script>
