import { validRoadPoint } from "~/server/services/geo/roadDistanceService";
import { requestNominatimJson } from "~/server/services/geo/nominatimRequestService";
import type { PostcodeCountry } from "~/utils/eventLocationPreference";

type LocationName = { place: string | null; country: PostcodeCountry | null };
type Storage = { getItem: (key: string) => Promise<unknown>; setItem: (key: string, value: unknown) => Promise<unknown> };
const CACHE_MS = 30 * 24 * 60 * 60 * 1000;
const RETRY_MS = 15 * 60 * 1000;
const pending = new Map<string, Promise<LocationName>>();

export function parseReverseCoordinates(latitude: unknown, longitude: unknown): { latitude: number; longitude: number } {
  const point = { latitude: Number(latitude), longitude: Number(longitude) };
  if (latitude === "" || longitude === "" || !validRoadPoint(point)) throw new Error("Invalid coordinates");
  return { latitude: Number(point.latitude.toFixed(3)), longitude: Number(point.longitude.toFixed(3)) };
}

export function placeFromNominatim(data: unknown): LocationName {
  if (!data || typeof data !== "object") return { place: null, country: null };
  const address = (data as { address?: unknown }).address;
  if (!address || typeof address !== "object") return { place: null, country: null };
  const fields = address as Record<string, unknown>;
  const place = ["city", "town", "village", "municipality", "hamlet", "city_district", "county"]
    .map((field) => fields[field]).find((value) => typeof value === "string" && value.trim().length > 0);
  const countryCode = String(fields.country_code || "").toUpperCase();
  const country = countryCode === "DE" || countryCode === "AT" || countryCode === "CH" ? countryCode : null;
  return { place: typeof place === "string" ? place.trim().slice(0, 80) : null, country };
}

export async function reverseLocationName(
  latitudeInput: number,
  longitudeInput: number,
  dependencies: { storage?: Storage; fetcher?: typeof fetch; now?: () => number } = {},
): Promise<LocationName> {
  const { latitude, longitude } = parseReverseCoordinates(latitudeInput, longitudeInput);
  const key = `device-place:v1:${latitude},${longitude}`;
  const storage = dependencies.storage || useStorage("cache");
  const now = dependencies.now || Date.now;
  const cached = await storage.getItem(key) as { updatedAt: number; location: LocationName } | null;
  if (cached && now() - cached.updatedAt < (cached.location.place ? CACHE_MS : RETRY_MS)) return cached.location;
  let request = pending.get(key);
  if (!request) {
    request = (async () => {
      const endpoint = process.env.DEVICE_REVERSE_GEOCODER_URL || "https://nominatim.openstreetmap.org/reverse";
      const url = `${endpoint}?format=jsonv2&addressdetails=1&zoom=12&accept-language=de&lat=${latitude}&lon=${longitude}`;
      try {
        const data = await requestNominatimJson<unknown>(url, "interactive", dependencies);
        const location = placeFromNominatim(data);
        await storage.setItem(key, { updatedAt: now(), location });
        return location;
      } catch {
        const location = { place: null, country: null };
        await storage.setItem(key, { updatedAt: now(), location });
        return location;
      }
    })();
    pending.set(key, request);
    void request.then(() => pending.delete(key), () => pending.delete(key));
  }
  return request;
}
