<template>
  <div class="min-h-screen app-bg-page py-8">
    <div class="max-w-2xl mx-auto px-4">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div
          class="h-12 w-12 animate-spin rounded-full border-4 border-[var(--app-button-blue)] border-t-transparent"
        ></div>
      </div>

      <!-- Profile Form -->
      <div
        v-else
        class="app-surface-0 shadow-xl rounded-2xl p-8 border app-border"
      >
        <div class="text-center mb-8">
          <div
            class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--app-button-blue-border)] bg-[var(--app-button-blue)]"
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
          <h1 class="mb-2 text-3xl font-bold app-text-primary">My Profile</h1>
          <p class="app-text-secondary">Update your personal information</p>
        </div>

        <form @submit.prevent="updateProfile" class="space-y-6">
          <!-- Player ID -->
          <div>
            <label class="mb-2 block text-sm font-medium app-text-secondary">
              Player ID *
            </label>
            <input
              v-model="form.playerId"
              type="text"
              inputmode="numeric"
              pattern="\d*"
              class="app-input w-full px-4 py-3"
              required
              @input="validatePlayerId"
            />
            <p class="mt-1 text-xs app-text-muted">Your Pokemon TCG player ID</p>
          </div>

          <!-- Name -->
          <div>
            <label class="mb-2 block text-sm font-medium app-text-secondary">
              Full Name *
            </label>
            <input
              v-model="form.name"
              type="text"
              class="app-input w-full px-4 py-3"
              required
            />
          </div>

          <!-- Email -->
          <div>
            <label class="mb-2 block text-sm font-medium app-text-secondary">
              Email *
            </label>
            <input
              v-model="form.email"
              type="email"
              class="app-input w-full px-4 py-3"
              required
            />
          </div>

          <!-- Birth Date -->
          <div>
            <label class="mb-2 block text-sm font-medium app-text-secondary">
              Birth Date
            </label>
            <input
              v-model="birthDateInput"
              type="date"
              class="app-input w-full px-4 py-3"
            />
          </div>

          <!-- Actions -->
          <div class="flex gap-4 pt-4">
            <button
              type="submit"
              :disabled="saving"
              class="app-action-button app-action-primary flex-1 px-6 py-3"
            >
              <span v-if="saving">Saving...</span>
              <span v-else>Save Changes</span>
            </button>
            <NuxtLink
              to="/"
              class="app-action-button app-action-secondary px-6 py-3"
            >
              Cancel
            </NuxtLink>
          </div>
        </form>

        <div class="mt-6 border-t app-border pt-6">
          <NuxtLink
            to="/set-password?return=/profile"
            class="app-action-button app-action-secondary px-4 py-3"
          >
            Change Password
          </NuxtLink>
        </div>

        <!-- Success Message -->
        <div
          v-if="successMessage"
          class="mt-6 app-feedback-success rounded-lg px-4 py-3"
        >
          <div class="flex items-center space-x-2">
            <svg
              class="h-5 w-5 text-[var(--app-feedback-success-text)]"
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
          class="mt-6 app-feedback-danger rounded-lg px-4 py-3"
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
