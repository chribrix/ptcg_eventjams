// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: {
    enabled:
      process.env.NODE_ENV !== "production" &&
      process.env.NODE_ENV !== "test" &&
      !process.env.VITEST,
  },
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
      script: [
        {
          id: "app-color-theme-init",
          children:
            "(() => { try { const key = 'app-color-theme'; const theme = localStorage.getItem(key) || 'dark'; document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; } catch (_error) { document.documentElement.dataset.theme = 'dark'; document.documentElement.style.colorScheme = 'dark'; } })();",
        },
      ],
      link: [
        {
          rel: "icon",
          type: "image/png",
          sizes: "32x32",
          href: "/favicon-32.png?v=3",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "16x16",
          href: "/favicon-16.png?v=3",
        },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/apple-touch-icon.png?v=3",
        },
        {
          rel: "shortcut icon",
          href: "/favicon-32.png?v=3",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/icons?family=Material+Icons",
        },
      ],
    },
  },
});
