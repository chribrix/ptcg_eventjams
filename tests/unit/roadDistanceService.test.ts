import { describe, expect, it, vi } from "vitest";
import { getRoadDistances, validRoadPoint } from "~/server/services/geo/roadDistanceService";

describe("road distance matrix", () => {
  it("uses routed meters, batches destinations and caches repeated origin pairs", async () => {
    const entries = new Map<string, unknown>();
    const storage = {
      getItem: async (key: string) => entries.get(key) || null,
      setItem: async (key: string, value: unknown) => { entries.set(key, value); },
    };
    const fetcher = vi.fn(async (url: string) => {
      expect(url).toContain("/table/v1/driving/12.15,48.54;11.58,48.14;12.15,48.675");
      expect(url).toContain("sources=0&destinations=1;2&annotations=distance");
      return { ok: true, json: async () => ({ code: "Ok", distances: [[86000, 22000]] }) } as Response;
    });
    const origin = { latitude: 48.54, longitude: 12.15 };
    const destinations = [{ latitude: 48.14, longitude: 11.58 }, { latitude: 48.675, longitude: 12.15 }];
    const dependencies = { storage, fetcher: fetcher as unknown as typeof fetch };
    expect(await getRoadDistances(origin, destinations, dependencies)).toEqual([86000, 22000]);
    expect(await getRoadDistances(origin, destinations, dependencies)).toEqual([86000, 22000]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("leaves unrouteable destinations without a guessed distance", async () => {
    const storage = { getItem: async () => null, setItem: async () => {} };
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ code: "Ok", distances: [[null]] }) } as Response));
    expect(await getRoadDistances({ latitude: 48.54, longitude: 12.15 }, [{ latitude: 48.14, longitude: 11.58 }], { storage, fetcher: fetcher as unknown as typeof fetch })).toEqual([null]);
    expect(validRoadPoint({ latitude: 99, longitude: 12 })).toBe(false);
  });

  it("keeps reachable destinations when one target makes the matrix fail", async () => {
    const storage = { getItem: async () => null, setItem: async () => {} };
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes(";11.58,48.14;12.15,48.675")) {
        return { ok: false, status: 400, json: async () => ({ code: "NoSegment" }) } as Response;
      }
      if (url.includes(";12.15,48.675")) {
        return { ok: false, status: 400, json: async () => ({ code: "NoSegment" }) } as Response;
      }
      return { ok: true, status: 200, json: async () => ({ code: "Ok", distances: [[86000]] }) } as Response;
    });
    expect(await getRoadDistances(
      { latitude: 48.54, longitude: 12.15 },
      [{ latitude: 48.14, longitude: 11.58 }, { latitude: 48.675, longitude: 12.15 }],
      { storage, fetcher: fetcher as unknown as typeof fetch },
    )).toEqual([86000, null]);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
