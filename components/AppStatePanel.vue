<template>
  <div class="app-state-panel" :class="`app-state-${kind}`" role="status">
    <span v-if="kind === 'loading'" class="app-state-spinner" aria-hidden="true" />
    <div>
      <h3 v-if="title">{{ title }}</h3>
      <p><slot>{{ message }}</slot></p>
    </div>
    <div v-if="$slots.actions" class="app-state-actions"><slot name="actions" /></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    kind?: "loading" | "empty" | "error";
    title?: string;
    message?: string;
  }>(),
  { kind: "empty", title: undefined, message: "" },
);
</script>

<style scoped>
.app-state-panel {
  display: flex;
  min-height: 10rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem;
  border: 1px dashed var(--app-border);
  border-radius: 1rem;
  color: var(--app-text-muted);
  text-align: center;
}

.app-state-panel h3,
.app-state-panel p {
  margin: 0;
}

.app-state-panel h3 {
  color: var(--app-text-primary);
  font-size: 1.05rem;
}

.app-state-panel p {
  margin-top: 0.25rem;
  font-size: 0.9rem;
}

.app-state-error {
  border-style: solid;
  border-color: var(--app-feedback-error-border);
  background: var(--app-feedback-error-bg);
  color: var(--app-feedback-error-text);
}

.app-state-spinner {
  width: 1.75rem;
  height: 1.75rem;
  border: 3px solid var(--app-border);
  border-top-color: var(--app-accent);
  border-radius: 999px;
  animation: app-state-spin 0.8s linear infinite;
}

.app-state-actions {
  margin-top: 0.25rem;
}

@keyframes app-state-spin {
  to { transform: rotate(360deg); }
}
</style>
