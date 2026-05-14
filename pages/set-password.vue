<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div
      class="app-surface-0 shadow-xl rounded-2xl p-8 w-full max-w-md border app-border"
    >
      <!-- Success state -->
      <div v-if="success" class="text-center space-y-4">
        <div
          class="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--app-button-green-border)] bg-[var(--app-button-green)]"
        >
          <svg
            class="w-8 h-8 text-[var(--app-button-green-text)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 class="text-2xl font-bold app-text-primary">Passwort gesetzt!</h2>
        <p class="app-text-secondary">
          Du kannst dich ab jetzt mit deinem Passwort einloggen.
        </p>
        <button
          @click="navigateTo(returnPath)"
          class="app-action-button app-action-primary w-full py-3"
        >
          Weiter
        </button>
      </div>

      <!-- Form state -->
      <div v-else>
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 class="mb-2 text-2xl font-bold app-text-primary">
            Passwort festlegen
          </h2>
          <p class="text-sm app-text-secondary">
            Lege ein Passwort fest, um dich künftig damit einloggen zu können.
          </p>
        </div>

        <form @submit.prevent="submit" class="space-y-5">
          <!-- Password -->
          <div>
            <label class="mb-1 block text-sm font-medium app-text-secondary"
              >Passwort</label
            >
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Mindestens 8 Zeichen"
                class="app-input w-full px-4 py-3 pr-12"
                required
                minlength="8"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-3 flex items-center app-text-muted hover:text-white"
              >
                <svg
                  v-if="showPassword"
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
                <svg
                  v-else
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
            </div>
            <!-- Strength indicator -->
            <div class="mt-2 flex gap-1">
              <div
                v-for="i in 4"
                :key="i"
                class="h-1 flex-1 rounded-full transition-colors"
                :class="strength >= i ? strengthColor : 'bg-[var(--app-surface-3)]'"
              />
            </div>
            <p class="mt-1 text-xs app-text-muted">{{ strengthLabel }}</p>
          </div>

          <!-- Confirm password -->
          <div>
            <label class="mb-1 block text-sm font-medium app-text-secondary"
              >Passwort bestätigen</label
            >
            <div class="relative">
              <input
                v-model="passwordConfirm"
                :type="showConfirm ? 'text' : 'password'"
                placeholder="Passwort wiederholen"
                class="app-input w-full px-4 py-3 pr-12"
                :class="
                  passwordConfirm && password !== passwordConfirm
                    ? 'border-[var(--app-button-red-border)]'
                    : ''
                "
                required
              />
              <button
                type="button"
                @click="showConfirm = !showConfirm"
                class="absolute inset-y-0 right-3 flex items-center app-text-muted hover:text-white"
              >
                <svg
                  v-if="showConfirm"
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
                <svg
                  v-else
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
            </div>
            <p
              v-if="passwordConfirm && password !== passwordConfirm"
              class="mt-1 text-xs text-[var(--app-feedback-error-text)]"
            >
              Passwörter stimmen nicht überein.
            </p>
          </div>

          <div
            v-if="error"
            class="app-feedback-danger rounded-lg px-4 py-3 text-sm"
          >
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="
              loading || password !== passwordConfirm || password.length < 8
            "
            class="app-action-button app-action-primary w-full py-3"
          >
            {{ loading ? "Wird gespeichert..." : "Passwort speichern" }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const supabase = useSupabaseClient();

const password = ref("");
const passwordConfirm = ref("");
const showPassword = ref(false);
const showConfirm = ref(false);
const loading = ref(false);
const error = ref("");
const success = ref(false);

const returnPath = computed(
  () => (route.query.return as string) || "/dashboard",
);

// Password strength
const strength = computed(() => {
  const p = password.value;
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) score++;
  return score;
});
const strengthColor = computed(() => {
  if (strength.value <= 1) return "app-strength-weak";
  if (strength.value === 2) return "app-strength-medium";
  if (strength.value === 3) return "app-strength-strong";
  return "app-strength-very-strong";
});
const strengthLabel = computed(() => {
  if (!password.value) return "";
  if (strength.value <= 1) return "Schwach";
  if (strength.value === 2) return "Mittel";
  if (strength.value === 3) return "Stark";
  return "Sehr stark";
});

const submit = async () => {
  error.value = "";
  if (password.value !== passwordConfirm.value) {
    error.value = "Passwörter stimmen nicht überein.";
    return;
  }
  if (password.value.length < 8) {
    error.value = "Passwort muss mindestens 8 Zeichen haben.";
    return;
  }

  loading.value = true;

  // Get current session access token to authenticate the server call
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    error.value =
      "Du bist nicht eingeloggt. Bitte bestätige dich zuerst per E-Mail-Code oder Passwort.";
    loading.value = false;
    return;
  }

  try {
    await $fetch("/api/auth/set-password", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { password: password.value },
    });
    success.value = true;
  } catch (err: any) {
    error.value =
      err?.data?.statusMessage ||
      err?.message ||
      "Fehler beim Speichern des Passworts.";
  } finally {
    loading.value = false;
  }
};
</script>
