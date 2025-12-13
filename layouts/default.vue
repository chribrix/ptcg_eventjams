<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import {
  CalendarDaysIcon,
  DocumentIcon,
  Cog6ToothIcon as CogIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  UserPlusIcon,
  ChevronDownIcon,
  ClockIcon,
  ChartBarIcon,
  CalendarIcon,
  PlusCircleIcon,
  UsersIcon,
} from "@heroicons/vue/24/outline";

const userName = ref<string | null>(null);
const supabase = useSupabaseClient();

// Mobile menu state
const mobileMenuOpen = ref(false);

// Use our enhanced auth composable
const { user: authUser, checkDevAuth, clearDevAuth } = useAuth();

// Admin composable - now uses server-side verification
const { isAdmin, user: adminUser, loading } = useAdmin();

// Admin dropdown state
const adminDropdownOpen = ref(false);
const dropdownTimeout = ref<NodeJS.Timeout | null>(null);

const showAdminDropdown = () => {
  if (dropdownTimeout.value) {
    clearTimeout(dropdownTimeout.value);
    dropdownTimeout.value = null;
  }
  adminDropdownOpen.value = true;
};

const hideAdminDropdown = () => {
  dropdownTimeout.value = setTimeout(() => {
    adminDropdownOpen.value = false;
  }, 100); // Small delay to prevent flicker when moving mouse between elements
};

// Logout function
const logout = async () => {
  try {
    // Sign out from Supabase and wait for completion
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Supabase signOut error:", error);
    }

    // Clear dev cookies and state if in dev mode
    if (process.dev) {
      document.cookie =
        "dev-user-id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      document.cookie =
        "dev-user-email=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      clearDevAuth();
    }

    // Clear local storage (Supabase session storage)
    if (process.client) {
      localStorage.clear();
      sessionStorage.clear();
    }

    userName.value = null;

    // Small delay to ensure signOut completes before reload
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Reload the page to clear all user data
    if (process.client) {
      window.location.href = "/";
    }
  } catch (error) {
    console.error("Error during logout:", error);
    // Force reload even if there's an error
    if (process.client) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    }
  }
};

// Mobile logout handler - close menu first, then logout
const handleMobileLogout = async () => {
  mobileMenuOpen.value = false;
  // Small delay to let menu close animation complete
  await new Promise((resolve) => setTimeout(resolve, 150));
  await logout();
};

onMounted(async () => {
  // Check Supabase auth first
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData?.session?.user;

  if (sessionUser) {
    userName.value = sessionUser.user_metadata.name || sessionUser.email;
  } else if (process.dev) {
    // In development, check for dev auth
    const devAuthResult = await checkDevAuth();
    if (devAuthResult) {
      userName.value = devAuthResult.user_metadata.name || devAuthResult.email;
    }
  }
});

// Watch for auth state changes
watch(
  [authUser, adminUser],
  ([newAuthUser, newAdminUser]) => {
    if (newAuthUser) {
      userName.value = newAuthUser.user_metadata?.name || newAuthUser.email;
    } else if (newAdminUser) {
      userName.value = newAdminUser.user_metadata?.name || newAdminUser.email;
    } else {
      userName.value = null;
    }
  },
  { immediate: true }
);

// Set up internationalization
const { t } = useI18n();
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-r from-white via-purple-50 to-purple-100 overflow-x-hidden"
  >
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

          <!-- Right side - Navigation and Mobile Menu Button -->
          <div class="flex items-center space-x-2">
            <!-- Mobile Menu Button -->
            <button
              @click="mobileMenuOpen = !mobileMenuOpen"
              class="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div class="w-5 h-5 flex flex-col justify-center items-center">
                <span
                  :class="mobileMenuOpen ? 'rotate-45 translate-y-1' : ''"
                  class="block w-5 h-0.5 bg-current transition-transform duration-200"
                ></span>
                <span
                  :class="mobileMenuOpen ? 'opacity-0' : ''"
                  class="block w-5 h-0.5 bg-current mt-1 transition-opacity duration-200"
                ></span>
                <span
                  :class="mobileMenuOpen ? '-rotate-45 -translate-y-1' : ''"
                  class="block w-5 h-0.5 bg-current mt-1 transition-transform duration-200"
                ></span>
              </div>
            </button>

            <!-- Desktop Navigation -->
            <div class="hidden md:flex items-center space-x-4">
              <!-- Main Navigation -->
              <div class="flex items-center space-x-1">
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
                  <ChartBarIcon class="w-4 h-4" />
                  <span>{{ t("nav.dashboard") }}</span>
                </NuxtLink>
              </div>

              <!-- Admin Dropdown -->
              <div
                v-if="isAdmin"
                class="relative"
                @mouseleave="hideAdminDropdown"
              >
                <div class="admin-dropdown" @mouseenter="showAdminDropdown">
                  <button class="admin-menu-button" @click="showAdminDropdown">
                    <CogIcon class="w-4 h-4" />
                    <span class="hidden sm:inline">{{ t("nav.admin") }}</span>
                    <ChevronDownIcon
                      class="w-3 h-3 ml-1 transform transition-transform duration-200"
                      :class="{ 'rotate-180': adminDropdownOpen }"
                    />
                  </button>

                  <!-- Admin Dropdown Menu -->
                  <div
                    v-show="adminDropdownOpen"
                    class="admin-dropdown-content"
                    @mouseleave="hideAdminDropdown"
                  >
                    <NuxtLink
                      to="/admin/custom-events"
                      class="admin-link"
                      @click="hideAdminDropdown"
                    >
                      <PlusCircleIcon class="w-4 h-4" />
                      <span>{{ t("nav.customEvents") }}</span>
                    </NuxtLink>
                    <NuxtLink
                      to="/admin/events"
                      class="admin-link"
                      @click="hideAdminDropdown"
                    >
                      <CalendarIcon class="w-4 h-4" />
                      <span>{{ t("nav.manageEvents") }}</span>
                    </NuxtLink>
                    <NuxtLink
                      to="/admin/players"
                      class="admin-link"
                      @click="hideAdminDropdown"
                    >
                      <UsersIcon class="w-4 h-4" />
                      <span>{{ t("nav.managePlayers") }}</span>
                    </NuxtLink>
                    <NuxtLink
                      to="/admin/external-events"
                      class="admin-link"
                      @click="hideAdminDropdown"
                    >
                      <CogIcon class="w-4 h-4" />
                      <span>External Events</span>
                    </NuxtLink>
                    <NuxtLink
                      to="/admin/events/history"
                      class="admin-link"
                      @click="hideAdminDropdown"
                    >
                      <ClockIcon class="w-4 h-4" />
                      <span>{{ t("nav.eventHistory") }}</span>
                    </NuxtLink>
                    <NuxtLink
                      to="/importer"
                      class="admin-link"
                      @click="hideAdminDropdown"
                    >
                      <DocumentIcon class="w-4 h-4" />
                      <span>{{ t("nav.importer") }}</span>
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
        </div>

        <!-- Mobile Navigation Panel -->
        <div
          v-if="mobileMenuOpen"
          class="md:hidden border-t border-gray-200 bg-white"
        >
          <div class="px-4 pt-2 pb-3 space-y-1">
            <!-- Mobile Navigation Links -->
            <NuxtLink
              to="/eventlist"
              @click="mobileMenuOpen = false"
              class="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <CalendarDaysIcon class="w-5 h-5" />
              <span>{{ t("nav.events") }}</span>
            </NuxtLink>

            <!-- Dashboard for logged-in users -->
            <NuxtLink
              v-if="userName"
              to="/dashboard"
              @click="mobileMenuOpen = false"
              class="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <ChartBarIcon class="w-5 h-5" />
              <span>{{ t("nav.dashboard") }}</span>
            </NuxtLink>

            <!-- Admin menu items for mobile -->
            <div v-if="isAdmin">
              <NuxtLink
                to="/admin"
                @click="mobileMenuOpen = false"
                class="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <CogIcon class="w-5 h-5" />
                <span>{{ t("nav.admin") }}</span>
              </NuxtLink>

              <NuxtLink
                to="/admin/events"
                @click="mobileMenuOpen = false"
                class="flex items-center space-x-3 px-3 py-2 ml-4 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <CalendarIcon class="w-4 h-4" />
                <span>{{ t("nav.manageEvents") }}</span>
              </NuxtLink>

              <NuxtLink
                to="/admin/custom-events"
                @click="mobileMenuOpen = false"
                class="flex items-center space-x-3 px-3 py-2 ml-4 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <PlusCircleIcon class="w-4 h-4" />
                <span>{{ t("nav.customEvents") }}</span>
              </NuxtLink>

              <NuxtLink
                to="/admin/players"
                @click="mobileMenuOpen = false"
                class="flex items-center space-x-3 px-3 py-2 ml-4 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <UsersIcon class="w-4 h-4" />
                <span>{{ t("nav.managePlayers") }}</span>
              </NuxtLink>

              <NuxtLink
                to="/importer"
                @click="mobileMenuOpen = false"
                class="flex items-center space-x-3 px-3 py-2 ml-4 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <DocumentIcon class="w-4 h-4" />
                <span>{{ t("nav.importer") }}</span>
              </NuxtLink>
            </div>

            <!-- Language Switcher -->
            <div class="px-3 py-2">
              <LanguageSwitcher />
            </div>

            <!-- Authentication buttons -->
            <div class="border-t border-gray-200 pt-3 mt-3">
              <!-- Logout button for authenticated users -->
              <button
                v-if="userName"
                @click="handleMobileLogout"
                class="flex items-center space-x-3 w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <ArrowRightOnRectangleIcon class="w-5 h-5" />
                <span>{{ t("nav.logout") }}</span>
              </button>

              <!-- Sign in/register for non-authenticated users -->
              <NuxtLink
                v-else
                to="/register"
                @click="mobileMenuOpen = false"
                class="flex items-center space-x-3 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <UserPlusIcon class="w-5 h-5" />
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
}

.admin-menu-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
}

.admin-menu-button:hover {
  background-color: #e5e7eb;
  border-color: #9ca3af;
}

.admin-dropdown-content {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 50;
  min-width: 12rem;
  margin-top: 0.25rem;
  background-color: white;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.admin-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #374151;
  text-decoration: none;
  transition: all 0.2s ease-in-out;
  border-bottom: 1px solid #f3f4f6;
}

.admin-link:last-child {
  border-bottom: none;
}

.admin-link:hover {
  background-color: #f9fafb;
  color: #2563eb;
}

.admin-link:focus {
  outline: none;
  background-color: #f3f4f6;
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
