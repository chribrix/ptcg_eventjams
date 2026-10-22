<template>
  <div class="app-form-field" :class="{ 'app-form-field-inline': inline }">
    <label v-if="label" class="app-form-field-label" :for="forId">
      {{ label }}<span v-if="required" aria-hidden="true"> *</span>
    </label>
    <div class="app-form-field-control">
      <slot />
    </div>
    <p v-if="error" class="app-form-field-error" role="alert">{{ error }}</p>
    <p v-else-if="hint" class="app-form-field-hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
    forId?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    inline?: boolean;
  }>(),
  {
    label: undefined,
    forId: undefined,
    hint: undefined,
    error: undefined,
    required: false,
    inline: false,
  },
);
</script>

<style scoped>
.app-form-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.35rem;
}

.app-form-field-label {
  color: var(--app-text-secondary);
  font-size: 0.82rem;
  font-weight: 650;
}

.app-form-field-control :deep(.app-input),
.app-form-field-control :deep(.form-input),
.app-form-field-control :deep(input:not([type="checkbox"]):not([type="radio"])),
.app-form-field-control :deep(select),
.app-form-field-control :deep(textarea) {
  width: 100%;
  min-height: 2.75rem;
}

.app-form-field-hint,
.app-form-field-error {
  margin: 0;
  font-size: 0.74rem;
  line-height: 1.35;
}

.app-form-field-hint { color: var(--app-text-muted); }
.app-form-field-error { color: var(--app-danger-text, #ef4444); }

.app-form-field-inline {
  display: grid;
  grid-template-columns: minmax(7rem, 0.35fr) minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem 1rem;
}

.app-form-field-inline .app-form-field-hint,
.app-form-field-inline .app-form-field-error {
  grid-column: 2;
}
</style>
