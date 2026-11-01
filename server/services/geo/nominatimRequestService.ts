let queue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;
let queued = 0;

/** Shared per-process rate limit for user-triggered reverse and scheduled city lookups. */
export async function requestNominatimJson<T>(
  url: string,
  mode: "interactive" | "scheduled",
  dependencies: { fetcher?: typeof fetch; now?: () => number } = {},
): Promise<T> {
  const fetcher = dependencies.fetcher || fetch;
  const now = dependencies.now || Date.now;
  if (queued >= 8) throw new Error("Location lookup queue full");
  queued++;
  const previous = queue;
  let release!: () => void;
  queue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    const interval = mode === "scheduled" ? 15000 : 1100;
    const waitMs = Math.max(0, interval - (now() - lastRequestAt));
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastRequestAt = now();
    const response = await fetcher(url, {
      headers: { Accept: "application/json", "User-Agent": "Chrispyjams-Eventkalender/1.0 (location names)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Location provider unavailable");
    return await response.json() as T;
  } finally {
    queued--;
    release();
  }
}
