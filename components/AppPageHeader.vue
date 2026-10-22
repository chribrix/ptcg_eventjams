<template>
  <header
    class="app-page-header"
    :class="{
      'app-page-header-embedded': embedded,
      'app-page-header-compact': compact,
    }"
  >
    <div class="app-page-header-copy">
      <p v-if="eyebrow" class="app-page-header-eyebrow">{{ eyebrow }}</p>
      <component :is="headingTag" class="app-page-header-title">
        {{ title }}
      </component>
      <p v-if="subtitle" class="app-page-header-subtitle">{{ subtitle }}</p>
    </div>

    <div v-if="$slots.aside || $slots.actions" class="app-page-header-side">
      <div v-if="$slots.aside" class="app-page-header-aside">
        <slot name="aside" />
      </div>
      <div v-if="$slots.actions" class="app-page-header-actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    eyebrow?: string;
    headingTag?: "h1" | "h2";
    embedded?: boolean;
    compact?: boolean;
  }>(),
  {
    subtitle: undefined,
    eyebrow: undefined,
    headingTag: "h1",
    embedded: false,
    compact: false,
  },
);
</script>

<style scoped>
.app-page-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 1.25rem;
  background: var(--app-surface-0);
  box-shadow: var(--app-shadow-soft);
}

.app-page-header-embedded {
  border: 0;
  border-bottom: 1px solid var(--app-border);
  border-radius: 0;
  box-shadow: none;
}

.app-page-header-copy {
  min-width: 0;
  flex: 1;
}

.app-page-header-eyebrow {
  margin: 0 0 0.35rem;
  color: var(--app-accent);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.app-page-header-title {
  margin: 0;
  color: var(--app-text-primary);
  font-size: clamp(1.5rem, 5vw, 2.25rem);
  font-weight: 750;
  line-height: 1.12;
  letter-spacing: -0.025em;
}

.app-page-header-subtitle {
  max-width: 48rem;
  margin: 0.45rem 0 0;
  color: var(--app-text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.app-page-header-side,
.app-page-header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.app-page-header-side {
  flex-direction: column;
}

.app-page-header-aside {
  min-width: 0;
}

.app-page-header-compact {
  padding: 0.85rem 1rem;
}

@media (min-width: 640px) {
  .app-page-header {
    padding: 1.4rem 1.5rem;
  }

  .app-page-header:not(.app-page-header-compact) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .app-page-header-side {
    align-items: flex-end;
  }

  .app-page-header-actions {
    justify-content: flex-end;
  }
}
</style>
