// https://nuxt.com/docs/api/configuration/nuxt-config

import { createResolver } from "@nuxt/kit";

const resolver = createResolver(import.meta.url);

export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },
  modules: [
    "@prisma/nuxt",
    "@nuxtjs/supabase",
    "@nuxtjs/tailwindcss",
    "@nuxt/test-utils/module",
    "@samk-dev/nuxt-vcalendar",
  ],
  supabase: {
    redirectOptions: {
      login: "/",
      callback: "/magic-login",
      exclude: ["/", "/login", "/register"],
    },
  },
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
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
  vite: {
    resolve: {
      alias: {
        ".prisma/client/index-browser":
          // https://vite.dev/config/shared-options.html#resolve-alias
          // When aliasing to file system paths, always use absolute paths.
          resolver.resolve("./node_modules/.prisma/client/index-browser.js"),
      },
    },
  },
});
