<template>
  <div>hi</div>
</template>

<script lang="ts">
import type { Card } from "~/generated/prisma/client";

export default {};
const response = await $fetch("/api/getcard", {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
}).catch((error) => {
  console.error("Error fetching card:", error);
});

if (response && response.card) {
  const card = response.card;
  console.log("Fetched card:", card);
} else {
  console.log("No card found or error occurred.");
}
</script>

<style lang="scss" scoped></style>
