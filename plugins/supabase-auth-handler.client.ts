// Legacy magic-link callback handler.
// Passwordless auth now uses in-page OTP verification, so callback hash handling
// is intentionally disabled and kept only as a diagnostic breadcrumb.
export default defineNuxtPlugin(async (nuxtApp) => {
  if (!import.meta.client) return;

  // Helper to log to database
  const logToDatabase = async (
    errorType: string,
    errorMessage: string,
    metadata?: any,
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

  await logToDatabase(
    "plugin_disabled",
    "Legacy auth hash handling skipped because passwordless auth now uses email OTP",
    {
      currentPath: window.location.pathname,
      ...deviceInfo,
    },
  );
});
