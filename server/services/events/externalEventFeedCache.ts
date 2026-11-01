const DEFAULT_POLICY = {
  freshMs: 6 * 60 * 60 * 1000,
  staleMs: 30 * 60 * 60 * 1000,
  retryMs: 15 * 60 * 1000,
};

type CacheEntry<T> = { timestamp: number; data: T; retryAfter?: number };
type CacheStore = {
  getItem: (key: string) => Promise<unknown>;
  setItem: (key: string, value: unknown) => Promise<unknown>;
};

const inFlight = new Map<string, Promise<unknown>>();
const failedUntil = new Map<string, number>();

/** Shared server-side cache for external event feeds. */
export async function getCachedExternalEventFeed<T>(
  key: string,
  fetchData: () => Promise<T>,
  dependencies: { storage?: CacheStore; now?: () => number; policy?: Partial<typeof DEFAULT_POLICY>; force?: boolean } = {},
): Promise<T> {
  const storage = dependencies.storage || useStorage("cache");
  const now = dependencies.now || Date.now;
  const policy = { ...DEFAULT_POLICY, ...dependencies.policy };
  const cached = await storage.getItem(key) as CacheEntry<T> | null;
  if (!dependencies.force && cached && now() - cached.timestamp < policy.freshMs) return cached.data;
  const retryAfter = Math.max(cached?.retryAfter || 0, failedUntil.get(key) || 0);
  if (retryAfter > now()) {
    if (cached && now() - cached.timestamp < policy.staleMs) return cached.data;
    throw new Error("External event feed is temporarily unavailable");
  }

  let refresh = inFlight.get(key) as Promise<T> | undefined;
  if (!refresh) {
    refresh = (async () => {
      const data = await fetchData();
      await storage.setItem(key, { data, timestamp: now() });
      failedUntil.delete(key);
      return data;
    })();
    inFlight.set(key, refresh);
    void refresh.then(() => inFlight.delete(key), () => inFlight.delete(key));
  }
  try {
    return await refresh;
  } catch {
    failedUntil.set(key, now() + policy.retryMs);
    if (cached && now() - cached.timestamp < policy.staleMs) {
      try { await storage.setItem(key, { ...cached, retryAfter: now() + policy.retryMs }); } catch { /* Return this request's stale value. */ }
      return cached.data;
    }
    throw new Error("External event feed is temporarily unavailable");
  }
}
