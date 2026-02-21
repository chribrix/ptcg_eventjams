<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="text-center max-w-sm w-full">
      <!-- Auto-proceeding -->
      <div v-if="!error" class="space-y-4">
        <div
          class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"
        ></div>
        <p class="text-lg text-gray-700">Signing you in...</p>
      </div>

      <!-- Error -->
      <div
        v-else-if="error"
        class="bg-white border border-red-300 rounded-xl shadow-lg p-8 space-y-4"
      >
        <div
          class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto"
        >
          <svg
            class="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 class="text-xl font-bold text-gray-900">{{ errorTitle }}</h3>
        <p class="text-gray-600 text-sm">{{ error }}</p>

        <div class="space-y-2">
          <input
            v-model="resendEmail"
            type="email"
            placeholder="Your email address"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            @click="resendLink"
            :disabled="!resendEmail || resendLoading || resendSent"
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {{
              resendLoading
                ? "Sending..."
                : resendSent
                  ? "✅ Link Sent!"
                  : "Resend Magic Link"
            }}
          </button>
          <NuxtLink
            to="/login"
            class="block text-center px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
          >
            Back to Login
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const supabase = useSupabaseClient();

const error = ref("");
const errorTitle = ref("Login Failed");
const resendEmail = ref("");
const resendLoading = ref(false);
const resendSent = ref(false);

const code = computed(() => route.query.code as string | undefined);
const returnPath = computed(
  () => (route.query.return as string) || "/magic-login",
);

const confirmLogin = async () => {
  try {
    // Don't exchange the code manually — PKCE needs the code_verifier Supabase
    // stored in localStorage when the link was requested. Just pass the code
    // along to /magic-login and let Supabase's detectSessionInUrl handle it.
    const params = new URLSearchParams();
    if (code.value) params.set("code", code.value);
    if (returnPath.value && returnPath.value !== "/magic-login") {
      params.set("return", returnPath.value);
    }
    const qs = params.toString();
    await navigateTo(`/magic-login${qs ? `?${qs}` : ""}`, {
      external: true,
      replace: true,
    });
  } catch (err: any) {
    errorTitle.value = "Login Failed";
    error.value =
      (err as any)?.message || "Something went wrong. Please try again.";
  }
};

const resendLink = async () => {
  if (!resendEmail.value || resendLoading.value) return;
  resendLoading.value = true;
  try {
    const redirectTo = `${window.location.origin}/confirm${returnPath.value !== "/magic-login" ? `?return=${encodeURIComponent(returnPath.value)}` : ""}`;
    await supabase.auth.signInWithOtp({
      email: resendEmail.value,
      options: { emailRedirectTo: redirectTo },
    });
    resendSent.value = true;
  } catch (e) {
    console.error("Resend failed:", e);
  } finally {
    resendLoading.value = false;
  }
};

onMounted(() => {
  // If Supabase already returned an error in the URL, show it immediately
  const urlError = route.query.error as string;
  const urlErrorCode = route.query.error_code as string;
  if (urlError || urlErrorCode) {
    errorTitle.value =
      urlErrorCode === "otp_expired" || urlError === "access_denied"
        ? "Link Expired"
        : "Login Failed";
    error.value =
      (route.query.error_description as string)?.replace(/\+/g, " ") ||
      "This login link is invalid or has expired. Please request a new one.";
    return;
  }

  // Delay before redirecting — security scanners fetch pages in milliseconds
  // and don't wait. Real users just see a 2-second loading screen.
  setTimeout(confirmLogin, 2000);
});
</script>
