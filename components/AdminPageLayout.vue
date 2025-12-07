<template>
  <div class="admin-page-layout">
    <div class="admin-container">
      <!-- Page Header -->
      <div class="admin-page-header">
        <div class="header-content">
          <h1 class="page-title">{{ title }}</h1>
          <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
        </div>
        <div v-if="$slots.actions" class="header-actions">
          <slot name="actions" />
        </div>
      </div>

      <!-- Main Content -->
      <div class="admin-page-content">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<style scoped>
.admin-page-layout {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f8fafc, #f1f5f9);
  padding: 1rem;
}

.admin-container {
  max-width: 1400px;
  margin: 0 auto;
}

.admin-page-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  font-size: 0.95rem;
  color: #64748b;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.admin-page-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Tablet and up */
@media (min-width: 768px) {
  .admin-page-layout {
    padding: 1.5rem;
  }

  .admin-page-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 2rem;
  }

  .page-title {
    font-size: 2.25rem;
    margin-bottom: 0.25rem;
  }

  .header-actions {
    flex-wrap: nowrap;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .admin-page-layout {
    padding: 2rem;
  }

  .admin-page-content {
    gap: 2rem;
  }
}
</style>
