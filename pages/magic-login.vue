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

// Log successful operations too (as info-level logs)
const logInfo = async (
  infoType: string,
  infoMessage: string,
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
        errorType: `info_${infoType}`,
        errorMessage: infoMessage,
        userAgent: navigator.userAgent,
        url: window.location.href,
        metadata: additionalData || null,
      },
    });
  } catch (err) {
    console.error("Failed to log info:", err);
  }
};

onMounted(async () => {
  try {
    console.log("🔐 Magic login process started");

    // Detect device/browser info
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isSafari =
      /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
    const deviceInfo = {
      isIOS,
      isSafari,
      iosVersion: isIOS ? userAgent.match(/os (\d+)_/)?.[1] : null,
      userAgent: navigator.userAgent,
    };

    await logInfo("magic_login_started", "User clicked magic link", {
      hasReturnPath: !!route.query.return,
      returnPath: route.query.return,
      ...deviceInfo,
    });

    // Wait for Supabase to process the session, especially important for mobile browsers
    // iOS Safari can be slow to process the auth hash fragments
    let session = null;
    let sessionError = null;
    const maxRetries = 10;
    const retryDelay = 300; // ms

    await logInfo("session_retry_start", "Starting session retry loop", {
      maxRetries,
      retryDelay,
      ...deviceInfo,
    });

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const { data, error } = await useSupabaseClient().auth.getSession();

      if (data.session) {
        session = data.session;
        console.log(`✅ Session found on attempt ${attempt + 1}`);
        await logInfo(
          "session_found",
          `Session found on attempt ${attempt + 1}`,
          {
            attempt: attempt + 1,
            totalAttempts: maxRetries,
            timeElapsed: attempt * retryDelay,
            userId: session.user?.id,
            userEmail: session.user?.email,
            ...deviceInfo,
          }
        );
        break;
      }

      sessionError = error;

      if (attempt < maxRetries - 1) {
        console.log(
          `⏳ Session not ready, waiting... (attempt ${
            attempt + 1
          }/${maxRetries})`
        );
        if (attempt === 0 || attempt === 4 || attempt === 9) {
          // Log on first, middle, and last attempts
          await logInfo(
            "session_retry_waiting",
            `Waiting for session (attempt ${attempt + 1})`,
            {
              attempt: attempt + 1,
              maxRetries,
              ...deviceInfo,
            }
          );
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    if (sessionError || !session) {
      console.error("Login failed or session missing:", sessionError);
      await logError(
        "magic_login_session_failed",
        sessionError?.message || "No session found after retries",
        {
          sessionError,
          attempts: maxRetries,
          totalWaitTime: maxRetries * retryDelay,
          ...deviceInfo,
        }
      );
      errorTitle.value = "Login Link Invalid or Expired";
      error.value =
        "The login link you clicked may have expired or is no longer valid. Magic links can only be used once and expire after a short time.";
      errorAction.value =
        "Request a new magic link from the login page. Make sure to click the link shortly after receiving the email.";
      checking.value = false;
      return;
    }

    const data = { session };

    const user = data.session.user;
    console.log("✅ Session validated, user:", user.email);
    await logInfo(
      "magic_login_session_valid",
      "Magic link session validated successfully",
      {
        userId: user.id,
        email: user.email,
        hasMetadata: !!user.user_metadata,
        metadataKeys: user.user_metadata ? Object.keys(user.user_metadata) : [],
      }
    );

    // Check if player exists in database
    // Note: Player creation is now handled by Supabase webhook automatically
    // So we just need to check if the player record exists
    console.log("🔍 Checking if player exists in database");
    await logInfo("magic_login_checking_player", "Checking player existence", {
      userId: user.id,
      email: user.email,
    });

    try {
      const playerResponse = await $fetch("/api/players/check", {
        method: "POST",
        body: {
          email: user.email,
        },
      });

      if (playerResponse.exists) {
        // Player exists - proceed with login/registration complete
        console.log("✅ Player found, proceeding to app");
        await logInfo("magic_login_success", "Login completed successfully", {
          userId: user.id,
          email: user.email,
          playerId: playerResponse.player?.playerId,
          returnPath: (route.query.return as string) || "/",
        });

        const returnPath = (route.query.return as string) || "/";
        console.log("🔄 Navigating to:", returnPath);

        await logInfo("navigation_start", "Starting navigation", {
          returnPath,
          navigationType: "external_replace",
          userId: user.id,
        });

        // Use navigateTo with external: true for better mobile compatibility
        // This ensures proper navigation on iOS Safari
        try {
          await navigateTo(returnPath, {
            external: true,
            replace: true,
          });
          await logInfo("navigation_success", "Navigation initiated", {
            returnPath,
          });
        } catch (navError) {
          await logError("navigation_failed", "Navigation failed", {
            returnPath,
            error:
              navError instanceof Error ? navError.message : "Unknown error",
          });
        }
        return;
      }

      // Player doesn't exist yet
      // This can happen if:
      // 1. User is logging in without registering (old account)
      // 2. Webhook hasn't fired yet (rare - webhook should be instant)
      const hasRegistrationMetadata =
        user.user_metadata?.name && user.user_metadata?.playerId;

      if (hasRegistrationMetadata) {
        // Registration flow - webhook should create player, but might have lag
        console.log(
          "⏳ Registration detected but player not found - webhook may still be processing"
        );
        await logInfo(
          "magic_login_webhook_lag",
          "Player not found after registration - waiting for webhook",
          {
            userId: user.id,
            email: user.email,
            name: user.user_metadata.name,
            playerId: user.user_metadata.playerId,
          }
        );

        // Wait a moment and retry
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const retryResponse = await $fetch("/api/players/check", {
          method: "POST",
          body: { email: user.email },
        });

        if (retryResponse.exists) {
          console.log("✅ Player found after retry");
          await logInfo(
            "player_found_retry",
            "Player found after webhook retry",
            {
              userId: user.id,
              email: user.email,
            }
          );
          const returnPath = (route.query.return as string) || "/";
          console.log("🔄 Navigating to:", returnPath);

          await logInfo("navigation_retry", "Navigation after retry", {
            returnPath,
            userId: user.id,
          });

          try {
            await navigateTo(returnPath, {
              external: true,
              replace: true,
            });
            await logInfo(
              "navigation_retry_success",
              "Retry navigation succeeded",
              {
                returnPath,
              }
            );
          } catch (navError) {
            await logError(
              "navigation_retry_failed",
              "Retry navigation failed",
              {
                returnPath,
                error:
                  navError instanceof Error
                    ? navError.message
                    : "Unknown error",
              }
            );
          }
          return;
        }

        // Still not found - webhook may have failed
        // Fallback: create player manually
        console.log("⚠️ Webhook may have failed, creating player manually");
        await logError(
          "magic_login_webhook_failed",
          "Player not found after registration and retry - webhook may have failed",
          {
            userId: user.id,
            email: user.email,
            name: user.user_metadata.name,
            playerId: user.user_metadata.playerId,
          }
        );

        try {
          await $fetch("/api/players/register", {
            method: "POST",
            body: {
              playerId: user.user_metadata.playerId,
              name: user.user_metadata.name,
              email: user.email,
              supabaseId: user.id,
              birthDate: new Date("2000-01-01T00:00:00.000Z").toISOString(),
            },
          });

          console.log("✅ Player created manually via fallback");
          await logInfo(
            "magic_login_manual_creation_success",
            "Player created manually after webhook failure",
            {
              userId: user.id,
              email: user.email,
            }
          );

          const returnPath = (route.query.return as string) || "/";
          console.log("🔄 Navigating to:", returnPath);

          await logInfo(
            "navigation_manual_creation",
            "Navigation after manual player creation",
            {
              returnPath,
              userId: user.id,
            }
          );

          try {
            await navigateTo(returnPath, {
              external: true,
              replace: true,
            });
            await logInfo(
              "navigation_manual_success",
              "Manual creation navigation succeeded",
              {
                returnPath,
              }
            );
          } catch (navError) {
            await logError(
              "navigation_manual_failed",
              "Manual creation navigation failed",
              {
                returnPath,
                error:
                  navError instanceof Error
                    ? navError.message
                    : "Unknown error",
              }
            );
          }
          return;
        } catch (createError: any) {
          console.error("❌ Manual player creation failed:", createError);
          const errorMessage =
            createError?.data?.message ||
            createError?.message ||
            "Unknown error";

          errorTitle.value = "Registration Failed";
          if (errorMessage.includes("already exists")) {
            error.value = `A player with this ID or email already exists.`;
            errorAction.value =
              "Try logging in instead, or contact support if you believe this is an error.";
          } else {
            error.value = `We couldn't complete your registration: ${errorMessage}`;
            errorAction.value =
              "Please try registering again. If this problem persists, contact support.";
          }

          await logError("magic_login_manual_creation_failed", errorMessage, {
            createError,
            userId: user.id,
            metadata: user.user_metadata,
          });
          checking.value = false;
          return;
        }
      }

      // Login flow without registration - player doesn't exist
      console.log("❌ Login attempt without registration");
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

      errorTitle.value = "Account Not Found";
      error.value = `We couldn't find an account for ${user.email}. You need to register first before you can log in.`;
      errorAction.value =
        "Click 'Create Account' below to register with your email address, name, and Pokemon TCG Player ID.";
      showRegisterButton.value = true;
      checking.value = false;

      // Auto-redirect to register
      setTimeout(() => {
        const returnPath = route.query.return as string;
        const redirectQuery = returnPath
          ? `?redirect=${encodeURIComponent(
              returnPath
            )}&noAccount=true&email=${encodeURIComponent(user.email || "")}`
          : `?noAccount=true&email=${encodeURIComponent(user.email || "")}`;
        router.push(`/register${redirectQuery}`);
      }, 4000);
    } catch (checkError) {
      console.error("❌ Error checking player existence:", checkError);
      errorTitle.value = "Account Verification Failed";
      error.value =
        "We encountered a problem while verifying your account. This might be a temporary server issue.";
      errorAction.value =
        "Please try logging in again. If the problem persists, contact support.";
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
