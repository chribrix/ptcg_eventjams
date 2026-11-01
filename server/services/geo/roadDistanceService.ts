type Point = { latitude: number; longitude: number };
type CacheEntry = { updatedAt: number; meters: number | null };
type Storage = { getItem: (key: string) => Promise<unknown>; setItem: (key: string, value: unknown) => Promise<unknown> };

const CACHE_MS = 7 * 24 * 60 * 60 * 1000;
const RETRY_MS = 15 * 60 * 1000;
const PROVIDER_COOLDOWN_MS = 60 * 1000;
const ROUTING_BASE_URL = "https://routing.openstreetmap.de/routed-car";
class MatrixRejectedError extends Error {}
let queue: Promise<void> = Promise.resolve();
let lastUpstreamAt = 0;
let queued = 0;
let unavailableUntil = 0;

export function roadDistanceRetryAfterSeconds(): number {
  return Math.max(0, Math.ceil((unavailableUntil - Date.now()) / 1000));
}

export function validRoadPoint(value: unknown): value is Point {
  if (!value || typeof value !== "object") return false;
  const point = value as Record<string, unknown>;
  return typeof point.latitude === "number" && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 &&
    typeof point.longitude === "number" && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}

function rounded(point: Point): Point {
  return { latitude: Math.round(point.latitude * 1000) / 1000, longitude: Math.round(point.longitude * 1000) / 1000 };
}

function cacheKey(origin: Point, destination: Point): string {
  return `road-distance:v1:${origin.latitude},${origin.longitude}:${destination.latitude},${destination.longitude}`;
}

async function queryRoadMatrix(origin: Point, destinations: Point[], fetcher: typeof fetch, now: () => number): Promise<Array<number | null>> {
  if (now() < unavailableUntil) throw new Error("Routing provider in retry cooldown");
  if (queued >= 8) throw new Error("Routing queue full");
  queued++;
  const previous = queue;
  let release!: () => void;
  queue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    const waitMs = Math.max(0, 1100 - (now() - lastUpstreamAt));
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastUpstreamAt = now();
    const coordinates = [origin, ...destinations].map(({ latitude, longitude }) => `${longitude},${latitude}`).join(";");
    const destinationIndices = destinations.map((_, index) => index + 1).join(";");
    const url = `${process.env.ROUTING_SERVICE_BASE_URL || ROUTING_BASE_URL}/table/v1/driving/${coordinates}?sources=0&destinations=${destinationIndices}&annotations=distance`;
    try {
      const response = await fetcher(url, {
        headers: { Accept: "application/json", "User-Agent": "Chrispyjams-Eventkalender/1.0 (event routing distances)" },
        signal: AbortSignal.timeout(8000),
      });
      if (response.status === 400) throw new MatrixRejectedError("Routing matrix rejected coordinates");
      if (!response.ok) throw new Error(`Routing provider HTTP ${response.status}`);
      const data = await response.json() as { code?: string; distances?: Array<Array<number | null>> };
      if (data.code === "NoSegment" || data.code === "TooBig" || data.code === "NoRoute") {
        throw new MatrixRejectedError(`Routing matrix rejected: ${data.code}`);
      }
      if (data.code !== "Ok" || !Array.isArray(data.distances?.[0]) || data.distances[0].length !== destinations.length) {
        throw new Error("Routing provider returned invalid distances");
      }
      unavailableUntil = 0;
      return data.distances[0].map((meters) => typeof meters === "number" && Number.isFinite(meters) && meters >= 0 ? meters : null);
    } catch (error) {
      if (!(error instanceof MatrixRejectedError)) unavailableUntil = now() + PROVIDER_COOLDOWN_MS;
      throw error;
    }
  } finally {
    queued--;
    release();
  }
}

async function routeWithIsolation(origin: Point, destinations: Point[], fetcher: typeof fetch, now: () => number): Promise<Array<number | null>> {
  try {
    return await queryRoadMatrix(origin, destinations, fetcher, now);
  } catch (error) {
    if (!(error instanceof MatrixRejectedError)) throw error;
    if (destinations.length === 1) return [null];
    const midpoint = Math.floor(destinations.length / 2);
    const first = await routeWithIsolation(origin, destinations.slice(0, midpoint), fetcher, now);
    const second = await routeWithIsolation(origin, destinations.slice(midpoint), fetcher, now);
    return [...first, ...second];
  }
}

/** Returns meters in input order. Missing road connections stay null, never air-line estimates. */
export async function getRoadDistances(
  originInput: Point,
  destinationInputs: Point[],
  dependencies: { storage?: Storage; fetcher?: typeof fetch; now?: () => number } = {},
): Promise<Array<number | null>> {
  const storage = dependencies.storage || useStorage("cache");
  const fetcher = dependencies.fetcher || fetch;
  const now = dependencies.now || Date.now;
  const origin = rounded(originInput);
  const destinations = destinationInputs.map(rounded);
  const entries = await Promise.all(destinations.map((destination) => storage.getItem(cacheKey(origin, destination)) as Promise<CacheEntry | null>));
  const result: Array<number | null> = Array(destinations.length).fill(null);
  const missing: number[] = [];
  entries.forEach((entry, index) => {
    if (entry && typeof entry.updatedAt === "number" && now() - entry.updatedAt < (entry.meters === null ? RETRY_MS : CACHE_MS)) {
      result[index] = entry.meters;
    } else {
      missing.push(index);
    }
  });
  if (!missing.length) return result;
  try {
    const routed = await routeWithIsolation(origin, missing.map((index) => destinations[index]), fetcher, now);
    await Promise.all(missing.map(async (index, position) => {
      result[index] = routed[position];
      await storage.setItem(cacheKey(origin, destinations[index]), { updatedAt: now(), meters: routed[position] });
    }));
  } catch {
    // Existing fresh entries remain available. A failed provider is not replaced by a guessed distance.
  }
  return result;
}
