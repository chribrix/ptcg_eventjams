<template>
  <div class="container mx-auto px-4 py-8">
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
