<script setup lang="ts">
import { ref, onMounted, watch } from "vue";

const userName = ref<string | null>(null);
const supabase = useSupabaseClient();

// Admin composable - now uses server-side verification
const { isAdmin, user, loading } = useAdmin();

// Logout function
const logout = async () => {
  try {
    await supabase.auth.signOut();
    userName.value = null;
    // Redirect to home page after logout
    await navigateTo("/");
  } catch (error) {
    console.error("Error during logout:", error);
  }
};

onMounted(async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData?.session?.user;

  if (sessionUser) {
    userName.value = sessionUser.user_metadata.name || sessionUser.email;
  }
});

// Watch for user authentication changes
watch(user, (newUser) => {
  if (newUser) {
    userName.value = newUser.user_metadata?.name || newUser.email;
  } else {
    userName.value = null;
  }
});
</script>

<template>
  <div>
    <header class="shadow-sm bg-white">
      <nav class="container mx-auto flex p-4 justify-between items-center">
        <!-- Left side -->
        <NuxtLink to="/" class="font-bold">Home</NuxtLink>

        <!-- Center -->
        <div v-if="userName" class="text-gray-600 font-semibold">
          Hello, {{ userName }}
        </div>

        <!-- Right side -->
        <ul class="flex gap-4 items-center">
          <li><NuxtLink to="/">Home</NuxtLink></li>
          <li><NuxtLink to="/about">About</NuxtLink></li>
          <li><NuxtLink to="/eventlist">Event List</NuxtLink></li>
          <li v-if="userName">
            <NuxtLink to="/importer" class="text-blue-600 hover:underline"
              >Importer</NuxtLink
            >
          </li>
          <!-- Admin navigation -->
          <li v-if="isAdmin" class="relative">
            <div class="admin-dropdown">
              <button
                class="admin-menu-button bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition flex items-center gap-1"
              >
                Admin ▼
              </button>
              <div class="admin-dropdown-content">
                <NuxtLink to="/admin" class="admin-link">Dashboard</NuxtLink>
                <NuxtLink to="/admin/custom-events" class="admin-link"
                  >Manage Events</NuxtLink
                >
                <NuxtLink to="/admin/players" class="admin-link"
                  >Manage Players</NuxtLink
                >
              </div>
            </div>
          </li>
          <!-- Logout button for authenticated users -->
          <li v-if="userName">
            <button
              @click="logout"
              class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
            >
              Logout
            </button>
          </li>
          <!-- Sign in/register for non-authenticated users -->
          <li v-else>
            <NuxtLink
              to="/register"
              class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition"
            >
              Sign In / Register
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </header>

    <div class="container mx-auto p-4">
      <slot />
    </div>
  </div>
</template>

<style>
.router-link-exact-active {
  color: #12b488;
}

/* Admin dropdown styles */
.admin-dropdown {
  position: relative;
  display: inline-block;
}

.admin-dropdown-content {
  display: none;
  position: absolute;
  right: 0;
  background-color: white;
  min-width: 160px;
  box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
  border-radius: 0.375rem;
  z-index: 1000;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.admin-dropdown:hover .admin-dropdown-content {
  display: block;
}

.admin-link {
  color: #374151;
  padding: 12px 16px;
  text-decoration: none;
  display: block;
  transition: background-color 0.2s ease;
}

.admin-link:hover {
  background-color: #f3f4f6;
  color: #7c3aed;
}

.admin-menu-button {
  cursor: pointer;
  user-select: none;
}
</style>
