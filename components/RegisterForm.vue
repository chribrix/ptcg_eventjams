<template>
  <div
    class="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md mx-auto mt-12 border border-gray-100"
  >
    <div class="text-center mb-8">
      <div
        class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center"
      >
        <UserPlusIcon class="w-8 h-8 text-white" />
      </div>
      <h2 class="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
      <p class="text-gray-600">Join the Pokémon TCG community</p>
    </div>

    <form @submit.prevent="submitForm" class="space-y-6">
      <div class="relative">
        <div
          class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
        >
          <EnvelopeIcon class="w-5 h-5 text-gray-400" />
        </div>
        <input
          v-model="email"
          type="email"
          placeholder="Email address"
          class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
          required
        />
      </div>

      <div class="relative">
        <div
          class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
        >
          <UserIcon class="w-5 h-5 text-gray-400" />
        </div>
        <input
          v-model="name"
          type="text"
          placeholder="Full name"
          class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
          required
        />
      </div>

      <div class="relative">
        <div
          class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
        >
          <IdentificationIcon class="w-5 h-5 text-gray-400" />
        </div>
        <input
          v-model="playerId"
          type="text"
          placeholder="Player ID"
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
          <PaperAirplaneIcon v-else class="w-5 h-5" />
          <span>{{ isLoading ? "Sending..." : "Send Magic Link" }}</span>
        </div>
      </button>
    </form>

    <div class="mt-6 text-center">
      <p class="text-sm text-gray-600">
        Already have an account?
        <NuxtLink
          :to="
            route.query.redirect
              ? `/login?redirect=${route.query.redirect}`
              : '/login'
          "
          class="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors duration-200"
        >
          Sign in
        </NuxtLink>
      </p>
    </div>

    <div
      v-if="linkSent"
      class="mt-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg relative"
    >
      <div class="flex items-center space-x-2">
        <CheckCircleIcon class="w-5 h-5 text-emerald-600" />
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
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  UserPlusIcon,
  EnvelopeIcon,
  UserIcon,
  IdentificationIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
} from "@heroicons/vue/24/outline";

const email = ref("");
const name = ref("");
const playerId = ref("");
const linkSent = ref(false);
const isLoading = ref(false);
const error = ref("");
const runtimeConfig = useRuntimeConfig();
const route = useRoute();

const getMagicLinkRedirect = () => {
  const returnPath = route.query.redirect as string;
  const configuredBase = runtimeConfig.public.appBaseUrl?.replace(/\/$/, "");
  let redirectTo = "";

  if (configuredBase) {
    redirectTo = `${configuredBase}/magic-login`;
  } else if (process.client) {
    redirectTo = `${window.location.origin.replace(/\/$/, "")}/magic-login`;
  }

  // Append the return path if present
  if (redirectTo && returnPath) {
    redirectTo = `${redirectTo}?return=${encodeURIComponent(returnPath)}`;
  }

  return redirectTo || undefined;
};

const submitForm = async () => {
  isLoading.value = true;
  linkSent.value = false;
  error.value = "";

  const redirectTo = getMagicLinkRedirect();
  const { error: signUpError } = await useSupabaseClient().auth.signInWithOtp({
    email: email.value,
    options: {
      data: {
        name: name.value,
        playerId: playerId.value,
      },
      ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
    },
  });

  isLoading.value = false;

  if (signUpError) {
    console.error("Error sending magic link:", signUpError.message);
    error.value = signUpError.message;
  } else {
    linkSent.value = true;
  }
};
</script>
