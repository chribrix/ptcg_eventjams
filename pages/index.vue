<template>
  <template>
    <div>
      <div v-if="error">Error loading card</div>
      <div v-else-if="card">Card: {{ card }}</div>
      <div v-else>Loading...</div>
    </div>
  </template>
</template>

<script setup lang="ts">
const { data: card, error } = await useFetch("/api/getcard");

if (error) {
  console.error("Error fetching card:", error);
} else {
  console.log("Fetched card:", card);
}
</script>

<style lang="scss" scoped></style>
