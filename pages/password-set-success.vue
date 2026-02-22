<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div
      class="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md border border-gray-100 text-center"
    >
      <div
        class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
      >
        <svg
          class="w-8 h-8 text-green-600"
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

      <h1 class="text-2xl font-bold text-gray-900 mb-2">
        Passwort erfolgreich gesetzt
      </h1>
      <p class="text-gray-600 mb-6">
        Du kannst dich jetzt mit deinem neuen Passwort einloggen.
      </p>

      <NuxtLink
        to="/login"
        class="inline-flex w-full justify-center py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
      >
        Zum Login
      </NuxtLink>
    </div>
  </div>
</template>
