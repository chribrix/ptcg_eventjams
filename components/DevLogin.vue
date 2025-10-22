<template>
  <div v-if="showDevLogin && !supabaseUser" class="fixed top-4 right-4 z-50">
    <div
      class="bg-yellow-100 border border-yellow-300 rounded-lg p-4 shadow-lg max-w-sm"
    >
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-yellow-800">🚧 Dev Login</h3>
        <button
          @click="showDevLogin = false"
          class="text-yellow-600 hover:text-yellow-800"
        >
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>

      <div v-if="!isLoggedIn" class="space-y-3">
        <input
          v-model="devEmail"
          type="email"
          placeholder="Email"
          class="w-full px-2 py-1 text-sm border border-yellow-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <input
          v-model="devName"
          type="text"
          placeholder="Name"
          class="w-full px-2 py-1 text-sm border border-yellow-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <input
          v-model="devPlayerId"
          type="text"
          placeholder="Player ID"
          class="w-full px-2 py-1 text-sm border border-yellow-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <button
          @click="devLogin"
          :disabled="isLoggingIn"
          class="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-sm py-1 px-2 rounded disabled:opacity-50"
        >
          {{ isLoggingIn ? "Logging in..." : "Dev Login" }}
        </button>
      </div>

      <div v-else class="text-sm text-yellow-800">
        <p class="mb-2">✅ Logged in as: {{ devName }}</p>
        <button
          @click="devLogout"
          class="text-xs text-yellow-600 hover:text-yellow-800 underline"
        >
          Logout
        </button>
      </div>
    </div>
  </div>

  <!-- Toggle button when hidden (only show if no real Supabase user) -->
  <button
    v-else-if="!supabaseUser"
    @click="showDevLogin = true"
    class="fixed top-4 right-4 z-50 bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-full shadow-lg"
    title="Dev Login"
  >
    <UserIcon class="w-5 h-5" />
  </button>
</template>

<script setup lang="ts">
import { XMarkIcon, UserIcon } from "@heroicons/vue/24/outline";

// Only show in development
const config = useRuntimeConfig();
const isDev = process.dev;
const { checkDevAuth, clearDevAuth, supabaseUser } = useAuth();

const showDevLogin = ref(false);
const isLoggedIn = ref(false);
const isLoggingIn = ref(false);

const devEmail = ref("dev@example.com");
const devName = ref("Dev User");
const devPlayerId = ref("DEV123");

// Check if already logged in on mount
onMounted(() => {
  if (isDev) {
    checkDevLoginStatus();
  }
});

async function checkDevLoginStatus() {
  try {
    // Check if we have dev cookies by calling the me endpoint
    const response = await $fetch("/api/dev/me", {
      method: "GET",
    });
    if (response?.user) {
      isLoggedIn.value = true;
      devName.value = response.user.name;
    } else {
      isLoggedIn.value = false;
    }
  } catch (error) {
    isLoggedIn.value = false;
  }
}

async function devLogin() {
  if (isLoggingIn.value) return;

  isLoggingIn.value = true;

  try {
    await $fetch("/api/dev/login", {
      method: "POST",
      body: {
        email: devEmail.value,
        name: devName.value,
        playerId: devPlayerId.value,
      },
    });

    // Update auth state manually
    await checkDevAuth();

    isLoggedIn.value = true;
    showDevLogin.value = false;

    // Refresh to update all components
    await nextTick();
    window.location.reload();
  } catch (error) {
    console.error("Dev login failed:", error);
    alert("Dev login failed");
  } finally {
    isLoggingIn.value = false;
  }
}

async function devLogout() {
  try {
    // Call server logout endpoint
    await $fetch("/api/dev/logout", {
      method: "POST",
    });

    // Clear cookies by setting them to expire (client-side cleanup)
    document.cookie =
      "dev-user-id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    document.cookie =
      "dev-user-email=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";

    // Clear the auth state
    clearDevAuth();

    isLoggedIn.value = false;
    showDevLogin.value = false;

    // Refresh to update all components
    window.location.reload();
  } catch (error) {
    console.error("Dev logout failed:", error);
    // Still clear local state on error
    clearDevAuth();
    isLoggedIn.value = false;
    window.location.reload();
  }
}

// Only render in development
const shouldRender = computed(() => isDev);
</script>

<style scoped>
/* Component only renders in development */
</style>
