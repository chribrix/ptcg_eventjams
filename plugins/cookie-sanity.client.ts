const SUPPORTED_LOCALES = new Set(["de", "en"]);

const expireCookie = (name: string) => {
  const encodedName = encodeURIComponent(name);
  document.cookie = `${encodedName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;

  const hostname = window.location.hostname;
  if (
    hostname &&
    hostname.includes(".") &&
    hostname !== "localhost" &&
    !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
  ) {
    document.cookie = `${encodedName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${hostname}; SameSite=Lax`;
  }
};

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return;

  try {
    const config = useRuntimeConfig();
    const supabaseUrl = config.public?.supabaseUrl;
    let activeSupabaseRef = "";

    if (typeof supabaseUrl === "string" && supabaseUrl) {
      try {
        const hostname = new URL(supabaseUrl).hostname;
        activeSupabaseRef = hostname.split(".")[0] || "";
      } catch {
        activeSupabaseRef = "";
      }
    }

    const cookiePairs = document.cookie
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);

    const cookies = new Map<string, string>();
    for (const pair of cookiePairs) {
      const splitIndex = pair.indexOf("=");
      if (splitIndex <= 0) continue;

      const name = pair.slice(0, splitIndex).trim();
      const value = pair.slice(splitIndex + 1);
      if (!name) continue;

      cookies.set(name, value);
    }

    const localeCookie = cookies.get("i18n_redirected");
    if (localeCookie) {
      const locale = safeDecode(localeCookie).trim().toLowerCase();
      if (!SUPPORTED_LOCALES.has(locale)) {
        expireCookie("i18n_redirected");
      }
    }

    // Remove stale Supabase auth cookies from other project refs.
    // These can accumulate and trigger oversized Cookie headers (often seen as 502/431).
    if (activeSupabaseRef) {
      for (const name of cookies.keys()) {
        const match = /^sb-([a-z0-9_-]+)-auth-token(?:\.\d+)?$/i.exec(name);
        if (match && match[1] !== activeSupabaseRef) {
          expireCookie(name);
        }
      }
    }
  } catch (error) {
    console.warn("Cookie sanity check failed", error);
  }
});
