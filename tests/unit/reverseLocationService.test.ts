import { describe, expect, it, vi } from "vitest";
import { parseReverseCoordinates, placeFromNominatim, reverseLocationName } from "~/server/services/geo/reverseLocationService";

describe("device place name", () => {
  it("rounds coordinates and selects the town from a reverse-geocode response", () => {
    expect(parseReverseCoordinates("48.45181", "12.35624")).toEqual({ latitude: 48.452, longitude: 12.356 });
    expect(() => parseReverseCoordinates("", "12.356")).toThrow();
    expect(() => parseReverseCoordinates("91", "12.356")).toThrow();
    expect(placeFromNominatim({ address: { town: "Vilsbiburg", county: "Landshut", country_code: "de" } }))
      .toEqual({ place: "Vilsbiburg", country: "DE" });
    expect(placeFromNominatim({ address: { county: "Landshut", country_code: "de" } }))
      .toEqual({ place: "Landshut", country: "DE" });
  });

  it("caches the place name by rounded device coordinates", async () => {
    const entries = new Map<string, unknown>();
    const storage = {
      getItem: async (key: string) => entries.get(key) || null,
      setItem: async (key: string, value: unknown) => { entries.set(key, value); },
    };
    const fetcher = vi.fn(async (url: string) => {
      expect(url).toContain("lat=48.452&lon=12.356");
      return { ok: true, json: async () => ({ address: { town: "Vilsbiburg", country_code: "de" } }) } as Response;
    });
    const dependencies = { storage, fetcher: fetcher as unknown as typeof fetch };
    expect(await reverseLocationName(48.45181, 12.35624, dependencies)).toEqual({ place: "Vilsbiburg", country: "DE" });
    expect(await reverseLocationName(48.452, 12.356, dependencies)).toEqual({ place: "Vilsbiburg", country: "DE" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
