import { describe, expect, it, vi } from "vitest";
import { lookupPostcode, parsePostcodeLookup } from "~/server/services/geo/postcodeService";

describe("postcode lookup", () => {
  it("validates the supported postal formats", () => {
    expect(parsePostcodeLookup("DE", "84028")).toEqual({ country: "DE", postcode: "84028" });
    expect(parsePostcodeLookup("AT", "1010")).toEqual({ country: "AT", postcode: "1010" });
    expect(() => parsePostcodeLookup("DE", "8402")).toThrow();
    expect(() => parsePostcodeLookup("FR", "75001")).toThrow();
    expect(() => parsePostcodeLookup(["DE", "AT"], "84028")).toThrow();
  });

  it("caches the public postcode centroid", async () => {
    const entries = new Map<string, unknown>();
    const storage = {
      getItem: async (key: string) => entries.get(key) || null,
      setItem: async (key: string, value: unknown) => { entries.set(key, value); },
    };
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ places: [{ "place name": "Landshut", latitude: "48.53", longitude: "12.15" }] }),
    } as Response));
    const first = await lookupPostcode("DE", "84028", { storage, fetcher: fetcher as typeof fetch, now: () => 1 });
    const second = await lookupPostcode("DE", "84028", { storage, fetcher: fetcher as typeof fetch, now: () => 2 });
    expect(first).toEqual({ country: "DE", postcode: "84028", place: "Landshut", latitude: 48.53, longitude: 12.15 });
    expect(second).toEqual(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("caches an unknown postcode without retrying the provider", async () => {
    const entries = new Map<string, unknown>();
    const storage = {
      getItem: async (key: string) => entries.get(key) || null,
      setItem: async (key: string, value: unknown) => { entries.set(key, value); },
    };
    const fetcher = vi.fn(async () => ({ ok: false, status: 404 } as Response));
    expect(await lookupPostcode("DE", "99998", { storage, fetcher: fetcher as typeof fetch })).toBeNull();
    expect(await lookupPostcode("DE", "99998", { storage, fetcher: fetcher as typeof fetch })).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
