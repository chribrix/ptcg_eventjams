<template>
  <div class="app-data-table-shell">
    <div class="app-data-table-scroll">
      <table class="app-data-table">
        <slot />
      </table>
    </div>
  </div>
</template>

<style scoped>
.app-data-table-shell {
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  background: var(--app-surface-0);
}

.app-data-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.app-data-table {
  width: 100%;
  border-collapse: collapse;
  color: var(--app-text-secondary);
  font-size: 0.9rem;
}

.app-data-table :deep(th) {
  padding: 0.75rem;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-surface-1);
  color: var(--app-text-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.app-data-table :deep(td) {
  padding: 0.75rem;
  border-bottom: 1px solid var(--app-divider-subtle);
  vertical-align: middle;
}

.app-data-table :deep(tbody tr:last-child td) {
  border-bottom: 0;
}

.app-data-table :deep(tbody tr:hover) {
  background: var(--app-surface-1);
}

@media (min-width: 640px) {
  .app-data-table :deep(th),
  .app-data-table :deep(td) {
    padding: 0.9rem 1rem;
  }
}
</style>
