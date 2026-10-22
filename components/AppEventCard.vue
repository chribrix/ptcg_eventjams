<template>
  <article
    class="app-event-card"
    :class="{
      'app-event-card-interactive': interactive,
      'app-event-card-muted': muted,
      'app-event-card-compact': compact,
    }"
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive ? 0 : undefined"
  >
    <slot v-if="bare" />
    <template v-else>
    <div v-if="$slots.eyebrow" class="app-event-card-eyebrow">
      <slot name="eyebrow" />
    </div>

    <div class="app-event-card-layout">
      <div v-if="$slots.leading" class="app-event-card-leading">
        <slot name="leading" />
      </div>

      <div class="app-event-card-content">
        <div v-if="$slots.badges" class="app-event-card-badges">
          <slot name="badges" />
        </div>

        <div class="app-event-card-heading-row">
          <div class="min-w-0 flex-1">
            <component :is="headingTag" class="app-event-card-title">
              {{ title }}
            </component>
            <div v-if="$slots.subtitle" class="app-event-card-subtitle">
              <slot name="subtitle" />
            </div>
          </div>
          <div v-if="$slots.aside" class="app-event-card-aside">
            <slot name="aside" />
          </div>
        </div>

        <div v-if="dateLabel || venue || $slots.meta" class="app-event-card-meta">
          <div v-if="dateLabel" class="app-event-card-meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
            </svg>
            <span>{{ dateLabel }}</span>
          </div>
          <div v-if="venue" class="app-event-card-meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657 13.414 20.9a2 2 0 0 1-2.828 0l-4.243-4.243a8 8 0 1 1 11.314 0Z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            <span>{{ venue }}</span>
          </div>
          <slot name="meta" />
        </div>

        <div v-if="$slots.default" class="app-event-card-body">
          <slot />
        </div>
      </div>
    </div>

    <footer v-if="$slots.actions" class="app-event-card-actions" @click.stop>
      <slot name="actions" />
    </footer>
    </template>
  </article>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    dateLabel?: string;
    venue?: string;
    headingTag?: "h2" | "h3" | "h4";
    interactive?: boolean;
    muted?: boolean;
    compact?: boolean;
    bare?: boolean;
  }>(),
  {
    title: "",
    dateLabel: undefined,
    venue: undefined,
    headingTag: "h3",
    interactive: false,
    muted: false,
    compact: false,
    bare: false,
  },
);
</script>

<style scoped>
.app-event-card {
  position: relative;
  overflow: hidden;
  padding: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 1.25rem;
  background: var(--app-surface-0);
  box-shadow: var(--app-shadow-soft);
  color: var(--app-text-primary);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.app-event-card-interactive {
  cursor: pointer;
}

.app-event-card-interactive:hover {
  border-color: color-mix(in srgb, var(--app-accent) 45%, var(--app-border));
  box-shadow: var(--app-shadow-strong);
  transform: translateY(-1px);
}

.app-event-card-interactive:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 2px;
}

.app-event-card-muted {
  background: color-mix(in srgb, var(--app-surface-0) 86%, var(--app-surface-2));
  opacity: 0.88;
}

.app-event-card-eyebrow {
  margin-bottom: 0.65rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--app-border);
  color: var(--app-text-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.app-event-card-layout {
  display: flex;
  min-width: 0;
  gap: 0.75rem;
}

.app-event-card-leading,
.app-event-card-aside {
  flex: none;
}

.app-event-card-content {
  min-width: 0;
  flex: 1;
}

.app-event-card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.45rem;
}

.app-event-card-heading-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.app-event-card-title {
  margin: 0;
  color: var(--app-text-primary);
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.app-event-card-subtitle {
  margin-top: 0.35rem;
  color: var(--app-text-muted);
  font-size: 0.8rem;
}

.app-event-card-meta {
  display: grid;
  gap: 0.35rem;
  margin-top: 0.65rem;
  color: var(--app-text-secondary);
  font-size: 0.82rem;
}

.app-event-card-meta-row {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.45rem;
}

.app-event-card-meta-row svg {
  width: 1rem;
  height: 1rem;
  flex: none;
  margin-top: 0.08rem;
  color: var(--app-text-muted);
}

.app-event-card-meta-row span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.app-event-card-body {
  margin-top: 0.75rem;
  color: var(--app-text-secondary);
  font-size: 0.85rem;
}

.app-event-card-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  margin-top: 0.85rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--app-border);
}

.app-event-card-compact {
  padding: 0.8rem;
  border-radius: 1rem;
}

@media (min-width: 640px) {
  .app-event-card {
    padding: 1.25rem;
    border-radius: 1.5rem;
  }

  .app-event-card-title {
    font-size: 1.2rem;
  }

  .app-event-card-meta {
    font-size: 0.9rem;
  }
}
</style>
