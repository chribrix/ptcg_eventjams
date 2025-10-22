// https://nuxt.com/docs/api/configuration/nuxt-config

import { createResolver } from "@nuxt/kit";

const resolver = createResolver(import.meta.url);

export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },
  modules: [
    // "@prisma/nuxt", // Commented out due to conflicts with custom Prisma output path
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
    redirectOptions: {
      login: "/",
      callback: "/magic-login",
      exclude: ["/", "/login", "/register", "/eventlist", "/events"],
    },
  },
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_KEY,
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
  alias: {
    // Force all Prisma client imports to use custom location
    "@prisma/client": resolver.resolve("./generated/prisma"),
    ".prisma/client": resolver.resolve("./generated/prisma"),
  },
  vite: {
    resolve: {
      alias: {
        // Point to your custom Prisma client location for Vite
        "@prisma/client": resolver.resolve("./generated/prisma"),
        ".prisma/client": resolver.resolve("./generated/prisma"),
        ".prisma/client/index-browser": resolver.resolve(
          "./generated/prisma/index-browser.js"
        ),
      },
    },
  },
});
