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
      <h1 class="text-2xl font-bold text-gray-900">
        {{ t("magicLogin.removedTitle") }}
      </h1>
      <p class="text-sm text-gray-700">
        {{ t("magicLogin.removedText") }}
      </p>
      <p v-if="isPasswordSetupFlow" class="text-sm text-gray-700">
        {{ t("magicLogin.passwordSetupText") }}
      </p>
      <NuxtLink
        to="/login"
        class="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
      >
        {{ t("magicLogin.backToLogin") }}
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { t } = useI18n();
const isPasswordSetupFlow = computed(
  () => (route.query.flow as string) === "set-password",
);
</script>
