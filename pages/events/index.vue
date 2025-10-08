<template>
  <div class="events-page">
    <h1 class="page-title">Pokemon TCG Events</h1>
    <div class="events-container">
      <EventCalendar />
      <EventList />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "products",
});
</script>

<style scoped>
.events-page {
  padding: 2rem;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-title {
  margin: 0 0 2rem 0;
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  text-align: center;
}

.events-container {
  display: flex;
  gap: 2rem;
  flex: 1;
  min-height: 0; /* Allow flex children to shrink */
}

/* Responsive layout */
@media (max-width: 1200px) {
  .events-container {
    flex-direction: column;
    gap: 1rem;
  }

  .events-page {
    padding: 1rem;
  }

  .page-title {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
}
</style>
