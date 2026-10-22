<template>
  <div class="admin-page-layout">
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="sidebar-branding">
          <p class="sidebar-eyebrow">Admin Panel</p>
          <h2 class="sidebar-title">PTCG Event Jams</h2>
        </div>

        <nav class="sidebar-nav" aria-label="Admin sections">
          <NuxtLink
            v-for="item in adminNavigationItems"
            :key="item.to"
            :to="item.to"
            class="sidebar-link"
            :class="{ 'sidebar-link-active': isActive(item) }"
          >
            <component :is="item.icon" class="sidebar-link-icon" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>
      </aside>

      <div class="admin-main">
        <div class="admin-mobile-toolbar">
          <nav class="admin-mobile-links" aria-label="Admin sections">
            <NuxtLink
              v-for="item in adminNavigationItems"
              :key="item.to"
              :to="item.to"
              class="admin-mobile-link"
              :class="{ 'admin-mobile-link-active': isActive(item) }"
            >
              <component :is="item.icon" class="sidebar-link-icon" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </nav>
        </div>

        <div class="admin-container">
          <AppPageHeader
            v-if="title || subtitle || $slots.actions"
            class="mb-4 sm:mb-6"
            :title="title || ''"
            :subtitle="subtitle"
          >
            <template v-if="$slots.actions" #actions>
              <slot name="actions" />
            </template>
          </AppPageHeader>

          <div class="admin-page-content">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  adminNavigationItems,
  type AdminNavItem,
} from "~/utils/adminNavigation";

const props = defineProps<{
  title?: string;
  subtitle?: string;
}>();

const route = useRoute();
const currentPath = computed(() => route.path);

const isActive = (item: AdminNavItem) => {
  if (item.match) {
    return item.match(currentPath.value);
  }

  return currentPath.value === item.to;
};

</script>

<style scoped>
.admin-page-layout {
  --admin-surface: var(--app-surface-0);
  --admin-surface-strong: var(--app-surface-elevated);
  --admin-surface-soft: var(--app-surface-2);
  --admin-border: var(--app-border);
  --admin-border-strong: var(--app-surface-3);
  --admin-text: var(--app-text-secondary);
  --admin-text-strong: var(--app-text-primary);
  --admin-muted: var(--app-text-muted);
  --admin-muted-soft: var(--app-text-secondary);
  --admin-accent: var(--app-accent);
  --admin-hover: var(--app-surface-2);
  --admin-input: var(--app-surface-1);
  min-height: 100vh;
  background: var(--app-bg-page);
  padding: 0.5rem;
}

.admin-shell {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  width: 100%;
}

.admin-sidebar {
  display: none;
}

.admin-main {
  flex: 1;
  min-width: 0;
}

.admin-container {
  width: 100%;
  max-width: none;
}

.admin-mobile-toolbar {
  display: flex;
  margin-bottom: 1rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.admin-mobile-toolbar::-webkit-scrollbar {
  display: none;
}

.admin-mobile-links {
  display: flex;
  gap: 0.5rem;
  min-width: max-content;
  padding: 0.1rem;
}

.admin-mobile-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  background: var(--admin-surface);
  color: var(--admin-muted-soft);
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.admin-mobile-link-active {
  background: var(--app-surface-2);
  color: var(--admin-text-strong);
  box-shadow: inset 0 0 0 1px var(--admin-border-strong);
}

.admin-page-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--admin-surface);
  border-radius: 24px;
  box-shadow: var(--app-shadow-strong);
  border: 1px solid var(--admin-border);
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--admin-text-strong);
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  font-size: 0.95rem;
  color: var(--admin-muted);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.admin-page-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (max-width: 639px) {
  .admin-mobile-toolbar {
    margin-bottom: 0.65rem;
  }

  .admin-mobile-link {
    padding: 0.58rem 0.7rem;
  }

  .admin-page-content {
    gap: 1rem;
  }
}

.sidebar-branding {
  margin-bottom: 1.75rem;
}

.sidebar-eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--admin-accent);
}

.sidebar-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--admin-text-strong);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.85rem 0.95rem;
  border-radius: 14px;
  text-decoration: none;
  color: var(--admin-muted-soft);
  font-weight: 600;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.sidebar-link:hover {
  background: var(--admin-hover);
  color: var(--admin-text-strong);
  transform: translateX(2px);
}

.sidebar-link-active {
  background: var(--app-surface-2);
  color: var(--admin-text-strong);
  box-shadow: inset 0 0 0 1px var(--admin-border-strong);
}

.sidebar-link-icon {
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
}

/* Tablet and up */
@media (min-width: 768px) {
  .admin-page-layout {
    padding: 1.5rem;
  }

  .admin-page-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 2rem;
  }

  .page-title {
    font-size: 2.25rem;
    margin-bottom: 0.25rem;
  }

  .header-actions {
    flex-wrap: nowrap;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .admin-page-layout {
    padding: 2rem 2rem 2rem 0;
  }

  .admin-sidebar {
    position: sticky;
    top: 2rem;
    display: block;
    width: 280px;
    flex-shrink: 0;
    min-height: calc(100vh - 4rem);
    padding: 1.5rem;
    border-radius: 0 28px 28px 0;
    background: var(--app-surface-0);
    box-shadow: var(--app-shadow-strong);
    border: 1px solid var(--admin-border);
  }

  .admin-mobile-toolbar {
    display: none;
  }

  .admin-page-content {
    gap: 2rem;
  }
}
</style>
