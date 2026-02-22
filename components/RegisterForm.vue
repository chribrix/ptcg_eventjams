<template>
  <div
    class="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md mx-auto border border-gray-100"
  >
    <div class="text-center mb-8">
      <div
        class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center"
      >
        <UserPlusIcon class="w-8 h-8 text-white" />
      </div>
      <h2 class="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
    </div>

    <form @submit.prevent="submitForm" class="space-y-6">
      <div class="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          type="button"
          class="py-2 text-sm font-semibold rounded-md transition"
          :class="
            registerMethod === 'password'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          "
          @click="registerMethod = 'password'"
        >
          {{ t("registerForm.methodPasswordDefault") }}
        </button>
        <button
          type="button"
          class="py-2 text-sm font-semibold rounded-md transition"
          :class="
            registerMethod === 'magiclink'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          "
          @click="registerMethod = 'magiclink'"
        >
          {{ t("registerForm.methodMagicLink") }}
        </button>
      </div>

      <div class="relative">
        <div
          class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
        >
          <EnvelopeIcon class="w-5 h-5 text-gray-400" />
        </div>
        <input
          v-model="email"
          type="email"
          :placeholder="t('auth.email')"
          class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
          required
        />
      </div>

      <div class="relative">
        <div
          class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
        >
          <UserIcon class="w-5 h-5 text-gray-400" />
        </div>
        <input
          v-model="name"
          type="text"
          :placeholder="t('auth.name')"
          class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
          required
        />
      </div>

      <div class="relative">
        <div
          class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
        >
          <IdentificationIcon class="w-5 h-5 text-gray-400" />
        </div>
        <input
          v-model="playerId"
          type="text"
          inputmode="numeric"
          pattern="\d*"
          :placeholder="t('registration.playerId')"
          class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
          required
          @input="validatePlayerId"
        />
      </div>

      <template v-if="registerMethod === 'password'">
        <div class="relative">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            :placeholder="t('registerForm.passwordPlaceholder')"
            class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
            required
            minlength="8"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-3 text-gray-500 hover:text-gray-700"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? "🙈" : "👁️" }}
          </button>
        </div>

        <div class="relative">
          <input
            v-model="passwordConfirm"
            :type="showPasswordConfirm ? 'text' : 'password'"
            :placeholder="t('registerForm.passwordConfirmPlaceholder')"
            class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
            required
            minlength="8"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-3 text-gray-500 hover:text-gray-700"
            @click="showPasswordConfirm = !showPasswordConfirm"
          >
            {{ showPasswordConfirm ? "🙈" : "👁️" }}
          </button>
        </div>
      </template>

      <button
        type="submit"
        :disabled="isLoading"
        class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-400 disabled:to-purple-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-blue-200"
      >
        <div class="flex items-center justify-center space-x-2">
          <svg
            v-if="isLoading"
            class="animate-spin h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <PaperAirplaneIcon v-else class="w-5 h-5" />
          <span>{{
            isLoading
              ? t("common.loading")
              : registerMethod === "password"
                ? t("registerForm.submitCreateAccount")
                : t("registerForm.submitSendMagicLink")
          }}</span>
        </div>
      </button>
    </form>

    <div class="mt-6 text-center">
      <p class="text-sm text-gray-600">
        {{ t("registerForm.alreadyHaveAccount") }}
        <NuxtLink
          :to="
            route.query.redirect
              ? `/login?redirect=${route.query.redirect}`
              : '/login'
          "
          class="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors duration-200"
        >
          {{ t("auth.signIn") }}
        </NuxtLink>
      </p>
    </div>

    <div
      v-if="linkSent"
      class="mt-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg relative"
    >
      <div class="flex items-center space-x-2">
        <CheckCircleIcon class="w-5 h-5 text-emerald-600" />
        <span class="font-medium">{{ successTitle }}</span>
      </div>
      <p class="text-sm mt-1 ml-7">{{ successText }}</p>
    </div>

    <div
      v-if="error"
      class="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative"
    >
      <p class="font-medium">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  UserPlusIcon,
  EnvelopeIcon,
  UserIcon,
  IdentificationIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
} from "@heroicons/vue/24/outline";

const email = ref("");
const name = ref("");
const playerId = ref("");
const registerMethod = ref<"password" | "magiclink">("password");
const password = ref("");
const passwordConfirm = ref("");
const showPassword = ref(false);
const showPasswordConfirm = ref(false);
const linkSent = ref(false);
const isLoading = ref(false);
const error = ref("");
const runtimeConfig = useRuntimeConfig();
const route = useRoute();
const { t } = useI18n();

const successTitle = computed(() =>
  registerMethod.value === "password"
    ? t("registerForm.successTitlePassword")
    : t("registerForm.successTitleMagicLink"),
);

const successText = computed(() =>
  registerMethod.value === "password"
    ? t("registerForm.successTextPassword")
    : t("registerForm.successTextMagicLink"),
);

// Pre-fill email if passed from failed login
onMounted(() => {
  const emailParam = route.query.email as string;
  if (emailParam) {
    email.value = emailParam;
  }
});

const validatePlayerId = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  const value = target.value;
  const numericOnly = value.replace(/\D/g, "");
  playerId.value = numericOnly;
  target.value = numericOnly;
};

const logError = async (
  errorType: string,
  errorMessage: string,
  additionalData?: any,
) => {
  if (!process.client) return;
  try {
    await $fetch("/api/admin/error-logs/create", {
      method: "POST",
      body: {
        userId: null,
        userEmail: email.value || null,
        errorType,
        errorMessage,
        userAgent: navigator.userAgent,
        url: window.location.href,
        metadata: additionalData || null,
      },
    });
  } catch {}
};

const getMagicLinkRedirect = () => {
  const returnPath = route.query.redirect as string;
  const configuredBase = runtimeConfig.public.appBaseUrl?.replace(/\/$/, "");
  let redirectTo = "";

  if (configuredBase) {
    redirectTo = `${configuredBase}/confirm`;
  } else if (process.client) {
    redirectTo = `${window.location.origin.replace(/\/$/, "")}/confirm`;
  }

  // Append the return path if present (confirm page passes it along to magic-login)
  if (redirectTo && returnPath) {
    redirectTo = `${redirectTo}?return=${encodeURIComponent(returnPath)}`;
  }

  return redirectTo || undefined;
};

const submitForm = async () => {
  isLoading.value = true;
  linkSent.value = false;
  error.value = "";

  if (registerMethod.value === "password") {
    if (password.value.length < 8) {
      error.value = t("registerForm.errorPasswordMin");
      isLoading.value = false;
      return;
    }
    if (password.value !== passwordConfirm.value) {
      error.value = t("registerForm.errorPasswordMismatch");
      isLoading.value = false;
      return;
    }
  }

  // First, check if a player account already exists with this email
  try {
    const playerCheck = await $fetch("/api/players/check", {
      method: "POST",
      body: {
        email: email.value,
      },
    });

    if (playerCheck.exists) {
      if (playerCheck.authOnly) {
        // User exists in Supabase auth but not in players table
        error.value = t("registerForm.errorAccountExistsIncomplete", {
          email: email.value,
        });
      } else {
        // Full player account exists
        error.value = t("registerForm.errorAccountExists", {
          email: email.value,
        });
      }

      isLoading.value = false;
      await logError(
        "registration_duplicate_email",
        "User tried to register with existing email",
        {
          email: email.value,
          authOnly: playerCheck.authOnly,
        },
      );
      return;
    }
  } catch (checkError) {
    await logError(
      "registration_check_failed",
      checkError instanceof Error ? checkError.message : "Unknown error",
      {
        email: email.value,
        checkError,
      },
    );
    // If the check fails, we'll allow the registration to proceed
    // The backend will handle any duplicate errors
  }

  const redirectTo = getMagicLinkRedirect();
  let signUpError: { message?: string } | null = null;

  if (registerMethod.value === "password") {
    try {
      await $fetch("/api/auth/register-password", {
        method: "POST",
        body: {
          email: email.value,
          password: password.value,
          name: name.value,
          playerId: playerId.value,
        },
      });
    } catch (err: any) {
      signUpError = {
        message:
          err?.data?.statusMessage ||
          err?.message ||
          t("registerForm.errorRegistrationFailed"),
      };
    }
  } else {
    const response = await useSupabaseClient().auth.signInWithOtp({
      email: email.value,
      options: {
        data: {
          name: name.value,
          playerId: playerId.value,
        },
        ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
      },
    });
    signUpError = response.error;
  }

  if (!signUpError && registerMethod.value === "password") {
    try {
      const data = await $fetch<{
        access_token: string;
        refresh_token: string;
      }>("/api/auth/login-password", {
        method: "POST",
        body: {
          email: email.value,
          password: password.value,
        },
      });

      const { error: sessionError } = await useSupabaseClient().auth.setSession(
        {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        },
      );

      if (sessionError) {
        throw sessionError;
      }

      await navigateTo("/");
      return;
    } catch (err: any) {
      signUpError = {
        message:
          err?.data?.statusMessage ||
          err?.statusMessage ||
          err?.message ||
          t("registerForm.errorRegistrationFailed"),
      };
    }
  }

  isLoading.value = false;

  if (signUpError) {
    const signUpMessage = signUpError.message || "Registration failed";
    if (
      signUpMessage.toLowerCase().includes("security purposes") ||
      signUpMessage.toLowerCase().includes("after")
    ) {
      const seconds = signUpMessage.match(/(\d+)\s*se/)?.[1];
      error.value = seconds
        ? t("registerForm.errorWaitSeconds", { seconds })
        : t("registerForm.errorWaitMoment");
    } else {
      error.value = signUpMessage;
    }
    await logError("registration_failed", signUpMessage, {
      email: email.value,
      method: registerMethod.value,
      hasName: !!name.value,
      hasPlayerId: !!playerId.value,
      redirectTo,
    });
  } else {
    await logError(
      "info_registration_success",
      "Registration initiated successfully",
      {
        email: email.value,
        method: registerMethod.value,
        name: name.value,
        playerId: playerId.value,
        redirectTo,
      },
    );
    linkSent.value = true;
  }
};
</script>
