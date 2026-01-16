// Plugin to handle Supabase auth hash fragments explicitly
// This is especially important for iOS Safari which can have issues with automatic detection
export default defineNuxtPlugin(async (nuxtApp) => {
  const supabaseClient = useSupabaseClient();

  if (!import.meta.client) return;

  // Helper to log to database
  const logToDatabase = async (
    errorType: string,
    errorMessage: string,
    metadata?: any
  ) => {
    try {
      await $fetch("/api/admin/error-logs/create", {
        method: "POST",
        body: {
          userId: null,
          userEmail: null,
          errorType: `auth_handler_${errorType}`,
          errorMessage,
          userAgent: navigator.userAgent,
          url: window.location.href,
          metadata: {
            ...metadata,
            pluginName: "supabase-auth-handler",
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (logError) {
      console.error("Failed to log to database:", logError);
    }
  };

  // Detect device info
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isSafari =
    /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
  const deviceInfo = {
    isIOS,
    isSafari,
    userAgent: navigator.userAgent,
  };

  // Check if we're on a page that should handle auth callbacks
  const currentPath = window.location.pathname;
  const isAuthCallback =
    currentPath === "/magic-login" || currentPath.includes("/confirm");

  await logToDatabase("plugin_initialized", "Auth handler plugin started", {
    currentPath,
    isAuthCallback,
    ...deviceInfo,
  });

  if (!isAuthCallback) {
    await logToDatabase("plugin_skipped", "Not an auth callback page", {
      currentPath,
    });
    return;
  }

  // Check for hash fragments that indicate a Supabase auth response
  const hash = window.location.hash;
  if (!hash || hash.length <= 1) {
    await logToDatabase("no_hash_fragment", "No hash fragment found in URL", {
      urlLength: window.location.href.length,
    });
    return;
  }

  console.log("🔐 Detected auth hash fragment, processing...");
  await logToDatabase(
    "hash_fragment_detected",
    "Auth hash fragment found in URL",
    {
      hashLength: hash.length,
      ...deviceInfo,
    }
  );

  try {
    // Parse the hash to check if it contains auth tokens
    const hashParams = new URLSearchParams(hash.substring(1));
    const hasAccessToken = hashParams.has("access_token");
    const hasRefreshToken = hashParams.has("refresh_token");
    const tokenType = hashParams.get("token_type");
    const expiresIn = hashParams.get("expires_in");

    await logToDatabase("hash_parsed", "Hash parameters parsed", {
      hasAccessToken,
      hasRefreshToken,
      tokenType,
      expiresIn,
      paramKeys: Array.from(hashParams.keys()),
    });

    if (hasAccessToken || hasRefreshToken) {
      console.log(
        "✅ Auth tokens found in URL, waiting for Supabase to process..."
      );
      await logToDatabase(
        "tokens_found",
        "Auth tokens found, waiting for Supabase processing",
        {
          waitTimeMs: 500,
          ...deviceInfo,
        }
      );

      // Give Supabase's built-in handler time to process the tokens
      // This is crucial for mobile browsers, especially iOS Safari
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify the session was established
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (session) {
        console.log("✅ Session established from hash fragment");
        await logToDatabase(
          "session_established",
          "Session successfully established from hash",
          {
            userId: session.user?.id,
            userEmail: session.user?.email,
            expiresAt: session.expires_at,
            ...deviceInfo,
          }
        );

        // Clean up the URL hash to prevent re-processing
        // Use replaceState to avoid triggering navigation
        if (window.history && window.history.replaceState) {
          const cleanUrl =
            window.location.origin +
            window.location.pathname +
            window.location.search;
          window.history.replaceState({}, document.title, cleanUrl);

          await logToDatabase("url_cleaned", "Hash fragment removed from URL", {
            cleanUrl,
          });
        }
      } else {
        console.warn("⚠️ Hash tokens found but session not established");
        await logToDatabase(
          "session_failed",
          "Hash tokens found but session not established",
          {
            waitTimeMs: 500,
            ...deviceInfo,
          }
        );
      }
    }
  } catch (error) {
    console.error("❌ Error processing auth hash fragment:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await logToDatabase(
      "processing_error",
      `Error processing hash: ${errorMessage}`,
      {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        ...deviceInfo,
      }
    );
  }
});
