<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div
      class="max-w-lg w-full bg-white border border-amber-200 rounded-2xl shadow-lg p-8 text-center space-y-4"
    >
      <div
        class="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-700 font-bold"
      >
        !
      </div>
      <h1 class="text-2xl font-bold text-gray-900">Magic-link login removed</h1>
      <p class="text-sm text-gray-700">
        Passwordless sign-in now works with an email code instead of a login
        link. Return to the login page and request a fresh code.
      </p>
      <p v-if="isPasswordSetupFlow" class="text-sm text-gray-700">
        If you were confirming a password setup, start that flow again from the
        login page to receive a new email code.
      </p>
      <NuxtLink
        to="/login"
        class="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
      >
        Back to Login
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const isPasswordSetupFlow = computed(
  () => (route.query.flow as string) === "set-password",
);
</script>
