<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">Decklist Importer</h1>
    <p class="mb-4">Import your decklists from various formats.</p>

    <div class="flex flex-row gap-8 h-[80vh]">
      <form class="space-y-4 w-[40%] max-w-[600px] overflow-auto">
        <div>
          <label for="decklist" class="block text-sm font-medium text-gray-700">
            <h2 class="text-xl font-semibold mb-2">Decklist</h2>
          </label>
          <textarea
            id="decklist"
            rows="10"
            maxlength="4000"
            class="mt-1 block w-full h-[70vh] max-h-[70vh] resize-none overflow-y-auto border-gray-300 rounded-md shadow-xl focus:border-blue-500 focus:ring-blue-500"
          />
          <button
            type="submit"
            @click="handleSubmit"
            class="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md shadow-xl hover:bg-blue-700"
          >
            Import Decklist
          </button>
        </div>
      </form>

      <div class="flex flex-col flex-1 overflow-auto">
        <div>
          <h2 class="text-xl font-semibold mb-2">Import Options</h2>
          <ul class="list-disc pl-5 space-y-2">
            <li>Supported formats: plain text, CSV, JSON</li>
            <li>Maximum length: 4000 characters</li>
            <li>Ensure correct formatting for successful import</li>
          </ul>
        </div>

        <div
          v-if="errors"
          class="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
        >
          <h3 class="font-semibold mb-2">Validation Errors:</h3>
          <ul class="list-disc pl-5 space-y-1">
            <li v-for="(error, index) in errors" :key="index">{{ error }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const errors = ref<string[] | null>(null);

const handleSubmit = async (event: Event) => {
  event.preventDefault();

  const decklistInput = document.getElementById(
    "decklist"
  ) as HTMLTextAreaElement;

  const { data } = await useFetch("/api/validate", {
    method: "POST",
    body: JSON.stringify({ decklist: decklistInput.value }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!data.value) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch data",
      fatal: true,
    });
    console.info("Decklist validation response:", data.value);
  }

  if (!data.value?.body?.isValid) {
    errors.value = data.value.body?.errors ?? [];
  } else {
    errors.value = null;
  }
};
</script>

<style scoped></style>
