<template>
  <div class="relative" ref="menuRef">
    <button
      @click="isOpen = !isOpen"
      class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <svg
        class="w-5 h-5 text-gray-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
      <span class="font-medium text-gray-700">{{ userName }}</span>
      <svg
        class="w-4 h-4 text-gray-500 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
      >
        <button
          @click="goToProfile"
          class="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 transition-colors duration-150"
        >
          <svg
            class="w-5 h-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span class="font-medium">My Profile</span>
        </button>

        <hr class="my-1 border-gray-200" />

        <button
          @click="logout"
          class="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors duration-150"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span class="font-medium">Log Out</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
const { user } = useAuth();
const isOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

const userName = computed(() => {
  return (
    user.value?.user_metadata?.name ||
    user.value?.email?.split("@")[0] ||
    "User"
  );
});

// Close menu when clicking outside
onMounted(() => {
  if (process.client) {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
        isOpen.value = false;
      }
    };

    document.addEventListener("click", handleClickOutside);

    onUnmounted(() => {
      document.removeEventListener("click", handleClickOutside);
    });
  }
});

const goToProfile = () => {
  isOpen.value = false;
  navigateTo("/profile");
};

const logout = async () => {
  isOpen.value = false;

  try {
    // Log logout action first (before clearing state)
    try {
      await $fetch("/api/admin/error-logs/create", {
        method: "POST",
        body: {
          userId: user.value?.id || null,
          userEmail: user.value?.email || null,
          errorType: "info_user_logout",
          errorMessage: "User logged out",
          userAgent: navigator.userAgent,
          url: window.location.href,
          metadata: {
            userName: user.value?.user_metadata?.name,
          },
        },
      });
    } catch (logError) {
      console.error("Failed to log logout:", logError);
      // Continue with logout even if logging fails
    }

    // Sign out from Supabase
    const { error } = await useSupabaseClient().auth.signOut();
    if (error) {
      console.error("Supabase signOut error:", error);
      // Continue with cleanup even if signOut fails
    }

    // Force clear all storage to prevent limbo state
    if (process.client) {
      try {
        localStorage.clear();
        sessionStorage.clear();

        // Clear cookies manually (important for Safari/iOS)
        const cookies = document.cookie.split(";");
        for (let cookie of cookies) {
          const name = cookie.split("=")[0].trim();
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        }
      } catch (storageError) {
        console.error("Storage cleanup error:", storageError);
      }
    }
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    // Always navigate to login, even if there were errors
    // Use replace to prevent back button issues
    await navigateTo("/login", { replace: true });
  }
};
</script>
