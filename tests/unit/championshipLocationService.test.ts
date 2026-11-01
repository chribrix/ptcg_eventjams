import { describe, expect, it, vi } from "vitest";
import { knownChampionshipLocation, resolveChampionshipLocation } from "~/server/services/geo/championshipLocationService";

describe("championship city locations", () => {
  it("uses current European Regional city centers without geocoding", async () => {
    expect(knownChampionshipLocation("Gdańsk, Poland")).toEqual({ latitude: 54.352, longitude: 18.6466 });
    expect(knownChampionshipLocation("Stuttgart, Germany")).toEqual({ latitude: 48.7758, longitude: 9.1829 });
    expect(knownChampionshipLocation("Prague, Czechia")).toEqual({ latitude: 50.0755, longitude: 14.4378 });
    const fetcher = vi.fn();
    expect(await resolveChampionshipLocation("Utrecht, Netherlands", { fetcher })).toEqual({ latitude: 52.0907, longitude: 5.1214 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("caches a newly announced city and rejects missing locations", async () => {
    const entries = new Map<string, unknown>();
    const storage = { getItem: async (key: string) => entries.get(key) || null, setItem: async (key: string, value: unknown) => { entries.set(key, value); } };
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => [{ lat: "47.1", lon: "8.5" }] } as Response));
    const dependencies = { storage, fetcher: fetcher as unknown as typeof fetch };
    expect(await resolveChampionshipLocation("Example City, Switzerland", dependencies)).toEqual({ latitude: 47.1, longitude: 8.5 });
    expect(await resolveChampionshipLocation("Example City, Switzerland", dependencies)).toEqual({ latitude: 47.1, longitude: 8.5 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await resolveChampionshipLocation("", dependencies)).toBeNull();
  });
});
