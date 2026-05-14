<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div
      class="app-surface-0 max-w-lg w-full rounded-2xl border app-border p-8 text-center shadow-lg space-y-4"
    >
      <div
        class="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[var(--app-button-amber-border)] bg-[var(--app-button-amber)] font-bold text-[var(--app-button-amber-text)]"
      >
        !
      </div>
      <h1 class="text-2xl font-bold app-text-primary">
        {{ t("magicLogin.removedTitle") }}
      </h1>
      <p class="text-sm app-text-secondary">
        {{ t("magicLogin.removedText") }}
      </p>
      <p v-if="isPasswordSetupFlow" class="text-sm app-text-secondary">
        {{ t("magicLogin.passwordSetupText") }}
      </p>
      <NuxtLink
        to="/login"
        class="app-action-button app-action-primary px-4 py-2"
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
