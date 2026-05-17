<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import {
  CalendarDaysIcon,
  DocumentIcon,
  Cog6ToothIcon as CogIcon,
  ArrowRightOnRectangleIcon,
  UserPlusIcon,
  UserCircleIcon,
  ChartBarIcon,
  MoonIcon,
  SunIcon,
} from "@heroicons/vue/24/outline";
import siteLogo from "~/assets/images/logo.png";

// Mobile menu state
const mobileMenuOpen = ref(false);

// Use our enhanced auth composable with centralized state
const {
  user: authUser,
  userName,
  ensureValidSession,
  clearInvalidSession,
  logout,
} = useAuth();

// Admin composable - now uses server-side verification
const { isAdmin, user: adminUser, loading } = useAdmin();
const { theme, initializeTheme, toggleTheme } = useColorTheme();

type HeaderRegistration = {
  entryType?: "registration" | "bookmark";
  customEventId: string | null;
  status: string;
  customEvent?: {
    id: string;
    eventDate: string;
    status: string;
  };
};

const myTournamentTarget = ref<string | null>(null);
const myTournamentCount = ref(0);
const sessionReady = ref(false);
let myTournamentTimer: ReturnType<typeof setInterval> | null = null;

// Mobile logout handler - close menu first, then logout
const handleMobileLogout = async () => {
  mobileMenuOpen.value = false;
  // Small delay to let menu close animation complete
  await new Promise((resolve) => setTimeout(resolve, 150));
  await logout();
};

const loadMyTournamentNav = async () => {
  if (!sessionReady.value) {
    return;
  }

  if (!authUser.value) {
    myTournamentTarget.value = null;
    myTournamentCount.value = 0;
    return;
  }

  try {
    const registrations = await $fetch<HeaderRegistration[]>(
      "/api/dashboard/registrations",
    );
    const now = Date.now();
    const eligible = (registrations || [])
      .filter((registration) => registration.entryType !== "bookmark")
      .filter((registration) => registration.customEventId && registration.customEvent?.id)
      .filter((registration) => registration.status !== "cancelled")
      .filter((registration) => {
        const status = registration.customEvent?.status;
        return status === "upcoming" || status === "ongoing" || status === "on_hold";
      })
      .filter((registration) => {
        const eventDate = new Date(registration.customEvent!.eventDate).getTime();
        return now >= eventDate - 15 * 60 * 1000;
      })
      .sort(
        (a, b) =>
          new Date(a.customEvent!.eventDate).getTime() -
          new Date(b.customEvent!.eventDate).getTime(),
      );

    myTournamentCount.value = eligible.length;
    myTournamentTarget.value =
      eligible.length > 0 ? `/tournaments/${eligible[0].customEvent!.id}` : null;
  } catch {
    myTournamentTarget.value = null;
    myTournamentCount.value = 0;
  }
};

onMounted(async () => {
  initializeTheme();

  // Ensure session is valid on mount and cleanup if expired
  if (authUser.value) {
    try {
      const validUser = await ensureValidSession();
      // If session validation failed (expired/invalid), clean up
      if (!validUser && authUser.value) {
        await clearInvalidSession();
        if (process.client) {
          await navigateTo("/", { replace: true });
        }
      }
    } catch {
      await clearInvalidSession();
      if (process.client) {
        await navigateTo("/", { replace: true });
      }
    }
  }

  sessionReady.value = true;
  await loadMyTournamentNav();
  myTournamentTimer = setInterval(loadMyTournamentNav, 60_000);
});

// Watch for auth state changes - no need to set userName, it's computed in useAuth
watch(
  [authUser, adminUser],
  async ([newAuthUser, newAdminUser]) => {
    // Session validation happens automatically through useAuth
    // userName is now a computed property from useAuth
    await loadMyTournamentNav();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (myTournamentTimer) {
    clearInterval(myTournamentTimer);
    myTournamentTimer = null;
  }
});

const route = useRoute();

const isAdminRoute = computed(() => route.path.startsWith("/admin"));

// Set up internationalization
const { t } = useI18n();
</script>

<template>
  <div class="min-h-screen app-bg-page overflow-x-hidden">
    <!-- Impersonation Banner -->
    <ImpersonationBanner />

    <!-- Toast Container -->
    <ToastContainer />

    <header class="app-surface-0 shadow-lg border-b app-border">
      <nav class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16 md:h-20">
          <!-- Left side - Logo/Brand -->
          <div class="flex items-center space-x-4">
            <NuxtLink
              to="/"
              class="mobile-brand flex items-center space-x-3 app-text-primary transition-colors duration-200 hover:opacity-90"
            >
              <img
                :src="siteLogo"
                alt="PTCG Event Manager"
                class="header-logo flex-shrink-0"
              />
              <span class="mobile-brand-title">ChrispyJams TCG Events</span>
            </NuxtLink>
          </div>

          <!-- Right side - Navigation and Mobile Menu Button -->
          <div class="flex items-center space-x-2">
            <!-- Mobile Menu Button -->
            <button
              @click="mobileMenuOpen = !mobileMenuOpen"
              class="md:hidden p-2 rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
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

                <NuxtLink
                  v-if="myTournamentTarget"
                  :to="myTournamentTarget"
                  class="nav-link"
                >
                  <DocumentIcon class="w-4 h-4" />
                  <span>{{ t("nav.myTournaments") }}</span>
                  <span v-if="myTournamentCount > 1" class="nav-count">{{ myTournamentCount }}</span>
                </NuxtLink>

                <!-- Dashboard (also available for guests with local bookmarks) -->
                <NuxtLink
                  to="/dashboard"
                  :class="userName ? 'nav-link-primary' : 'nav-link'"
                >
                  <ChartBarIcon class="w-4 h-4" />
                  <span>{{ t("nav.dashboard") }}</span>
                </NuxtLink>
              </div>

              <NuxtLink v-if="isAdmin" to="/admin" class="admin-menu-button">
                <CogIcon class="w-4 h-4" />
                <span class="hidden sm:inline">{{ t("nav.admin") }}</span>
              </NuxtLink>

              <!-- Language Switcher & Auth Actions -->
              <div class="flex items-center space-x-3 ml-4 pl-4 border-l app-border">
                <button
                  type="button"
                  class="theme-toggle-button"
                  :aria-label="
                    theme === 'dark'
                      ? 'Zum hellen Theme wechseln'
                      : 'Zum dunklen Theme wechseln'
                  "
                  @click="toggleTheme"
                >
                  <SunIcon v-if="theme === 'dark'" class="w-4 h-4" />
                  <MoonIcon v-else class="w-4 h-4" />
                </button>

                <!-- Language Switcher -->
                <LanguageSwitcher />

                <!-- User Menu for authenticated users -->
                <UserMenu v-if="userName" />

                <!-- Sign in/register for non-authenticated users -->
                <NuxtLink v-else to="/login" class="signin-button">
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
          class="md:hidden border-t app-border app-surface-0"
        >
          <div class="px-4 pt-2 pb-3 space-y-1">
            <!-- Mobile Navigation Links -->
            <NuxtLink
              to="/eventlist"
              @click="mobileMenuOpen = false"
              class="flex items-center space-x-3 px-3 py-2 text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-2)] rounded-lg"
            >
              <CalendarDaysIcon class="w-5 h-5" />
              <span>{{ t("nav.events") }}</span>
            </NuxtLink>

            <NuxtLink
              v-if="myTournamentTarget"
              :to="myTournamentTarget"
              @click="mobileMenuOpen = false"
              class="flex items-center space-x-3 px-3 py-2 text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-2)] rounded-lg"
            >
              <DocumentIcon class="w-5 h-5" />
              <span>{{ t("nav.myTournaments") }}</span>
              <span v-if="myTournamentCount > 1" class="nav-count">{{ myTournamentCount }}</span>
            </NuxtLink>

            <!-- Dashboard (also available for guests with local bookmarks) -->
            <NuxtLink
              to="/dashboard"
              @click="mobileMenuOpen = false"
              class="flex items-center space-x-3 px-3 py-2 text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-2)] rounded-lg"
            >
              <ChartBarIcon class="w-5 h-5" />
              <span>{{ t("nav.dashboard") }}</span>
            </NuxtLink>

            <!-- Admin menu items for mobile -->
            <div v-if="isAdmin">
              <NuxtLink
                to="/admin"
                @click="mobileMenuOpen = false"
                class="flex items-center space-x-3 px-3 py-2 text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-2)] rounded-lg"
              >
                <CogIcon class="w-5 h-5" />
                <span>{{ t("nav.admin") }}</span>
              </NuxtLink>
            </div>

            <!-- Language Switcher -->
            <div class="px-3 py-2 flex items-center justify-between gap-3">
              <button
                type="button"
                class="theme-toggle-button"
                :aria-label="
                  theme === 'dark'
                    ? 'Zum hellen Theme wechseln'
                    : 'Zum dunklen Theme wechseln'
                "
                @click="toggleTheme"
              >
                <SunIcon v-if="theme === 'dark'" class="w-4 h-4" />
                <MoonIcon v-else class="w-4 h-4" />
                <span>{{ theme === "dark" ? "Light" : "Dark" }}</span>
              </button>
              <LanguageSwitcher />
            </div>

            <!-- Authentication buttons -->
            <div class="border-t app-border pt-3 mt-3">
              <NuxtLink
                v-if="userName"
                to="/profile"
                @click="mobileMenuOpen = false"
                class="flex items-center space-x-3 px-3 py-2 text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-2)] rounded-lg"
              >
                <UserCircleIcon class="w-5 h-5" />
                <span>{{ t("nav.profile") }}</span>
              </NuxtLink>

              <!-- Logout button for authenticated users -->
              <button
                v-if="userName"
                @click="handleMobileLogout"
                class="flex w-full items-center space-x-3 rounded-lg px-3 py-2 hover:bg-[var(--app-surface-2)]"
                style="color: var(--app-button-red);"
              >
                <ArrowRightOnRectangleIcon class="w-5 h-5" />
                <span>{{ t("nav.logout") }}</span>
              </button>

              <!-- Sign in/register for non-authenticated users -->
              <NuxtLink
                v-else
                to="/login"
                @click="mobileMenuOpen = false"
                class="flex items-center space-x-3 px-3 py-2 text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-2)] rounded-lg"
              >
                <UserPlusIcon class="w-5 h-5" />
                <span>{{ t("nav.login") }}</span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <main class="flex-1">
      <div v-if="isAdminRoute" class="admin-route-shell">
        <slot />
      </div>
      <div
        v-else
        class="container mx-auto"
        :class="route.path === '/' ? 'px-2 pt-1 pb-6 sm:px-6 lg:px-8' : 'px-4 py-6 sm:px-6 lg:px-8'"
      >
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.admin-route-shell {
  width: 100%;
}

/* Navigation link styles */
.nav-link {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--app-button-blue-text);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--app-button-blue) 84%, white),
      color-mix(in srgb, var(--app-button-green) 68%, var(--app-button-blue))
    );
  border: 1px solid color-mix(in srgb, var(--app-button-blue-border) 68%, white);
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
  text-decoration: none;
  box-shadow: var(--app-shadow-soft);
}

.nav-link:hover {
  color: var(--app-button-blue-text);
  filter: brightness(1.05) saturate(1.04);
  transform: translateY(-1px);
}

.nav-link-primary {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--app-button-blue-text);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--app-button-blue) 90%, white),
      color-mix(in srgb, var(--app-button-amber) 40%, var(--app-button-blue))
    );
  border: 1px solid color-mix(in srgb, var(--app-button-blue-border) 72%, white);
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
  text-decoration: none;
  box-shadow: var(--app-shadow-soft);
}

.nav-link-primary:hover {
  filter: brightness(1.06) saturate(1.06);
  transform: translateY(-1px);
}

.router-link-exact-active.nav-link {
  border-color: color-mix(in srgb, var(--app-accent) 72%, white);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 0 0 2px var(--app-focus-ring-soft),
    var(--app-shadow-soft);
}

.router-link-exact-active.nav-link-primary {
  border-color: color-mix(in srgb, var(--app-accent) 72%, white);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 0 0 2px var(--app-focus-ring-soft),
    var(--app-shadow-soft);
}

.admin-menu-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--app-button-amber-text);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--app-button-amber) 88%, white),
      color-mix(in srgb, var(--app-button-red) 24%, var(--app-button-amber))
    );
  border: 1px solid color-mix(in srgb, var(--app-button-amber-border) 72%, white);
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  box-shadow: var(--app-shadow-soft);
}

.admin-menu-button:hover {
  filter: brightness(1.06) saturate(1.05);
  transform: translateY(-1px);
}

/* Auth button styles */
.logout-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--app-button-red-text);
  background-color: var(--app-button-red);
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
  box-shadow: var(--app-shadow-soft);
  border: none;
  cursor: pointer;
}

.logout-button:hover {
  background-color: var(--app-button-red-hover);
}

.signin-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--app-button-green-text);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--app-button-green) 88%, white),
      color-mix(in srgb, var(--app-button-blue) 42%, var(--app-button-green))
    );
  border: 1px solid color-mix(in srgb, var(--app-button-green-border) 72%, white);
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
  box-shadow: var(--app-shadow-soft);
  text-decoration: none;
  transform: translateY(0);
}

.signin-button:hover {
  filter: brightness(1.06) saturate(1.05);
  transform: translateY(-1px);
}

.theme-toggle-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.25rem;
  padding: 0.5rem 0.8rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--app-feedback-info-text);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--app-feedback-info-bg) 88%, white),
      color-mix(in srgb, var(--app-badge-info-bg) 56%, var(--app-feedback-info-bg))
    );
  border: 1px solid color-mix(in srgb, var(--app-feedback-info-border) 76%, white);
  border-radius: 9999px;
  box-shadow: var(--app-shadow-soft);
  transition:
    background-color 0.2s ease-in-out,
    color 0.2s ease-in-out,
    border-color 0.2s ease-in-out,
    transform 0.2s ease-in-out;
}

.theme-toggle-button:hover {
  color: var(--app-feedback-info-text);
  filter: brightness(1.05) saturate(1.04);
  transform: translateY(-1px);
}

.nav-count {
  margin-left: 0.25rem;
  min-width: 1.1rem;
  height: 1.1rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  background: var(--app-chip-info-bg);
  color: var(--app-chip-info-text);
  padding: 0 0.3rem;
}

.mobile-brand {
  font-weight: 800;
  min-height: 100%;
}

.header-logo {
  height: 3.9rem;
  width: auto;
  display: block;
  object-fit: contain;
  object-position: center;
}

.mobile-brand-title {
  font-size: clamp(1.15rem, 3.8vw, 1.75rem);
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -0.01em;
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

@media (min-width: 768px) {
  .header-logo {
    height: 4.9rem;
  }

  .mobile-brand-title {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0;
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
.signin-button:focus,
.theme-toggle-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--app-focus-ring-strong);
}
</style>
