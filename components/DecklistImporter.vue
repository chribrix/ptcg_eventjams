<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">Decklist Importer</h1>
    <p class="mb-4">Import your decklists from various formats.</p>

    <form class="space-y-4">
      <div class="w-[40%] max-w-[600px]">
        <label for="decklist" class="block text-sm font-medium text-gray-700">
          <h2 class="text-xl font-semibold mb-2">Decklist</h2>
        </label>
        <textarea
          id="decklist"
          rows="10"
          maxlength="4000"
          class="mt-1 block w-full h-[70vh] max-h-[70vh] resize-none overflow-y-auto border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        <button
          type="submit"
          @click="handleSubmit"
          class="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Import Decklist
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const handleSubmit = async (event: Event) => {
  event.preventDefault();
  const { data } = await useFetch("/api/tester");

  if (!data.value) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch data",
      fatal: true,
    });
  }
  console.log(data.value);
};
</script>

<style scoped></style>
