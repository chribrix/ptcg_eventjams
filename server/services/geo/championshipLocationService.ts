type Point = { latitude: number; longitude: number };
type Storage = { getItem: (key: string) => Promise<unknown>; setItem: (key: string, value: unknown) => Promise<unknown> };

/** Approximate city centers for currently announced championships. */
const KNOWN_CITIES: Record<string, Point> = {
  "gdańsk, poland": { latitude: 54.352, longitude: 18.6466 },
  "stuttgart, germany": { latitude: 48.7758, longitude: 9.1829 },
  "birmingham, uk": { latitude: 52.4862, longitude: -1.8904 },
  "london, uk": { latitude: 51.5074, longitude: -0.1278 },
  "lisbon, portugal": { latitude: 38.7223, longitude: -9.1393 },
  "prague, czechia": { latitude: 50.0755, longitude: 14.4378 },
  "utrecht, netherlands": { latitude: 52.0907, longitude: 5.1214 },
  "bologna, italy": { latitude: 44.4949, longitude: 11.3426 },
  "são paulo, brazil": { latitude: -23.5505, longitude: -46.6333 },
  "chicago, illinois": { latitude: 41.8781, longitude: -87.6298 },
};

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const pending = new Map<string, Promise<Point | null>>();
let queue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

export function knownChampionshipLocation(location: string): Point | null {
  return KNOWN_CITIES[location.trim().toLocaleLowerCase("en-US")] || null;
}

/** Geocodes only newly announced city names, at no more than four requests per minute. */
export async function resolveChampionshipLocation(location: string, dependencies: {
  storage?: Storage;
  fetcher?: typeof fetch;
  now?: () => number;
} = {}): Promise<Point | null> {
  const known = knownChampionshipLocation(location);
  if (known) return known;
  const name = location.trim();
  if (!name || name.length > 120) return null;
  const storage = dependencies.storage || useStorage("cache");
  const now = dependencies.now || Date.now;
  const key = `championship-location:v1:${name.toLocaleLowerCase("en-US")}`;
  const cached = await storage.getItem(key) as { updatedAt: number; point: Point | null } | null;
  if (cached && now() - cached.updatedAt < (cached.point ? YEAR_MS : MONTH_MS)) return cached.point;
  let request = pending.get(key);
  if (!request) {
    request = (async () => {
      const previous = queue;
      let release!: () => void;
      queue = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try {
        const waitMs = Math.max(0, 15000 - (now() - lastRequestAt));
        if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
        lastRequestAt = now();
        const endpoint = process.env.CHAMPIONSHIP_GEOCODER_URL || "https://nominatim.openstreetmap.org/search";
        const url = `${endpoint}?format=jsonv2&limit=1&q=${encodeURIComponent(name)}`;
        const response = await (dependencies.fetcher || fetch)(url, {
          headers: { Accept: "application/json", "User-Agent": "Chrispyjams-Eventkalender/1.0 (championship city geocoding)" },
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error("Championship geocoder unavailable");
        const data = await response.json() as Array<{ lat?: string; lon?: string }>;
        const latitude = Number(data?.[0]?.lat);
        const longitude = Number(data?.[0]?.lon);
        const point = data?.[0] && Number.isFinite(latitude) && Math.abs(latitude) <= 90 &&
          Number.isFinite(longitude) && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
        await storage.setItem(key, { updatedAt: now(), point });
        return point;
      } catch {
        return null;
      } finally {
        release();
      }
    })();
    pending.set(key, request);
    void request.then(() => pending.delete(key), () => pending.delete(key));
  }
  return request;
}
