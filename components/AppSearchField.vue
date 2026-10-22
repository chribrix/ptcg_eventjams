<template>
  <label class="app-search-field">
    <span v-if="label" class="app-search-label">{{ label }}</span>
    <span class="app-search-control">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
      </svg>
      <input
        v-model="model"
        type="search"
        :placeholder="placeholder"
        :aria-label="label || placeholder || 'Suche'"
        @keyup.enter="$emit('submit')"
      />
    </span>
  </label>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ label?: string; placeholder?: string }>(), {
  label: undefined,
  placeholder: "Suchen …",
});
defineEmits<{ submit: [] }>();
const model = defineModel<string>({ default: "" });
</script>

<style scoped>
.app-search-field {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 0.35rem;
}

.app-search-label {
  color: var(--app-text-secondary);
  font-size: 0.78rem;
  font-weight: 650;
}

.app-search-control {
  position: relative;
  display: block;
}

.app-search-control svg {
  position: absolute;
  top: 50%;
  left: 0.8rem;
  width: 1.1rem;
  height: 1.1rem;
  transform: translateY(-50%);
  color: var(--app-text-muted);
  pointer-events: none;
}

.app-search-control input {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.6rem 0.8rem 0.6rem 2.55rem;
  border: 1px solid var(--app-border);
  border-radius: 0.8rem;
  background: var(--app-surface-1);
  color: var(--app-text-primary);
  font-size: 1rem;
}

.app-search-control input:focus {
  outline: none;
  border-color: var(--app-accent);
  box-shadow: 0 0 0 3px var(--app-focus-ring);
}
</style>
