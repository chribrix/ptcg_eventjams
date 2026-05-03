type StorageLike = {
  length: number;
  key: (index: number) => string | null;
  getItem?: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
  clear: () => void;
  removeItem: (key: string) => void;
};

type ClientAuthStateDependencies = {
  isClient?: boolean;
  localStorage?: StorageLike;
  sessionStorage?: Pick<StorageLike, "clear">;
  getCookies?: () => string[];
  expireCookie?: (name: string) => void;
  hostname?: string;
};

type ClearClientAuthStateOptions = {
  clearAllStorage?: boolean;
};

const PRESERVED_LOCAL_STORAGE_KEYS = ["guest_event_bookmarks_v1"] as const;

export const createClientAuthStateCleaner = (
  dependencies: ClientAuthStateDependencies = {},
) => {
  const isClient = dependencies.isClient ?? process.client;

  return ({ clearAllStorage = false }: ClearClientAuthStateOptions = {}) => {
    if (!isClient) {
      return;
    }

    const localStorageRef = dependencies.localStorage ?? localStorage;
    const sessionStorageRef = dependencies.sessionStorage ?? sessionStorage;
    const getCookies =
      dependencies.getCookies ?? (() => document.cookie.split(";"));
    const expireCookie =
      dependencies.expireCookie ??
      ((name: string) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

        const hostname = dependencies.hostname ?? window.location.hostname;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
      });

    try {
      if (clearAllStorage) {
        const preservedEntries: Array<[string, string]> = [];
        for (const key of PRESERVED_LOCAL_STORAGE_KEYS) {
          const value = localStorageRef.getItem?.(key) ?? null;
          if (value !== null) {
            preservedEntries.push([key, value]);
          }
        }

        localStorageRef.clear();
        sessionStorageRef.clear();

        for (const [key, value] of preservedEntries) {
          localStorageRef.setItem?.(key, value);
        }
      } else {
        const keysToRemove: string[] = [];

        for (let index = 0; index < localStorageRef.length; index++) {
          const key = localStorageRef.key(index);
          if (
            key &&
            (key.includes("supabase") || key.includes("session_start_"))
          ) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach((key) => localStorageRef.removeItem(key));
      }
    } catch {}

    try {
      const cookies = getCookies();
      for (const cookie of cookies) {
        const name = cookie.split("=")[0]?.trim();
        if (!name) {
          continue;
        }

        expireCookie(name);
      }
    } catch {}
  };
};

export const clearClientAuthState = createClientAuthStateCleaner();
