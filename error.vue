<template>
  <div class="container error-page">
    <h1>{{ getStatusMessage(error.statusCode) }}</h1>
    <p class="error-message">{{ getUserFriendlyMessage() }}</p>
    <div v-if="errorId" class="error-id">
      <small>Error ID: {{ errorId }}</small>
    </div>
    <p class="help-text">
      Please try again later or contact support if the issue persists.
    </p>
    <div class="actions">
      <nuxt-link to="/" class="home-button">Go back to home</nuxt-link>
      <button @click="reloadPage" class="reload-button">Try Again</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const props = defineProps({
  error: {
    type: {
      message: String,
      statusCode: Number,
      stack: String,
      url: String,
    },
    required: true,
  },
});

const errorId = ref(null);

// Reactive data for displaying error details
const currentUrl = ref(null);
const userAgent = ref(null);
const referrer = ref(null);
const viewport = ref(null);
const userInfo = ref({
  userId: null,
  userEmail: null,
  sessionId: null,
});
const additionalErrorInfo = ref(null);

// Generate unique error ID
const generateErrorId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Function to get user-friendly status messages
const getStatusMessage = (statusCode) => {
  switch (statusCode) {
    case 404:
      return "Page Not Found";
    case 403:
      return "Access Denied";
    case 500:
      return "Server Error";
    case 502:
    case 503:
    case 504:
      return "Service Unavailable";
    default:
      return `Error ${statusCode || "Unknown"}`;
  }
};

// Function to get user-friendly error messages (no stack traces)
const getUserFriendlyMessage = () => {
  const statusCode = props.error.statusCode;
  const message = props.error.message;

  switch (statusCode) {
    case 404:
      return "The page you're looking for doesn't exist or has been moved.";
    case 403:
      return "You don't have permission to access this resource.";
    case 500:
      return "Something went wrong on our server. We've been notified and are working to fix it.";
    case 502:
    case 503:
    case 504:
      return "Our service is temporarily unavailable. Please try again in a few moments.";
    default:
      // For other errors, sanitize the message to avoid exposing sensitive info
      if (message && typeof message === "string") {
        // Remove any potential stack trace info or file paths
        const cleanMessage = message
          .replace(/at\s+.*\s+\(.*\)/g, "") // Remove stack trace lines
          .replace(/\/[^\s]+\.(js|ts|vue|jsx|tsx)/g, "") // Remove file paths
          .replace(/Error:\s*/i, "") // Remove "Error:" prefix
          .trim();

        if (
          cleanMessage &&
          cleanMessage.length > 0 &&
          cleanMessage.length < 200
        ) {
          return cleanMessage;
        }
      }
      return "An unexpected error occurred. Please try again.";
  }
};

// Function to get user session information safely
const getUserInfo = async () => {
  try {
    if (import.meta.client) {
      const supabase = useSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return {
        userId: session?.user?.id || null,
        userEmail: session?.user?.email || null,
        sessionId: session?.access_token?.substring(0, 8) || null,
      };
    }
  } catch (err) {
    // Silently handle errors
  }
  return { userId: null, userEmail: null, sessionId: null };
};

// Function to gather error context
const gatherErrorContext = async () => {
  const userInfoData = await getUserInfo();
  const currentErrorId = generateErrorId();
  errorId.value = currentErrorId;

  // Populate reactive data for display
  if (import.meta.client) {
    currentUrl.value = window.location.href;
    userAgent.value = navigator.userAgent;
    referrer.value = document.referrer || null;
    viewport.value = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  userInfo.value = {
    userId: userInfoData.userId,
    userEmail: userInfoData.userEmail,
    sessionId: userInfoData.sessionId,
  };

  // Gather additional error information
  additionalErrorInfo.value = {
    timestamp: new Date().toISOString(),
    route: import.meta.client ? window.location.pathname : null,
    search: import.meta.client ? window.location.search : null,
    hash: import.meta.client ? window.location.hash : null,
    protocol: import.meta.client ? window.location.protocol : null,
    host: import.meta.client ? window.location.host : null,
  };

  return {
    errorId: currentErrorId,
    timestamp: new Date().toISOString(),
    level: "ERROR",
    statusCode: props.error.statusCode || "Unknown",
    message: props.error.message || "Unknown error",
    stack: props.error.stack || null,
    url: import.meta.client
      ? window.location.href
      : props.error.url || "Unknown URL",
    userAgent: import.meta.client ? navigator.userAgent : "Server-side",
    userId: userInfoData.userId,
    userEmail: userInfoData.userEmail,
    sessionId: userInfoData.sessionId,
    context: {
      referrer:
        import.meta.client && document.referrer ? document.referrer : null,
      viewport: import.meta.client
        ? {
            width: window.innerWidth,
            height: window.innerHeight,
          }
        : null,
      timestamp: new Date().toISOString(),
      route: import.meta.client ? window.location.pathname : null,
      search: import.meta.client ? window.location.search : null,
    },
  };
};

// Function to copy error details to clipboard
const copyErrorDetails = async () => {
  try {
    const errorDetails = await gatherErrorContext();
    const errorText = `
Error Report
============
Error ID: ${errorDetails.errorId}
Timestamp: ${errorDetails.timestamp}
Status Code: ${errorDetails.statusCode}
Message: ${errorDetails.message}
URL: ${errorDetails.url}
User Agent: ${errorDetails.userAgent}
${errorDetails.userId ? `User ID: ${errorDetails.userId}` : ""}
${errorDetails.userEmail ? `User Email: ${errorDetails.userEmail}` : ""}
${errorDetails.stack ? `\nStack Trace:\n${errorDetails.stack}` : ""}

Full Details:
${JSON.stringify(errorDetails, null, 2)}
    `;

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(errorText);
      alert("Error details copied to clipboard!");
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Error details copied to clipboard!");
    }
  } catch (err) {
    alert("Failed to copy error details to clipboard");
  }
};

// Function to reload the page
const reloadPage = () => {
  if (import.meta.client) {
    window.location.reload();
  }
};

// Log error details to console (will appear in server logs)
const logErrorDetails = async () => {
  try {
    const errorDetails = await gatherErrorContext();

    // Log to console with structured format for easy parsing
    console.error("=== CLIENT ERROR LOGGED ===");
    console.error("Error ID:", errorDetails.errorId);
    console.error("Timestamp:", errorDetails.timestamp);
    console.error("Status Code:", errorDetails.statusCode);
    console.error("Message:", errorDetails.message);
    console.error("URL:", errorDetails.url);
    console.error("User Agent:", errorDetails.userAgent);

    if (errorDetails.userId) {
      console.error("User ID:", errorDetails.userId);
      console.error("User Email:", errorDetails.userEmail);
    }

    if (errorDetails.sessionId) {
      console.error("Session ID:", errorDetails.sessionId);
    }

    if (errorDetails.stack) {
      console.error("Stack Trace:", errorDetails.stack);
    }

    if (errorDetails.context.referrer) {
      console.error("Referrer:", errorDetails.context.referrer);
    }

    if (errorDetails.context.viewport) {
      console.error("Viewport:", errorDetails.context.viewport);
    }

    // Log full error object as JSON for programmatic parsing
    console.error(
      "Full Error Details (JSON):",
      JSON.stringify(errorDetails, null, 2)
    );
    console.error("=== END CLIENT ERROR LOG ===");
  } catch (logError) {
    // Fallback logging if detailed logging fails
    console.error("Error logging failed, basic error info:");
    console.error("Status:", props.error.statusCode);
    console.error("Message:", props.error.message);
    console.error("Logging Error:", logError);
  }
};

// Log error on component mount (both client and server side)
onMounted(() => {
  errorId.value = generateErrorId();
  logErrorDetails();
});

// Also log immediately on server-side if available
if (import.meta.server) {
  console.error("=== SERVER-SIDE ERROR ===");
  console.error("Status Code:", props.error.statusCode);
  console.error("Message:", props.error.message);
  console.error("Stack:", props.error.stack);
  console.error("URL:", props.error.url);
  console.error("Timestamp:", new Date().toISOString());
  console.error("=== END SERVER-SIDE ERROR ===");
}
</script>

<style scoped>
.error-page {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  text-align: center;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.error-page h1 {
  color: #dc2626;
  font-size: 2rem;
  margin-bottom: 1rem;
}

.error-page p {
  color: #6b7280;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.error-id {
  margin: 1rem 0;
  padding: 0.75rem;
  background: #f3f4f6;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  text-align: center;
}

.error-id small {
  color: #6b7280;
  font-family: monospace;
  font-size: 0.875rem;
  font-weight: 500;
}

.error-message {
  font-size: 1.125rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.help-text {
  font-style: italic;
  color: #6b7280;
  margin: 1.5rem 0;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 2rem;
}

.home-button,
.copy-button,
.reload-button {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.home-button {
  background-color: #3b82f6;
  color: white;
}

.home-button:hover {
  background-color: #2563eb;
}

.copy-button {
  background-color: #10b981;
  color: white;
}

.copy-button:hover {
  background-color: #059669;
}

.reload-button {
  background-color: #f59e0b;
  color: white;
}

.reload-button:hover {
  background-color: #d97706;
}

@media (max-width: 768px) {
  .error-page {
    margin: 1rem;
    padding: 1rem;
  }

  .actions {
    flex-direction: column;
    align-items: center;
  }

  .home-button,
  .copy-button,
  .reload-button {
    width: 100%;
    max-width: 200px;
  }

  .detail-section strong {
    display: block;
    margin-bottom: 0.25rem;
    min-width: auto;
  }
}
</style>
