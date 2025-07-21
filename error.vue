<template>
  <div class="container error-page">
    <h1>Error {{ error.statusCode }}</h1>
    <p>{{ error.message }}</p>
    <p>Please try again later or contact support if the issue persists.</p>
    <nuxt-link to="/">Go back to home</nuxt-link>
  </div>
</template>

<script setup>
defineProps({
  error: {
    type: {
      message: String,
      statusCode: Number,
    },
    required: true,
  },
});
</script>

<style lang="scss" scoped></style>
