<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div
      class="app-surface-0 shadow-xl rounded-2xl p-8 w-full max-w-md border app-border text-center"
    >
      <div
        class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--app-button-green-border)] bg-[var(--app-button-green)]"
      >
        <svg
          class="w-8 h-8 text-[var(--app-button-green-text)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h1 class="mb-2 text-2xl font-bold app-text-primary">
        Passwort erfolgreich gesetzt
      </h1>
      <p class="mb-6 app-text-secondary">
        Du kannst dich jetzt mit deinem neuen Passwort einloggen.
      </p>

      <NuxtLink
        to="/login"
        class="app-action-button app-action-primary inline-flex w-full justify-center py-3"
      >
        Zum Login
      </NuxtLink>
    </div>
  </div>
</template>
