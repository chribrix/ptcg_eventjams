<template>
  <div class="min-h-screen app-bg-page px-4 py-8 sm:px-6">
    <div class="mx-auto max-w-7xl">
      <EventList />
    </div>
  </div>
</template>

<script setup>
// Page metadata
useHead({
  title: "Pokemon TCG Event List",
  meta: [
    {
      name: "description",
      content: "List of all Pokemon TCG events ordered by date",
    },
  ],
});
</script>
