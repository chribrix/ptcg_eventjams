const SUPPORTED_LOCALES = new Set(["de", "en"]);

const expireCookie = (name: string) => {
  const encodedName = encodeURIComponent(name);
  document.cookie = `${encodedName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;

  const hostname = window.location.hostname;
  if (hostname && hostname.includes(".")) {
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

const isValidSupabaseTokenCookie = (rawValue: string) => {
  const decodedValue = safeDecode(rawValue);

  // Supabase token cookies are JSON values. Accept both array and object shapes.
  try {
    const parsed = JSON.parse(decodedValue);

    if (Array.isArray(parsed)) {
      return parsed.length >= 2 && parsed.every((item) => typeof item === "string");
    }

    if (parsed && typeof parsed === "object") {
      const tokenRecord = parsed as Record<string, unknown>;
      return (
        typeof tokenRecord.access_token === "string" &&
        typeof tokenRecord.refresh_token === "string"
      );
    }

    return false;
  } catch {
    return false;
  }
};

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return;

  try {
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

    // Clear malformed Supabase auth cookies (including chunked variants .0, .1, ...)
    const sbAuthRegex = /^sb-.*-auth-token(?:\.\d+)?$/;
    for (const [name, value] of cookies.entries()) {
      if (!sbAuthRegex.test(name)) continue;
      if (isValidSupabaseTokenCookie(value)) continue;

      const baseName = name.replace(/\.\d+$/, "");
      expireCookie(baseName);
      expireCookie(name);

      for (const cookieName of cookies.keys()) {
        if (cookieName.startsWith(`${baseName}.`)) {
          expireCookie(cookieName);
        }
      }
    }
  } catch (error) {
    console.warn("Cookie sanity check failed", error);
  }
});
