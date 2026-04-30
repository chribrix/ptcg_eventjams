// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },
  modules: [
    // "@prisma/nuxt", // Optional helper module if Prisma runtime helpers are needed
    "@nuxtjs/supabase",
    "@nuxtjs/tailwindcss",
    "@nuxt/test-utils/module",
    "@samk-dev/nuxt-vcalendar",
    "@nuxtjs/i18n",
  ],
  i18n: {
    locales: [
      {
        code: "en",
        iso: "en-US",
        name: "English",
        file: "en.json",
      },
      {
        code: "de",
        iso: "de-DE",
        name: "Deutsch",
        file: "de.json",
      },
    ],
    langDir: "locales",
    defaultLocale: "de",
    strategy: "prefix_except_default",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      redirectOn: "root",
      alwaysRedirect: false,
    },
  },
  supabase: {
    redirect: false,
    redirectOptions: {
      login: "/login",
      callback: "/login",
      exclude: ["/", "/events", "/events/*", "/eventlist"],
    },
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    clientOptions: {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        // Custom storage implementation with better iOS Safari compatibility
        storage: import.meta.client
          ? {
              getItem: (key: string) => {
                try {
                  return window.localStorage.getItem(key);
                } catch (e) {
                  // Fallback for iOS private browsing mode
                  console.warn("localStorage getItem failed:", e);
                  // Log to database for tracking
                  $fetch("/api/admin/error-logs/create", {
                    method: "POST",
                    body: {
                      errorType: "storage_getItem_failed",
                      errorMessage: `Failed to get localStorage item: ${key}`,
                      userAgent: navigator.userAgent,
                      metadata: { key, error: String(e) },
                    },
                  }).catch(() => {});
                  return null;
                }
              },
              setItem: (key: string, value: string) => {
                try {
                  window.localStorage.setItem(key, value);
                } catch (e) {
                  // Fallback for iOS private browsing mode
                  console.warn("localStorage setItem failed:", e);
                  // Log to database for tracking
                  $fetch("/api/admin/error-logs/create", {
                    method: "POST",
                    body: {
                      errorType: "storage_setItem_failed",
                      errorMessage: `Failed to set localStorage item: ${key}`,
                      userAgent: navigator.userAgent,
                      metadata: { key, error: String(e) },
                    },
                  }).catch(() => {});
                }
              },
              removeItem: (key: string) => {
                try {
                  window.localStorage.removeItem(key);
                } catch (e) {
                  console.warn("localStorage removeItem failed:", e);
                  // Log to database for tracking
                  $fetch("/api/admin/error-logs/create", {
                    method: "POST",
                    body: {
                      errorType: "storage_removeItem_failed",
                      errorMessage: `Failed to remove localStorage item: ${key}`,
                      userAgent: navigator.userAgent,
                      metadata: { key, error: String(e) },
                    },
                  }).catch(() => {});
                }
              },
            }
          : undefined,
      },
    },
  },
  runtimeConfig: {
    supabaseWebhookSecret: process.env.SUPABASE_WEBHOOK_SECRET || "",
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    // Server-side pepper for password hashing. Set PASSWORD_PEPPER in .env
    // Never expose this — it is private (server-only) runtime config.
    passwordPepper: process.env.PASSWORD_PEPPER || "",
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_KEY,
      appBaseUrl: process.env.APP_BASE_URL || "",
      deployTimestamp: process.env.DEPLOY_TIMESTAMP || "",
    },
  },

  vite: {
    server: {
      hmr: {
        clientPort: process.env.GITPOD_WORKSPACE_ID ? 443 : 3000,
      },
      allowedHosts: [
        "localhost",
        ".ngrok-free.dev", // Allow all ngrok-free.dev subdomains
        ".ngrok.io", // Legacy ngrok domains
        ".ngrok-free.app", // Alternative ngrok domains
      ],
    },
  },

  experimental: {
    appManifest: false,
  },
  typescript: {
    strict: true,
  },
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => false,
    },
  },
  app: {
    head: {
      title: "PTCG Event Manager",
      meta: [
        { name: "description", content: "Register for PTCG events with ease" },
      ],
      link: [
        {
          rel: "icon",
          type: "image/x-icon",
          href: "/favicon.ico",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/icons?family=Material+Icons",
        },
      ],
    },
  },
});
