<template>
  <div class="flex">
    <EventCalendar />
    <div class="admin-container">
      <h1>Add New Event</h1>
      <form @submit.prevent="submitForm">
        <label>
          Title:
          <input v-model="form.title" type="text" required />
        </label>

        <label>
          Start Date:
          <input v-model="form.start" type="date" required />
        </label>

        <label>
          End Date:
          <input v-model="form.end" type="date" />
        </label>

        <label>
          Type:
          <select v-model="form.type" required>
            <option value="" disabled>Select type</option>
            <option value="external">External</option>
            <option value="cup">Cup</option>
            <option value="local">Local</option>
          </select>
        </label>

        <button type="submit" :disabled="loading">
          {{ loading ? "Submitting..." : "Add Event" }}
        </button>

        <p v-if="successMessage" class="success">{{ successMessage }}</p>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";

interface EventForm {
  title: string;
  start: string;
  end?: string;
  type: "external" | "cup" | "local" | "";
}

const form = reactive<EventForm>({
  title: "",
  start: "",
  end: "",
  type: "",
});

const loading = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

async function submitForm() {
  loading.value = true;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    const response = await $fetch("/api/events", {
      method: "POST",
      body: {
        title: form.title,
        start: form.start,
        end: form.end || undefined,
        type: form.type,
      },
    });

    successMessage.value = "Event added successfully!";
    form.title = "";
    form.start = "";
    form.end = "";
    form.type = "";
  } catch (error: unknown) {
    const errorObj = error as { statusMessage?: string };
    errorMessage.value = errorObj.statusMessage || "Failed to add event.";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.admin-container {
  max-width: 400px;
  margin: 2rem auto;
  padding: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-family: Arial, sans-serif;
}

label {
  display: block;
  margin-bottom: 1rem;
}

input,
select {
  width: 100%;
  padding: 0.4rem;
  margin-top: 0.3rem;
  box-sizing: border-box;
}

button {
  padding: 0.6rem 1rem;
  background-color: #0069d9;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #8ab4f8;
  cursor: not-allowed;
}

.success {
  color: green;
  margin-top: 1rem;
}

.error {
  color: red;
  margin-top: 1rem;
}
</style>
