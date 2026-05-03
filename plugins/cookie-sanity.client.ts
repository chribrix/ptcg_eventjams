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

    // Keep auth cookies untouched to avoid accidental session invalidation.
  } catch (error) {
    console.warn("Cookie sanity check failed", error);
  }
});
