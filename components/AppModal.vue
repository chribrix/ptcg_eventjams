<template>
  <Teleport to="body">
    <div
      class="app-unified-modal-overlay"
      :class="{ 'app-unified-modal-overlay-bottom': bottomSheetMobile }"
      role="presentation"
      @click.self="$emit('close')"
    >
      <section
        class="app-unified-modal"
        :class="[
          sizeClass,
          {
            'app-unified-modal-full-mobile': fullHeightMobile,
            'app-unified-modal-bottom-sheet': bottomSheetMobile,
          },
        ]"
        :style="accent ? { '--app-modal-accent': accent } : undefined"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <header class="app-unified-modal-header">
          <div class="min-w-0">
            <p v-if="eyebrow" class="app-unified-modal-eyebrow">{{ eyebrow }}</p>
            <h2 :id="titleId" class="app-unified-modal-title">{{ title }}</h2>
            <p v-if="subtitle" class="app-unified-modal-subtitle">{{ subtitle }}</p>
          </div>
          <button
            type="button"
            class="app-unified-modal-close"
            :aria-label="closeLabel"
            @click="$emit('close')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="app-unified-modal-body" :class="{ 'app-unified-modal-body-flush': flush }">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="app-unified-modal-footer">
          <slot name="footer" />
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useId } from "vue";

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    eyebrow?: string;
    closeLabel?: string;
    size?: "sm" | "md" | "lg" | "xl";
    fullHeightMobile?: boolean;
    bottomSheetMobile?: boolean;
    flush?: boolean;
    accent?: string;
  }>(),
  {
    subtitle: undefined,
    eyebrow: undefined,
    closeLabel: "Schließen",
    size: "md",
    fullHeightMobile: false,
    bottomSheetMobile: false,
    flush: false,
    accent: undefined,
  },
);

const emit = defineEmits<{ close: [] }>();

const titleId = `app-modal-title-${useId()}`;
const sizeClass = computed(() => `app-unified-modal-${props.size}`);

let previousBodyOverflow = "";
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") emit("close");
};

onMounted(() => {
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow;
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<style scoped>
.app-unified-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: var(--app-overlay-strong);
  backdrop-filter: blur(4px);
}

.app-unified-modal {
  display: flex;
  width: 100%;
  max-height: min(92dvh, 56rem);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 1.25rem;
  background: var(--app-surface-elevated);
  box-shadow: var(--app-shadow-strong);
}

.app-unified-modal-sm { max-width: 28rem; }
.app-unified-modal-md { max-width: 36rem; }
.app-unified-modal-lg { max-width: 48rem; }
.app-unified-modal-xl { max-width: 72rem; }

.app-unified-modal-header {
  display: flex;
  flex: none;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--app-border);
}

.app-unified-modal-eyebrow {
  margin: 0 0 0.2rem;
  color: var(--app-modal-accent, var(--app-accent));
  font-size: 0.75rem;
  font-weight: 700;
}

.app-unified-modal-title {
  margin: 0;
  color: var(--app-text-primary);
  font-size: 1.15rem;
  font-weight: 750;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.app-unified-modal-subtitle {
  margin: 0.3rem 0 0;
  color: var(--app-text-muted);
  font-size: 0.82rem;
}

.app-unified-modal-close {
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: transparent;
  color: var(--app-text-muted);
}

.app-unified-modal-close:hover {
  background: var(--app-surface-2);
  color: var(--app-text-primary);
}

.app-unified-modal-close svg {
  width: 1.25rem;
  height: 1.25rem;
}

.app-unified-modal-body {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1rem;
}

.app-unified-modal-body-flush { padding: 0; }

.app-unified-modal-footer {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  border-top: 1px solid var(--app-border);
  background: var(--app-surface-0);
}

@media (max-width: 639px) {
  .app-unified-modal-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .app-unified-modal {
    max-height: 94dvh;
    border-radius: 1.25rem 1.25rem 0 0;
  }

  .app-unified-modal-full-mobile {
    height: 100dvh;
    max-height: 100dvh;
    border-width: 0;
    border-radius: 0;
  }

  .app-unified-modal-header,
  .app-unified-modal-body {
    padding: 0.85rem;
  }
}

@media (min-width: 640px) {
  .app-unified-modal-header { padding: 1.25rem 1.5rem; }
  .app-unified-modal-body { padding: 1.5rem; }
  .app-unified-modal-footer { padding: 1rem 1.5rem; }
  .app-unified-modal-title { font-size: 1.4rem; }
}
</style>
