<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import {
  CalendarDaysIcon,
  DocumentIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  UserPlusIcon,
  ChevronDownIcon,
  ClockIcon,
} from "@heroicons/vue/24/outline";

const userName = ref<string | null>(null);
const supabase = useSupabaseClient();

// Use our enhanced auth composable
const { user: authUser, checkDevAuth, clearDevAuth } = useAuth();

// Admin composable - now uses server-side verification
const { isAdmin, user: adminUser, loading } = useAdmin();

// Logout function
const logout = async () => {
  try {
    await supabase.auth.signOut();

    // Clear dev cookies and state if in dev mode
    if (process.dev) {
      document.cookie =
        "dev-user-id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      document.cookie =
        "dev-user-email=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      clearDevAuth();
    }

    userName.value = null;
    // Redirect to home page after logout
    await navigateTo("/");
  } catch (error) {
    console.error("Error during logout:", error);
  }
};

onMounted(async () => {
  // Check Supabase auth first
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData?.session?.user;

  if (sessionUser) {
    userName.value = sessionUser.user_metadata.name || sessionUser.email;
  }
  // Don't automatically check dev auth - let user trigger it manually
});

// Watch for user authentication changes
watch(
  authUser,
  (newUser) => {
    if (newUser) {
      userName.value = newUser.user_metadata?.name || newUser.email;
    } else {
      userName.value = null;
    }
  },
  { immediate: true }
);

// Use i18n for translations
const { t } = useI18n();
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
    <header class="bg-white shadow-lg border-b border-gray-200">
      <nav class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Left side - Logo/Brand -->
          <div class="flex items-center space-x-4">
            <NuxtLink
              to="/"
              class="flex items-center space-x-2 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors duration-200"
            >
              <div
                class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"
              >
                <span class="text-white font-bold text-sm">P</span>
              </div>
              <span>PTCG Events</span>
            </NuxtLink>
          </div>

          <!-- Center - User Greeting -->
          <div
            v-if="userName"
            class="hidden md:flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-full"
          >
            <UserCircleIcon class="w-5 h-5 text-blue-600" />
            <span class="text-blue-800 font-semibold"
              >{{ t("nav.hello") }}, {{ userName }}</span
            >
          </div>

          <!-- Right side - Navigation -->
          <div class="flex items-center space-x-2">
            <!-- Main Navigation -->
            <div class="hidden md:flex items-center space-x-1">
              <NuxtLink to="/eventlist" class="nav-link">
                <CalendarDaysIcon class="w-4 h-4" />
                <span>{{ t("nav.events") }}</span>
              </NuxtLink>

              <!-- Dashboard for logged-in users -->
              <NuxtLink
                v-if="userName"
                to="/dashboard"
                class="nav-link-primary"
              >
                <Cog6ToothIcon class="w-4 h-4" />
                <span>{{ t("nav.dashboard") }}</span>
              </NuxtLink>

              <NuxtLink v-if="userName" to="/importer" class="nav-link">
                <DocumentIcon class="w-4 h-4" />
                <span>{{ t("nav.importer") }}</span>
              </NuxtLink>
            </div>

            <!-- Admin Dropdown -->
            <div v-if="isAdmin" class="relative">
              <div class="admin-dropdown">
                <button class="admin-menu-button">
                  <Cog6ToothIcon class="w-4 h-4" />
                  <span>Admin</span>
                  <ChevronDownIcon class="w-4 h-4" />
                </button>
                <div class="admin-dropdown-content">
                  <NuxtLink to="/admin" class="admin-link">
                    <Cog6ToothIcon class="w-4 h-4" />
                    <span>{{ t("nav.dashboard") }}</span>
                  </NuxtLink>
                  <NuxtLink to="/admin/custom-events" class="admin-link">
                    <CalendarDaysIcon class="w-4 h-4" />
                    <span>{{ t("nav.manageEvents") }}</span>
                  </NuxtLink>
                  <NuxtLink to="/admin/players" class="admin-link">
                    <UserCircleIcon class="w-4 h-4" />
                    <span>{{ t("nav.managePlayers") }}</span>
                  </NuxtLink>
                  <NuxtLink to="/admin/events/history" class="admin-link">
                    <ClockIcon class="w-4 h-4" />
                    <span>{{ t("nav.eventHistory") }}</span>
                  </NuxtLink>
                </div>
              </div>
            </div>

            <!-- Language Switcher & Auth Actions -->
            <div
              class="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200"
            >
              <!-- Language Switcher -->
              <LanguageSwitcher />

              <!-- Logout button for authenticated users -->
              <button v-if="userName" @click="logout" class="logout-button">
                <ArrowRightOnRectangleIcon class="w-4 h-4" />
                <span class="hidden sm:inline">{{ t("nav.logout") }}</span>
              </button>

              <!-- Sign in/register for non-authenticated users -->
              <NuxtLink v-else to="/register" class="signin-button">
                <UserPlusIcon class="w-4 h-4" />
                <span>{{ t("nav.login") }}</span>
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Mobile user greeting -->
        <div v-if="userName" class="md:hidden pb-3 pt-2">
          <div
            class="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg"
          >
            <UserCircleIcon class="w-4 h-4 text-blue-600" />
            <span class="text-blue-800 font-medium text-sm"
              >{{ t("nav.hello") }}, {{ userName }}</span
            >
          </div>
        </div>
      </nav>
    </header>

    <main class="flex-1">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <slot />
      </div>
    </main>

    <!-- Dev Login component - only shows in development -->
    <DevLogin />
  </div>
</template>

<style scoped>
/* Navigation link styles */
.nav-link {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
  text-decoration: none;
}

.nav-link:hover {
  color: #2563eb;
  background-color: #dbeafe;
}

.nav-link-primary {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  background-color: #2563eb;
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
  text-decoration: none;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.nav-link-primary:hover {
  background-color: #1d4ed8;
}

.router-link-exact-active.nav-link {
  color: #2563eb;
  background-color: #dbeafe;
}

.router-link-exact-active.nav-link-primary {
  background-color: #1d4ed8;
}

/* Admin dropdown styles */
.admin-dropdown {
  position: relative;
  display: inline-block;
}

.admin-menu-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  background-color: #7c3aed;
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.admin-menu-button:hover {
  background-color: #6d28d9;
}

.admin-dropdown-content {
  display: none;
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 0.25rem;
  width: 12rem;
  background-color: white;
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  z-index: 50;
  overflow: hidden;
}

/* Add a pseudo-element to bridge the gap */
.admin-dropdown-content::before {
  content: "";
  position: absolute;
  top: -0.25rem;
  left: 0;
  right: 0;
  height: 0.25rem;
  background: transparent;
}

.admin-dropdown:hover .admin-dropdown-content {
  display: block;
}

.admin-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #374151;
  text-decoration: none;
  transition: all 0.2s ease-in-out;
}

.admin-link:hover {
  background-color: #f9fafb;
  color: #7c3aed;
}

.admin-link:first-child {
  padding-top: 0.5rem;
}

.admin-link:last-child {
  padding-bottom: 0.5rem;
}

/* Auth button styles */
.logout-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  background-color: #ef4444;
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  border: none;
  cursor: pointer;
}

.logout-button:hover {
  background-color: #dc2626;
}

.signin-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  background: linear-gradient(to right, #10b981, #059669);
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  text-decoration: none;
  transform: translateY(0);
}

.signin-button:hover {
  background: linear-gradient(to right, #059669, #047857);
  transform: translateY(-1px) scale(1.05);
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
  .nav-link,
  .nav-link-primary {
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
  }

  .admin-menu-button,
  .logout-button,
  .signin-button {
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
  }

  .admin-dropdown-content {
    width: 10rem;
  }
}

/* Smooth transitions for better UX */
* {
  scroll-behavior: smooth;
}

/* Enhanced focus states for accessibility */
.nav-link:focus,
.nav-link-primary:focus,
.admin-menu-button:focus,
.logout-button:focus,
.signin-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}
</style>
