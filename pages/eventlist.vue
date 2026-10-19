<template>
  <div class="min-h-screen app-bg-page px-2 py-4 sm:px-6 sm:py-8">
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
