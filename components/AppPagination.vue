<template>
  <nav v-if="pages > 1" class="app-pagination" aria-label="Seitennavigation">
    <button type="button" :disabled="page <= 1" @click="$emit('change', page - 1)">
      ‹ <span>{{ previousLabel }}</span>
    </button>
    <span class="app-pagination-status">{{ page }} / {{ pages }}</span>
    <button type="button" :disabled="page >= pages" @click="$emit('change', page + 1)">
      <span>{{ nextLabel }}</span> ›
    </button>
  </nav>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    page: number;
    pages: number;
    previousLabel?: string;
    nextLabel?: string;
  }>(),
  { previousLabel: "Zurück", nextLabel: "Weiter" },
);
defineEmits<{ change: [page: number] }>();
</script>

<style scoped>
.app-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.app-pagination button {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  padding: 0.45rem 0.8rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-surface-1);
  color: var(--app-text-secondary);
  font-weight: 650;
}

.app-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.app-pagination-status {
  color: var(--app-text-muted);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
</style>
