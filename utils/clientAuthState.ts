type StorageLike = {
  length: number;
  key: (index: number) => string | null;
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
        localStorageRef.clear();
        sessionStorageRef.clear();
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
