<template>
  <section class="admin-page-layout" :data-design="design" @keydown.esc="mobileNavOpen = false">
    <div class="admin-frame">
      <header class="workspace-bar">
        <div class="workspace-identity">
          <span class="workspace-mark" aria-hidden="true">CJ</span>
          <span><span class="workspace-eyebrow">ChrispyJams / Workspace</span><strong>Administration</strong></span>
        </div>
        <button class="sidebar-mobile-toggle" type="button" :aria-expanded="mobileNavOpen" aria-controls="admin-sidebar" @click="mobileNavOpen = !mobileNavOpen">
          <Bars3Icon v-if="!mobileNavOpen" aria-hidden="true" /><XMarkIcon v-else aria-hidden="true" /><span>Bereiche</span>
        </button>
        <span class="workspace-context">Plattformverwaltung</span>
      </header>

      <div class="admin-workspace">
        <button v-if="mobileNavOpen" class="sidebar-backdrop" type="button" aria-label="Navigation schließen" @click="mobileNavOpen = false" />
        <aside id="admin-sidebar" class="admin-sidebar" :class="{ 'is-open': mobileNavOpen }" aria-label="Admin-Navigation">
          <div class="sidebar-top"><div class="sidebar-caption">Bereiche</div><button class="sidebar-close" type="button" aria-label="Navigation schließen" @click="mobileNavOpen = false"><XMarkIcon aria-hidden="true" /></button></div>
          <nav aria-label="Adminbereiche">
            <section v-for="group in adminNavigationGroups" :key="group.id" class="sidebar-group">
              <button type="button" class="sidebar-group-trigger" :class="{ 'is-current': activeGroup === group.id }" :aria-expanded="expandedGroups.has(group.id)" :aria-controls="`admin-group-${group.id}`" @click="toggleGroup(group.id)">
                <span>{{ group.label }}</span><ChevronDownIcon class="sidebar-chevron" aria-hidden="true" />
              </button>
              <div v-show="expandedGroups.has(group.id)" :id="`admin-group-${group.id}`" class="sidebar-subitems">
                <NuxtLink v-for="item in groupItems(group.id)" :key="item.to" :to="item.to" class="sidebar-link" :class="{ 'is-active': isActive(item) }" :aria-current="isActive(item) ? 'page' : undefined" @click="mobileNavOpen = false">
                  <component :is="item.icon" class="sidebar-icon" aria-hidden="true" /><span>{{ item.label }}</span>
                </NuxtLink>
              </div>
            </section>
          </nav>
        </aside>

        <div class="admin-main-column">
          <div v-if="title || subtitle || $slots.actions" class="admin-heading">
            <div>
              <p class="admin-heading-eyebrow">{{ activeGroupLabel }}</p>
              <h1>{{ title }}</h1>
              <p v-if="subtitle" class="admin-heading-subtitle">{{ subtitle }}</p>
            </div>
            <div v-if="$slots.actions" class="admin-heading-actions"><slot name="actions" /></div>
          </div>
          <main class="admin-page-content"><slot /></main>
        </div>
      </div>
    </div>

    <aside v-if="isPreviewRoute" class="design-toast" aria-label="Admin-Designvorschau">
      <button class="design-toast-trigger" type="button" :aria-expanded="previewOpen" @click="previewOpen = !previewOpen">
        <span aria-hidden="true">◫</span> Designvorschau <span aria-hidden="true">{{ previewOpen ? '×' : '↑' }}</span>
      </button>
      <div v-if="previewOpen" class="design-toast-body">
        <p>Drei mobile Ansichten vergleichen</p>
        <div class="design-options" role="group" aria-label="Design wählen">
          <button v-for="variant in designVariants" :key="variant.id" type="button" :class="{ selected: design === variant.id }" :aria-pressed="design === variant.id" @click="selectDesign(variant.id)">
            <span class="design-swatch" :class="variant.id" aria-hidden="true"></span>{{ variant.label }}
          </button>
        </div>
      </div>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from "@heroicons/vue/24/outline";
import { adminNavigationGroups, adminNavigationItems, type AdminNavGroup, type AdminNavItem } from "~/utils/adminNavigation";

defineProps<{ title?: string; subtitle?: string }>();
type AdminDesign = "atelier" | "signal" | "editorial";
const designVariants: Array<{ id: AdminDesign; label: string }> = [
  { id: "atelier", label: "Atelier" },
  { id: "signal", label: "Signal" },
  { id: "editorial", label: "Editorial" },
];
const storageKey = "chrispyjams-admin-design-preview";
const design = ref<AdminDesign>("atelier");
const previewOpen = ref(false);
const mobileNavOpen = ref(false);
const expandedGroups = ref(new Set<AdminNavGroup>(["overview", "events"]));
const activeGroup = ref<AdminNavGroup>("overview");
const route = useRoute();
const { showToast } = useToast();
const isPreviewRoute = computed(() => route.path === "/admin-style-preview");
const activeGroupLabel = computed(() => adminNavigationGroups.find((group) => group.id === activeGroup.value)?.label || "Administration");
const isActive = (item: AdminNavItem) =>
  (isPreviewRoute.value && item.to === "/admin") || (item.match?.(route.path) ?? route.path === item.to);
const groupItems = (group: AdminNavGroup) => adminNavigationItems.filter((item) => item.group === group);

watch(() => route.path, (path) => {
  const current = adminNavigationItems.find((item) => item.match?.(path) ?? item.to === path);
  if (current) {
    activeGroup.value = current.group;
    expandedGroups.value = new Set([...expandedGroups.value, current.group]);
  }
  mobileNavOpen.value = false;
  if (path !== "/admin-style-preview") design.value = "atelier";
}, { immediate: true });

onMounted(() => {
  if (!isPreviewRoute.value) return;
  const saved = localStorage.getItem(storageKey);
  if (designVariants.some((variant) => variant.id === saved)) design.value = saved as AdminDesign;
});

function toggleGroup(group: AdminNavGroup) {
  const next = new Set(expandedGroups.value);
  if (next.has(group)) next.delete(group);
  else next.add(group);
  expandedGroups.value = next;
}

function selectDesign(next: AdminDesign) {
  design.value = next;
  localStorage.setItem(storageKey, next);
  showToast(`Admin-Design „${designVariants.find((variant) => variant.id === next)?.label}“ aktiviert`, "info", 2800);
}
</script>
