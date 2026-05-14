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
      <h1 class="text-2xl font-bold app-text-primary">Link login retired</h1>
      <p class="text-sm app-text-secondary">
        This application no longer uses magic-link confirmation pages. Request a
        new email code from the login page and enter it there instead.
      </p>
      <p v-if="isPasswordSetupFlow" class="text-sm app-text-secondary">
        Password setup confirmation also uses an email code now. Start the
        password setup flow again from the login page to receive a fresh code.
      </p>
      <NuxtLink
        to="/login"
        class="app-action-button app-action-primary px-4 py-2"
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
