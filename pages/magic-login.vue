<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="text-center">
      <div v-if="checking" class="space-y-4">
        <div
          class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"
        ></div>
        <p class="text-lg text-gray-700">Processing login...</p>
      </div>

      <div
        v-else-if="error"
        class="bg-white border border-red-300 rounded-xl shadow-lg p-8 max-w-lg"
      >
        <div class="flex items-start space-x-4 mb-4">
          <div
            class="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center"
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
          <div class="flex-1">
            <h3 class="text-xl font-bold text-gray-900 mb-2">
              {{ errorTitle }}
            </h3>
            <p class="text-gray-700 leading-relaxed mb-4">{{ error }}</p>
            <div
              v-if="errorAction"
              class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4"
            >
              <p class="text-sm font-medium text-blue-900 mb-2">
                What should I do?
              </p>
              <p class="text-sm text-blue-800">{{ errorAction }}</p>
            </div>
          </div>
        </div>
        <div class="flex gap-3">
          <NuxtLink
            to="/login"
            class="flex-1 text-center px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Back to Login
          </NuxtLink>
          <NuxtLink
            v-if="showRegisterButton"
            to="/register"
            class="flex-1 text-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Create Account
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter();
const route = useRoute();
const checking = ref(true);
const error = ref("");
const errorTitle = ref("Login Failed");
const errorAction = ref("");
const showRegisterButton = ref(false);

const logError = async (
  errorType: string,
  errorMessage: string,
  additionalData?: any
) => {
  try {
    const { data } = await useSupabaseClient().auth.getSession();
    const user = data.session?.user;

    await $fetch("/api/admin/error-logs/create", {
      method: "POST",
      body: {
        userId: user?.id || null,
        userEmail: user?.email || null,
        errorType,
        errorMessage,
        userAgent: navigator.userAgent,
        url: window.location.href,
        metadata: additionalData || null,
      },
    });
  } catch (logError) {
    console.error("Failed to log error:", logError);
  }
};

onMounted(async () => {
  try {
    const { data, error: sessionError } =
      await useSupabaseClient().auth.getSession();

    if (sessionError || !data.session) {
      console.error("Login failed or session missing:", sessionError);
      errorTitle.value = "Login Link Invalid or Expired";
      error.value =
        "The login link you clicked may have expired or is no longer valid. Magic links can only be used once and expire after a short time.";
      errorAction.value =
        "Request a new magic link from the login page. Make sure to click the link shortly after receiving the email.";
      await logError(
        "magic_login_session_failed",
        sessionError?.message || "No session found",
        { sessionError }
      );
      checking.value = false;
      return;
    }

    const user = data.session.user;

    // Check if player exists in our database
    try {
      const playerResponse = await $fetch("/api/players/check", {
        method: "POST",
        body: {
          userId: user.id,
          email: user.email,
        },
      });

      if (!playerResponse.exists) {
        // Player doesn't exist, log them out and redirect to register
        console.log("Player not found in database, redirecting to register");
        await logError(
          "login_without_registration",
          "User attempted to login without completing registration",
          {
            userId: user.id,
            email: user.email,
            metadata: user.user_metadata,
          }
        );

        // Sign them out
        await useSupabaseClient().auth.signOut();

        // Show user-friendly error before redirect
        errorTitle.value = "Account Not Found";
        error.value = `We couldn't find an account for ${user.email}. You need to register first before you can log in.`;
        errorAction.value =
          "Click 'Create Account' below to register with your email address, name, and Pokemon TCG Player ID.";
        showRegisterButton.value = true;
        checking.value = false;

        // Auto-redirect after showing the message
        setTimeout(() => {
          const returnPath = route.query.return as string;
          const redirectQuery = returnPath
            ? `?redirect=${encodeURIComponent(
                returnPath
              )}&noAccount=true&email=${encodeURIComponent(user.email || "")}`
            : `?noAccount=true&email=${encodeURIComponent(user.email || "")}`;
          router.push(`/register${redirectQuery}`);
        }, 4000);
        return;
      }

      // Player exists, proceed with login
      const returnPath = route.query.return as string;
      router.push(returnPath || "/");
    } catch (checkError) {
      console.error("Error checking player existence:", checkError);
      errorTitle.value = "Account Verification Failed";
      error.value =
        "We encountered a problem while verifying your account. This might be a temporary server issue.";
      errorAction.value =
        "Please try logging in again. If the problem persists, contact support with your email address.";
      await logError(
        "magic_login_check_failed",
        checkError instanceof Error ? checkError.message : "Unknown error",
        { checkError, userId: user.id }
      );
      checking.value = false;
    }
  } catch (err) {
    console.error("Magic login error:", err);
    errorTitle.value = "Unexpected Error";
    error.value =
      "Something went wrong during the login process. This might be due to a connection issue or a temporary server problem.";
    errorAction.value =
      "Please check your internet connection and try logging in again. If this keeps happening, try clearing your browser cache or use a different browser.";
    await logError(
      "magic_login_exception",
      err instanceof Error ? err.message : "Unknown error",
      { err }
    );
    checking.value = false;
  }
});
</script>
