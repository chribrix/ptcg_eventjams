import type { PostcodeCountry, PostcodeLocation } from "~/utils/eventLocationPreference";

const CACHE_MS = 30 * 24 * 60 * 60 * 1000;
const pending = new Map<string, Promise<PostcodeLocation | null>>();

export function parsePostcodeLookup(countryValue: unknown, postcodeValue: unknown): { country: PostcodeCountry; postcode: string } {
  if (countryValue !== undefined && typeof countryValue !== "string") throw new Error("Invalid country");
  const country = typeof countryValue === "string" ? countryValue.toUpperCase() : "DE";
  const postcode = typeof postcodeValue === "string" ? postcodeValue.trim() : "";
  if (country !== "DE" && country !== "AT" && country !== "CH") throw new Error("Invalid country");
  if (!(country === "DE" ? /^\d{5}$/ : /^\d{4}$/).test(postcode)) throw new Error("Invalid postcode");
  return { country, postcode };
}

export async function lookupPostcode(
  country: PostcodeCountry,
  postcode: string,
  dependencies: {
    fetcher?: typeof fetch;
    storage?: { getItem: (key: string) => Promise<unknown>; setItem: (key: string, value: unknown) => Promise<unknown> };
    now?: () => number;
  } = {},
): Promise<PostcodeLocation | null> {
  const key = `postcode:v1:${country}:${postcode}`;
  const storage = dependencies.storage || useStorage("cache");
  const now = dependencies.now || Date.now;
  const cached = await storage.getItem(key) as { timestamp: number; location: PostcodeLocation | null } | null;
  if (cached && now() - cached.timestamp < CACHE_MS) return cached.location;
  let request = pending.get(key);
  if (!request) {
    request = (async () => {
      const response = await (dependencies.fetcher || fetch)(`https://api.zippopotam.us/${country}/${postcode}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (response.status === 404) {
        await storage.setItem(key, { timestamp: now(), location: null });
        return null;
      }
      if (!response.ok) throw new Error("Postcode provider unavailable");
      const data = await response.json() as { places?: Array<{ "place name"?: string; latitude?: string; longitude?: string }> };
      const first = data.places?.[0];
      const latitude = Number(first?.latitude);
      const longitude = Number(first?.longitude);
      if (!first || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error("Postcode provider returned invalid coordinates");
      }
      const location = { country, postcode, place: first["place name"] || postcode, latitude, longitude };
      await storage.setItem(key, { timestamp: now(), location });
      return location;
    })();
    pending.set(key, request);
    void request.then(() => pending.delete(key), () => pending.delete(key));
  }
  return request;
}
