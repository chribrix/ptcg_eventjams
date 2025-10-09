<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-center mb-8">Pokemon TCG Events</h1>
    <EventList />
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
