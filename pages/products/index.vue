<template>
  <div>
    <p>Product City!</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  setup() {
    definePageMeta({
      layout: "products",
    });

    return {};
  },
});
</script>

<style scoped></style>
