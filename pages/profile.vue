<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
    <div class="max-w-2xl mx-auto px-4">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div
          class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
        ></div>
      </div>

      <!-- Profile Form -->
      <div
        v-else
        class="bg-white shadow-xl rounded-2xl p-8 border border-gray-100"
      >
        <div class="text-center mb-8">
          <div
            class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center"
          >
            <svg
              class="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p class="text-gray-600">Update your personal information</p>
        </div>

        <form @submit.prevent="updateProfile" class="space-y-6">
          <!-- Player ID -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Player ID *
            </label>
            <input
              v-model="form.playerId"
              type="text"
              inputmode="numeric"
              pattern="\d*"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
              required
              @input="validatePlayerId"
            />
            <p class="text-xs text-gray-500 mt-1">Your Pokemon TCG player ID</p>
          </div>

          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              v-model="form.name"
              type="text"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
              required
            />
          </div>

          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              v-model="form.email"
              type="email"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
              required
            />
          </div>

          <!-- Birth Date -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Birth Date
            </label>
            <input
              v-model="birthDateInput"
              type="date"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
            />
          </div>

          <!-- Actions -->
          <div class="flex gap-4 pt-4">
            <button
              type="submit"
              :disabled="saving"
              class="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-400 disabled:to-purple-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              <span v-if="saving">Saving...</span>
              <span v-else>Save Changes</span>
            </button>
            <NuxtLink
              to="/"
              class="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
            >
              Cancel
            </NuxtLink>
          </div>
        </form>

        <!-- Success Message -->
        <div
          v-if="successMessage"
          class="mt-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg"
        >
          <div class="flex items-center space-x-2">
            <svg
              class="w-5 h-5 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="font-medium">{{ successMessage }}</span>
          </div>
        </div>

        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
        >
          <p class="font-medium">{{ errorMessage }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const loading = ref(true);
const saving = ref(false);
const successMessage = ref("");
const errorMessage = ref("");
const birthDateInput = ref("");

const form = ref({
  playerId: "",
  name: "",
  email: "",
});

const validatePlayerId = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  const value = target.value;
  const numericOnly = value.replace(/\D/g, "");
  form.value.playerId = numericOnly;
  target.value = numericOnly;
};

onMounted(async () => {
  try {
    const response = await $fetch("/api/players/profile");

    form.value = {
      playerId: response.player.playerId,
      name: response.player.name,
      email: response.player.email || "",
    };

    // Format birthDate for input
    if (response.player.birthDate) {
      const date = new Date(response.player.birthDate);
      birthDateInput.value = date.toISOString().split("T")[0];
    }
  } catch (err) {
    console.error("Error loading profile:", err);
    errorMessage.value = "Failed to load profile data";
  } finally {
    loading.value = false;
  }
});

const updateProfile = async () => {
  saving.value = true;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    // Convert birthDate to ISO string if provided
    let birthDate: string | undefined;
    if (birthDateInput.value) {
      birthDate = new Date(
        birthDateInput.value + "T00:00:00.000Z"
      ).toISOString();
    }

    await $fetch("/api/players/profile", {
      method: "PUT",
      body: {
        ...form.value,
        birthDate,
      },
    });

    successMessage.value = "Profile updated successfully!";

    // Clear success message after 3 seconds
    setTimeout(() => {
      successMessage.value = "";
    }, 3000);
  } catch (err: any) {
    console.error("Error updating profile:", err);
    errorMessage.value =
      err?.data?.message || err?.message || "Failed to update profile";
  } finally {
    saving.value = false;
  }
};
</script>
