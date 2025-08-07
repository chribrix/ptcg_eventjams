<template>
  <div class="bg-white shadow-md rounded-lg p-8 w-full max-w-md mx-auto mt-12">
    <h2 class="text-2xl font-semibold mb-6 text-center">Register</h2>
    <form @submit.prevent="submitForm" class="space-y-4">
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        class="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring"
        required
      />
      <input
        v-model="name"
        type="text"
        placeholder="Name"
        class="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring"
        required
      />
      <input
        v-model="playerId"
        type="text"
        placeholder="Player ID"
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
      Already have an account?
      <NuxtLink to="/login" class="text-green-600 hover:underline"
        >Log in</NuxtLink
      >
    </p>
    <div
      v-if="linkSent"
      class="mt-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative"
    >
      A login link has been sent to your email.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const email = ref("");
const name = ref("");
const playerId = ref("");
const linkSent = ref(false);

const { $supabase } = useNuxtApp();

const submitForm = async () => {
  const { error } = await $supabase.auth.signInWithOtp({
    email: email.value,
    options: {
      data: {
        name: name.value,
        playerId: playerId.value,
      },
      emailRedirectTo: `${window.location.origin}/magic-login`,
    },
  });

  if (error) {
    console.error("Error sending magic link:", error.message);
  } else {
    linkSent.value = true;
  }
};
</script>
