<template>
  <section
    class="app-unified-panel"
    :class="{
      'app-unified-panel-compact': compact,
      'app-unified-panel-flush': flush,
    }"
  >
    <header v-if="title || subtitle || $slots.header || $slots.actions" class="app-unified-panel-header">
      <div class="min-w-0">
        <slot name="header">
          <h2 v-if="title" class="app-unified-panel-title">{{ title }}</h2>
          <p v-if="subtitle" class="app-unified-panel-subtitle">{{ subtitle }}</p>
        </slot>
      </div>
      <div v-if="$slots.actions" class="app-unified-panel-actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="app-unified-panel-body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="app-unified-panel-footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    compact?: boolean;
    flush?: boolean;
  }>(),
  { title: undefined, subtitle: undefined, compact: false, flush: false },
);
</script>

<style scoped>
.app-unified-panel {
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 1.25rem;
  background: var(--app-surface-0);
  box-shadow: var(--app-shadow-soft);
}

.app-unified-panel-header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid var(--app-border);
}

.app-unified-panel-title {
  margin: 0;
  color: var(--app-text-primary);
  font-size: 1.15rem;
  font-weight: 700;
}

.app-unified-panel-subtitle {
  margin: 0.25rem 0 0;
  color: var(--app-text-muted);
  font-size: 0.82rem;
}

.app-unified-panel-body {
  padding: 1rem;
}

.app-unified-panel-flush .app-unified-panel-body {
  padding: 0;
}

.app-unified-panel-compact .app-unified-panel-header,
.app-unified-panel-compact .app-unified-panel-body {
  padding: 0.75rem;
}

.app-unified-panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.app-unified-panel-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--app-border);
}

@media (min-width: 640px) {
  .app-unified-panel-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
  }

  .app-unified-panel-body {
    padding: 1.5rem;
  }

  .app-unified-panel-actions {
    justify-content: flex-end;
  }
}
</style>
