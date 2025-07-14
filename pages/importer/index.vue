<template>
  <DecklistImporter></DecklistImporter>
</template>

<script>
export default {
  name: "ImporterPage",
  setup() {
    definePageMeta({
      layout: "default",
    });
  },
};

useHead({
  title: "Importer",
  meta: [
    {
      name: "description",
      content: "Import your decklists easily with our importer tool.",
    },
  ],
});
</script>

<style lang="scss" scoped></style>
