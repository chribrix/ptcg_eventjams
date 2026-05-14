<template>
  <div class="max-w-md mx-auto">
    <EventDetailsCard :event-details="eventDetails" />

    <div class="app-surface-0 shadow-xl rounded-2xl p-8 border app-border">
      <div class="text-center mb-8">
        <div
          class="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center border border-[var(--app-button-blue-border)] bg-[var(--app-button-blue)]"
        >
          <svg
            class="w-7 h-7 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12H3m0 0l4-4m-4 4l4 4m13-8v8a2 2 0 01-2 2h-5"
            />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Login</h1>
        <p class="mt-1 text-sm app-text-secondary">
          Melde dich mit E-Mail + Passwort oder E-Mail-Code an
        </p>
      </div>

      <form
        v-if="step === 'email'"
        class="space-y-4"
        @submit.prevent="checkEmail"
      >
        <label class="block text-sm font-medium app-text-secondary"
          >E-Mail-Adresse</label
        >
        <input
          v-model="email"
          type="email"
          autocomplete="email"
          required
          class="app-input px-4 py-3"
          placeholder="name@example.com"
        />

        <button
          type="submit"
          :disabled="isLoading"
          class="app-action-button app-action-primary w-full"
        >
          {{ isLoading ? "Prüfe..." : "Weiter" }}
        </button>
      </form>

      <div v-else-if="step === 'method'" class="space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium app-text-secondary"
            >E-Mail-Adresse</label
          >
          <div
            class="flex items-center justify-between px-3 py-2 app-surface-2 border app-border rounded-lg"
          >
            <span class="truncate text-sm app-text-primary">{{ email }}</span>
            <button
              type="button"
              class="text-xs font-medium text-[var(--app-accent-soft)] hover:text-white"
              @click="backToEmail"
            >
              ändern
            </button>
          </div>
        </div>

        <button
          type="button"
          :disabled="isLoading"
          class="app-action-button app-action-primary w-full"
          @click="selectOtp"
        >
          {{ isLoading ? "Sende Code..." : "Mit E-Mail-Code anmelden" }}
        </button>

        <button
          type="button"
          :disabled="isLoading"
          class="app-action-button app-action-secondary w-full"
          @click="selectPassword"
        >
          Mit Passwort anmelden
        </button>
      </div>

      <form
        v-else-if="step === 'password'"
        class="space-y-4"
        @submit.prevent="submitPasswordLogin"
      >
        <div>
          <label class="mb-1 block text-sm font-medium app-text-secondary"
            >E-Mail-Adresse</label
          >
          <div
            class="flex items-center justify-between px-3 py-2 app-surface-2 border app-border rounded-lg"
          >
            <span class="truncate text-sm app-text-primary">{{ email }}</span>
            <button
              type="button"
              class="text-xs font-medium text-[var(--app-accent-soft)] hover:text-white"
              @click="backToEmail"
            >
              ändern
            </button>
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium app-text-secondary"
            >Passwort</label
          >
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
              class="app-input px-4 py-3 pr-11"
              placeholder="Passwort"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 app-text-muted hover:text-white"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? "🙈" : "👁️" }}
            </button>
          </div>
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="app-action-button app-action-primary w-full"
        >
          {{ isLoading ? "Einloggen..." : "Mit Passwort einloggen" }}
        </button>

        <button
          type="button"
          :disabled="isLoading"
          class="w-full text-sm app-text-muted hover:text-[var(--app-accent-soft)]"
          @click="backToMethod"
        >
          Zurück zur Methoden-Auswahl
        </button>
      </form>

      <form
        v-else-if="step === 'passwordSetup'"
        class="space-y-4"
        @submit.prevent="submitInitialPasswordAndLogin"
      >
        <div>
          <label class="mb-1 block text-sm font-medium app-text-secondary"
            >E-Mail-Adresse</label
          >
          <div
            class="flex items-center justify-between px-3 py-2 app-surface-2 border app-border rounded-lg"
          >
            <span class="truncate text-sm app-text-primary">{{ email }}</span>
            <button
              type="button"
              class="text-xs font-medium text-[var(--app-accent-soft)] hover:text-white"
              @click="backToEmail"
            >
              ändern
            </button>
          </div>
        </div>

        <p class="text-sm text-[var(--app-text-muted)]">
          Für diesen Account ist noch kein Passwort gesetzt. Bitte jetzt
          Passwort setzen.
        </p>

        <div>
          <label class="mb-1 block text-sm font-medium app-text-secondary"
            >Neues Passwort</label
          >
          <div class="relative">
            <input
              v-model="newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              autocomplete="new-password"
              required
              minlength="8"
              class="app-input px-4 py-3 pr-11"
              placeholder="Mindestens 8 Zeichen"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 app-text-muted hover:text-white"
              @click="showNewPassword = !showNewPassword"
            >
              {{ showNewPassword ? "🙈" : "👁️" }}
            </button>
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium app-text-secondary"
            >Passwort wiederholen</label
          >
          <div class="relative">
            <input
              v-model="newPasswordConfirm"
              :type="showNewPasswordConfirm ? 'text' : 'password'"
              autocomplete="new-password"
              required
              minlength="8"
              class="app-input px-4 py-3 pr-11"
              placeholder="Passwort wiederholen"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 app-text-muted hover:text-white"
              @click="showNewPasswordConfirm = !showNewPasswordConfirm"
            >
              {{ showNewPasswordConfirm ? "🙈" : "👁️" }}
            </button>
          </div>
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="app-action-button app-action-primary w-full"
        >
          {{
            isLoading ? "Sende Bestätigung..." : "Passwort setzen bestätigen"
          }}
        </button>

        <button
          type="button"
          :disabled="isLoading"
          class="w-full text-sm app-text-muted hover:text-[var(--app-accent-soft)]"
          @click="backToMethod"
        >
          Zurück zur Methoden-Auswahl
        </button>
      </form>

      <form v-else class="space-y-4" @submit.prevent="submitOtpVerification">
        <div>
          <label class="mb-1 block text-sm font-medium app-text-secondary"
            >E-Mail-Adresse</label
          >
          <div
            class="flex items-center justify-between px-3 py-2 app-surface-2 border app-border rounded-lg"
          >
            <span class="truncate text-sm app-text-primary">{{ email }}</span>
            <button
              type="button"
              class="text-xs font-medium text-[var(--app-accent-soft)] hover:text-white"
              @click="backToEmail"
            >
              ändern
            </button>
          </div>
        </div>

        <p class="text-sm app-text-secondary">
          Wir senden dir einen 6-stelligen Login-Code per E-Mail.
        </p>

        <p v-if="passwordSetupRequested" class="text-sm text-[var(--app-text-muted)]">
          Bitte gib den Bestätigungscode aus der E-Mail ein. Danach wird dein
          Passwort aktiviert und du direkt weitergeleitet.
        </p>

        <div v-if="linkSent">
          <label class="mb-1 block text-sm font-medium app-text-secondary"
            >E-Mail-Code</label
          >
          <input
            v-model="otpCode"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="8"
            class="app-input px-4 py-3"
            placeholder="12345678"
          />
        </div>

        <button
          v-if="linkSent"
          type="submit"
          :disabled="isLoading"
          class="app-action-button app-action-primary w-full"
        >
          {{ isLoading ? "Prüfe Code..." : "Code bestätigen" }}
        </button>

        <button
          v-if="linkSent"
          type="button"
          :disabled="isLoading"
          class="app-action-button app-action-secondary w-full"
          @click="submitOtpRequest"
        >
          {{ isLoading ? "Sende Code..." : "Code erneut senden" }}
        </button>

        <button
          type="button"
          :disabled="isLoading"
          class="w-full text-sm app-text-muted hover:text-[var(--app-accent-soft)]"
          @click="backToMethod"
        >
          Zurück zur Methoden-Auswahl
        </button>

        <div
          v-if="linkSent"
          class="app-feedback-success rounded-lg px-4 py-3 text-sm"
        >
          E-Mail-Code gesendet. Bitte prüfe dein E-Mail-Postfach.
        </div>
      </form>

      <div
        v-if="error"
        class="mt-4 app-feedback-danger rounded-lg px-4 py-3 text-sm"
      >
        {{ error }}
      </div>

      <div class="mt-6 pt-6 border-t app-border text-center">
        <p class="text-sm app-text-secondary">
          Noch kein Account?
          <NuxtLink
            :to="registerLink"
            class="font-semibold text-[var(--app-accent-soft)] hover:text-white hover:underline"
          >
            Jetzt registrieren
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLoginWorkflow } from "~/composables/useLoginWorkflow";

const route = useRoute();

const {
  step,
  email,
  password,
  otpCode,
  newPassword,
  newPasswordConfirm,
  showPassword,
  showNewPassword,
  showNewPasswordConfirm,
  hasPassword,
  linkSent,
  passwordSetupRequested,
  error,
  isLoading,
  eventDetails,
  backToEmail,
  backToMethod,
  checkEmail,
  selectPassword,
  selectOtp,
  submitPasswordLogin,
  submitInitialPasswordAndLogin,
  submitOtpRequest,
  submitOtpVerification,
} = useLoginWorkflow();

const registerLink = computed(() => {
  const redirect =
    typeof route.query.redirect === "string" ? route.query.redirect : "";
  return redirect
    ? `/register?redirect=${encodeURIComponent(redirect)}`
    : "/register";
});
</script>
