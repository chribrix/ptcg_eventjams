import { describe, expect, it, vi } from "vitest";
import {
  createPokedataFetchPlan,
  filterPokedataEvents,
  getCachedPokedataEvents,
  listPokedataCatalogEvents,
  parsePokedataSearchQuery,
} from "~/server/services/events/pokedataSearchService";
import type { PokedataCalendarEvent } from "~/server/services/events/pokedataService";

const event = (id: string, state: string, latitude: number, longitude: number): PokedataCalendarEvent => ({
  id, title: id, dateTime: "2026-11-01", type: "League Cup", gameType: "tcg",
  venue: id, location: "", country: "DE", link: "", icon: "cup", state, latitude, longitude,
});

describe("Pokedata search and cache", () => {
  it("keeps Bavaria as the default, but makes radius and state selectable", () => {
    const defaultSearch = parsePokedataSearchQuery({});
    const berlin = parsePokedataSearchQuery({ state: "Berlin" });
    const nearby = parsePokedataSearchQuery({ latitude: "48.5442", longitude: "12.1468", radius: "20" });
    expect(filterPokedataEvents([
      event("bavaria", "Bavaria", 48.5442, 12.1468),
      event("berlin", "Pankow", 52.52, 13.4),
    ], defaultSearch).map(({ id }) => id)).toEqual(["bavaria"]);
    expect(filterPokedataEvents([event("berlin", "Pankow", 52.52, 13.4)], berlin)).toHaveLength(1);
    expect(filterPokedataEvents([
      event("near", "Bavaria", 48.5442, 12.1468),
      event("far", "Bavaria", 49.2, 12.1),
    ], nearby).map(({ id }) => id)).toEqual(["near"]);
    expect(() => parsePokedataSearchQuery({ radius: "20" })).toThrow();
    expect(() => parsePokedataSearchQuery({ latitude: "", longitude: "12", radius: "20" })).toThrow();
    expect(() => parsePokedataSearchQuery({ latitude: "95", longitude: "12", radius: "20" })).toThrow();
  });

  it("uses the same upstream feed for all radii and federal states in one country", () => {
    const first = createPokedataFetchPlan(parsePokedataSearchQuery({ state: "Berlin" }));
    const second = createPokedataFetchPlan(parsePokedataSearchQuery({ latitude: "48.5442", longitude: "12.1468", radius: "200" }));
    expect(first).toEqual(second);
    expect(first.filters.states).toEqual([]);
  });

  it("deduplicates cold fetches, refreshes after six hours and serves stale data on failure", async () => {
    const entries = new Map<string, unknown>();
    const storage = {
      getItem: async (key: string) => entries.get(key) || null,
      setItem: async (key: string, value: unknown) => { entries.set(key, value); },
    };
    let now = 0;
    const fetchEvents = vi.fn(async () => [event("cached", "Bavaria", 48.5, 12.1)]);
    const search = parsePokedataSearchQuery({});
    const dependencies = { storage, fetchEvents, now: () => now };
    const [first, second] = await Promise.all([
      getCachedPokedataEvents(search, dependencies),
      getCachedPokedataEvents(search, dependencies),
    ]);
    expect(first).toEqual(second);
    expect(fetchEvents).toHaveBeenCalledTimes(1);
    now = 7 * 60 * 60 * 1000;
    fetchEvents.mockRejectedValueOnce(new Error("upstream down"));
    expect(await getCachedPokedataEvents(search, dependencies)).toEqual(first);
    expect(fetchEvents).toHaveBeenCalledTimes(2);
    now += 60 * 1000;
    expect(await getCachedPokedataEvents(search, dependencies)).toEqual(first);
    expect(fetchEvents).toHaveBeenCalledTimes(2);
    now = 31 * 60 * 60 * 1000;
    fetchEvents.mockRejectedValueOnce(new Error("upstream down"));
    await expect(getCachedPokedataEvents(search, dependencies)).rejects.toThrow("temporarily unavailable");
  });

  it("applies current local overrides after loading the cached provider feed", async () => {
    let hidden = true;
    const loadEvents = vi.fn(async () => [event("Store A", "Bavaria", 48.5, 12.1)]);
    const loadOverrides = vi.fn(async () => [{
      id: "override-1", eventName: "Store A", eventDate: "2026-11-01T00:00:00.000Z",
      overrides: {}, hideFromCalendar: hidden,
    }]);
    const search = parsePokedataSearchQuery({});
    const dependencies = { loadEvents, loadOverrides };
    expect(await listPokedataCatalogEvents(search, false, dependencies)).toEqual([]);
    expect(await listPokedataCatalogEvents(search, true, dependencies)).toHaveLength(1);
    hidden = false;
    expect(await listPokedataCatalogEvents(search, false, dependencies)).toHaveLength(1);
    expect(loadOverrides).toHaveBeenCalledTimes(3);
  });
});
