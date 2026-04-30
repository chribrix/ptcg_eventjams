<template>
  <div class="max-w-md mx-auto">
    <EventDetailsCard :event-details="eventDetails" />

    <div class="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
      <div class="text-center mb-8">
        <div
          class="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center"
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
        <h1 class="text-2xl font-bold text-gray-900">Login</h1>
        <p class="text-sm text-gray-600 mt-1">
          Melde dich mit E-Mail + Passwort oder E-Mail-Code an
        </p>
      </div>

      <form
        v-if="step === 'email'"
        class="space-y-4"
        @submit.prevent="checkEmail"
      >
        <label class="block text-sm font-medium text-gray-700"
          >E-Mail-Adresse</label
        >
        <input
          v-model="email"
          type="email"
          autocomplete="email"
          required
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="name@example.com"
        />

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition"
        >
          {{ isLoading ? "Prüfe..." : "Weiter" }}
        </button>
      </form>

      <div v-else-if="step === 'method'" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >E-Mail-Adresse</label
          >
          <div
            class="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <span class="text-sm text-gray-800 truncate">{{ email }}</span>
            <button
              type="button"
              class="text-xs text-blue-600 hover:text-blue-700 font-medium"
              @click="backToEmail"
            >
              ändern
            </button>
          </div>
        </div>

        <button
          type="button"
          :disabled="isLoading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition"
          @click="selectOtp"
        >
          Mit E-Mail-Code anmelden
        </button>

        <button
          type="button"
          :disabled="isLoading"
          class="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed font-semibold py-3 px-4 rounded-lg transition"
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
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >E-Mail-Adresse</label
          >
          <div
            class="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <span class="text-sm text-gray-800 truncate">{{ email }}</span>
            <button
              type="button"
              class="text-xs text-blue-600 hover:text-blue-700 font-medium"
              @click="backToEmail"
            >
              ändern
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Passwort</label
          >
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
              class="w-full px-4 py-3 pr-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Passwort"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? "🙈" : "👁️" }}
            </button>
          </div>
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition"
        >
          {{ isLoading ? "Einloggen..." : "Mit Passwort einloggen" }}
        </button>

        <button
          type="button"
          :disabled="isLoading"
          class="w-full text-sm text-gray-500 hover:text-blue-600"
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
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >E-Mail-Adresse</label
          >
          <div
            class="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <span class="text-sm text-gray-800 truncate">{{ email }}</span>
            <button
              type="button"
              class="text-xs text-blue-600 hover:text-blue-700 font-medium"
              @click="backToEmail"
            >
              ändern
            </button>
          </div>
        </div>

        <p class="text-sm text-amber-700">
          Für diesen Account ist noch kein Passwort gesetzt. Bitte jetzt
          Passwort setzen.
        </p>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Neues Passwort</label
          >
          <div class="relative">
            <input
              v-model="newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              autocomplete="new-password"
              required
              minlength="8"
              class="w-full px-4 py-3 pr-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mindestens 8 Zeichen"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              @click="showNewPassword = !showNewPassword"
            >
              {{ showNewPassword ? "🙈" : "👁️" }}
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Passwort wiederholen</label
          >
          <div class="relative">
            <input
              v-model="newPasswordConfirm"
              :type="showNewPasswordConfirm ? 'text' : 'password'"
              autocomplete="new-password"
              required
              minlength="8"
              class="w-full px-4 py-3 pr-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Passwort wiederholen"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              @click="showNewPasswordConfirm = !showNewPasswordConfirm"
            >
              {{ showNewPasswordConfirm ? "🙈" : "👁️" }}
            </button>
          </div>
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition"
        >
          {{
            isLoading ? "Sende Bestätigung..." : "Passwort setzen bestätigen"
          }}
        </button>

        <button
          type="button"
          :disabled="isLoading"
          class="w-full text-sm text-gray-500 hover:text-blue-600"
          @click="backToMethod"
        >
          Zurück zur Methoden-Auswahl
        </button>
      </form>

      <form v-else class="space-y-4" @submit.prevent="submitOtpVerification">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >E-Mail-Adresse</label
          >
          <div
            class="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <span class="text-sm text-gray-800 truncate">{{ email }}</span>
            <button
              type="button"
              class="text-xs text-blue-600 hover:text-blue-700 font-medium"
              @click="backToEmail"
            >
              ändern
            </button>
          </div>
        </div>

        <p class="text-sm text-gray-600">
          Wir senden dir einen sechsstelligen Login-Code per E-Mail.
        </p>

        <p v-if="passwordSetupRequested" class="text-sm text-amber-700">
          Bitte gib den Bestätigungscode aus der E-Mail ein. Danach wird dein
          Passwort aktiviert und du direkt weitergeleitet.
        </p>

        <div v-if="linkSent">
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >E-Mail-Code</label
          >
          <input
            v-model="otpCode"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="123456"
          />
        </div>

        <button
          type="button"
          :disabled="isLoading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition"
          @click="submitOtpRequest"
        >
          {{ isLoading ? "Sende Code..." : "E-Mail-Code senden" }}
        </button>

        <button
          v-if="linkSent"
          type="submit"
          :disabled="isLoading"
          class="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed font-semibold py-3 px-4 rounded-lg transition"
        >
          {{ isLoading ? "Prüfe Code..." : "Code bestätigen" }}
        </button>

        <button
          type="button"
          :disabled="isLoading"
          class="w-full text-sm text-gray-500 hover:text-blue-600"
          @click="backToMethod"
        >
          Zurück zur Methoden-Auswahl
        </button>

        <div
          v-if="linkSent"
          class="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm"
        >
          E-Mail-Code gesendet. Bitte prüfe dein E-Mail-Postfach.
        </div>
      </form>

      <div
        v-if="error"
        class="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
      >
        {{ error }}
      </div>

      <div class="mt-6 pt-6 border-t border-gray-100 text-center">
        <p class="text-sm text-gray-600">
          Noch kein Account?
          <NuxtLink
            :to="registerLink"
            class="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
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
