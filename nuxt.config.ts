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
    defaultLocale: "en",
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
      callback: "/confirm",
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
        storage: process.client ? window.localStorage : undefined,
      },
    },
  },
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_KEY,
      appBaseUrl: process.env.APP_BASE_URL || "",
    },
  },

  experimental: {
    appManifest: false,
  },
  typescript: {
    strict: true,
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
