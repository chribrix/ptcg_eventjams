<template>
  <div>
    <div v-if="error">Error loading card</div>
    <div v-else-if="card">Card: {{ card }}</div>
    <div v-else>Loading...</div>
  </div>
</template>

<script setup lang="ts">
const { data: card, error } = await useFetch("/api/getcard");
</script>

<style lang="scss" scoped></style>
