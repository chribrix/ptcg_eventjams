<template>
  <div
    class="app-surface-0 shadow-xl rounded-2xl p-8 w-full max-w-md mx-auto border app-border"
  >
    <div class="text-center mb-8">
      <div
        class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--app-button-blue-border)] bg-[var(--app-button-blue)]"
      >
        <UserPlusIcon class="w-8 h-8 text-white" />
      </div>
      <h2 class="text-3xl font-bold text-white mb-2">Create Account</h2>
    </div>

    <form @submit.prevent="submitForm" class="space-y-6">
      <div class="grid grid-cols-2 gap-2 p-1 app-surface-2 rounded-lg">
        <button
          type="button"
          class="py-2 text-sm font-semibold rounded-md transition"
          :class="
            registerMethod === 'password'
              ? 'app-surface-0 text-white shadow-sm'
              : 'app-text-muted hover:text-white'
          "
          @click="registerMethod = 'password'"
        >
          {{ t("registerForm.methodPasswordDefault") }}
        </button>
        <button
          type="button"
          class="py-2 text-sm font-semibold rounded-md transition"
          :class="
            registerMethod === 'otp'
              ? 'app-surface-0 text-white shadow-sm'
              : 'app-text-muted hover:text-white'
          "
          @click="registerMethod = 'otp'"
        >
          {{ t("registerForm.methodOtp") }}
        </button>
      </div>

      <div class="relative">
        <div
          class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
        >
          <EnvelopeIcon class="w-5 h-5 app-text-muted" />
        </div>
        <input
          v-model="email"
          type="email"
          :placeholder="t('auth.email')"
          class="app-input app-input-subtle w-full pl-10 pr-4 py-3"
          required
        />
      </div>

      <div class="relative">
        <div
          class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
        >
          <UserIcon class="w-5 h-5 app-text-muted" />
        </div>
        <input
          v-model="name"
          type="text"
          :placeholder="t('auth.name')"
          class="app-input app-input-subtle w-full pl-10 pr-4 py-3"
          required
        />
      </div>

      <div class="relative">
        <div
          class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
        >
          <IdentificationIcon class="w-5 h-5 app-text-muted" />
        </div>
        <input
          v-model="playerId"
          type="text"
          inputmode="numeric"
          pattern="\d*"
          :placeholder="t('registration.playerId')"
          class="app-input app-input-subtle w-full pl-10 pr-4 py-3"
          @input="validatePlayerId"
        />
      </div>
      <p class="mt-2 text-xs app-text-muted">
        Spieler-ID ist optional. Wenn du noch keine hast, kannst du das Feld
        leer lassen - sie wird vor Ort ausgeteilt.
      </p>

      <template v-if="registerMethod === 'password'">
        <div class="relative">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            :placeholder="t('registerForm.passwordPlaceholder')"
            class="app-input app-input-subtle w-full px-4 py-3 pr-12"
            required
            minlength="8"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-3 app-text-muted hover:text-white"
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
            class="app-input app-input-subtle w-full px-4 py-3 pr-12"
            required
            minlength="8"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-3 app-text-muted hover:text-white"
            @click="showPasswordConfirm = !showPasswordConfirm"
          >
            {{ showPasswordConfirm ? "🙈" : "👁️" }}
          </button>
        </div>
      </template>

      <template v-else-if="linkSent">
        <div>
          <label class="mb-2 block text-sm font-medium app-text-secondary">{{
            t("registerForm.otpLabel")
          }}</label>
          <input
            v-model="otpCode"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="8"
            class="app-input app-input-subtle w-full px-4 py-3"
            :placeholder="t('registerForm.otpPlaceholder')"
            required
          />
        </div>
      </template>

      <button
        type="submit"
        :disabled="isLoading"
        class="app-action-button app-action-primary w-full px-6 py-3"
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
                : linkSent
                  ? t("registerForm.submitVerifyOtp")
                  : t("registerForm.submitSendOtp")
          }}</span>
        </div>
      </button>
    </form>

    <div class="mt-6 text-center">
      <p class="text-sm app-text-secondary">
        {{ t("registerForm.alreadyHaveAccount") }}
        <NuxtLink
          :to="
            route.query.redirect
              ? `/login?redirect=${route.query.redirect}`
              : '/login'
          "
          class="font-semibold text-[var(--app-accent-soft)] transition-colors duration-200 hover:text-white hover:underline"
        >
          {{ t("auth.signIn") }}
        </NuxtLink>
      </p>
    </div>

    <div
      v-if="linkSent"
      class="relative mt-6 rounded-lg app-feedback-success px-4 py-3"
    >
      <div class="flex items-center space-x-2">
        <CheckCircleIcon class="w-5 h-5 text-emerald-300" />
        <span class="font-medium">{{ successTitle }}</span>
      </div>
      <p class="text-sm mt-1 ml-7">{{ successText }}</p>
    </div>

    <div
      v-if="error"
      class="relative mt-6 rounded-lg app-feedback-danger px-4 py-3"
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
const registerMethod = ref<"password" | "otp">("password");
const password = ref("");
const passwordConfirm = ref("");
const otpCode = ref("");
const showPassword = ref(false);
const showPasswordConfirm = ref(false);
const linkSent = ref(false);
const isLoading = ref(false);
const error = ref("");
const runtimeConfig = useRuntimeConfig();
const route = useRoute();
const { t } = useI18n();
const { mergeGuestBookmarksIntoAccount } = useEventBookmarks();

const successTitle = computed(() =>
  registerMethod.value === "password"
    ? t("registerForm.successTitlePassword")
    : t("registerForm.successTitleOtp"),
);

const successText = computed(() =>
  registerMethod.value === "password"
    ? t("registerForm.successTextPassword")
    : t("registerForm.successTextOtp"),
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

const verifyOtpRegistration = async () => {
  const code = otpCode.value.trim();

  if (!code) {
    error.value = t("registerForm.errorOtpRequired");
    return;
  }

  const { data, error: verifyError } = await useSupabaseClient().auth.verifyOtp(
    {
      email: email.value,
      token: code,
      type: "email",
    },
  );

  if (verifyError || !data.session) {
    throw new Error(
      verifyError?.message || t("registerForm.errorOtpVerificationFailed"),
    );
  }

  await $fetch("/api/auth/ensure-player", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: { preferredLoginMethod: "otp" },
  });

  try {
    await mergeGuestBookmarksIntoAccount();
  } catch (mergeError) {
    console.error("Failed to merge guest bookmarks after OTP registration:", mergeError);
  }

  await navigateTo((route.query.redirect as string) || "/");
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
      } else if (playerCheck.legacyPlayerOnly) {
        error.value = t("registerForm.errorLegacyPlayerOnly", {
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
          legacyPlayerOnly: playerCheck.legacyPlayerOnly,
        },
      );
      return;
    }

    if (playerCheck.legacyPlayerOnly) {
      error.value = t("registerForm.errorLegacyPlayerOnly", {
        email: email.value,
      });
      isLoading.value = false;
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
  let signUpError: { message?: string } | null = null;

  if (registerMethod.value === "otp" && linkSent.value) {
    try {
      await verifyOtpRegistration();
      return;
    } catch (err: any) {
      signUpError = {
        message:
          err?.data?.statusMessage ||
          err?.statusMessage ||
          err?.message ||
          t("registerForm.errorOtpVerificationFailed"),
      };
    }
  }

  if (registerMethod.value === "password") {
    try {
      await $fetch("/api/auth/register-password", {
        method: "POST",
        body: {
          email: email.value,
          password: password.value,
          name: name.value,
          playerId: playerId.value || undefined,
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
        shouldCreateUser: true,
        data: {
          name: name.value,
          ...(playerId.value ? { playerId: playerId.value } : {}),
        },
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

      try {
        await mergeGuestBookmarksIntoAccount();
      } catch (mergeError) {
        console.error(
          "Failed to merge guest bookmarks after password registration:",
          mergeError,
        );
      }

      await navigateTo((route.query.redirect as string) || "/");
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
      },
    );
    linkSent.value = true;
  }
};
</script>
