import { describe, expect, it, vi } from "vitest";
import {
  getCachedChampionships,
  parseChampionshipDateRange,
  parseOfficialChampionships,
} from "~/server/services/events/championshipScheduleService";

const item = (title: string, range: string, path: string, region = "europe", type = "regional") => ({
  eventName_s: title, displayDateRange_s: range, uRL_s: path,
  region_s: region, type_s: type, year_s: "2027",
  eventLocation_s: title.includes("Stuttgart") ? "Stuttgart, Germany" : title.includes("Lisbon") ? "Lisbon, Portugal" : undefined,
});

describe("official championship schedule", () => {
  it("includes European Regionals and Specials plus worldwide Internationals and Worlds", () => {
    const events = parseOfficialChampionships({ items: [
      item("2027 Stuttgart Pokémon Regional Championships", "Nov. 28–29", "/en-us/events/regionals/2027/stuttgart"),
      item("2027 Las Vegas Pokémon Regional Championships", "Dec. 4–6", "/en-us/events/regionals/2027/las-vegas", "northamerica"),
      item("2027 Lisbon Pokémon Special Championships", "Apr. 10–11", "/en-us/events/regionals/2027/lisbon"),
      item("2027 Pokémon Latin America International Championships", "Nov. 20–22", "/en-us/events/internationals/2027/sao-paulo", "latinamerica", "international"),
      item("2027 Pokémon World Championships", "Aug. 20–22", "/en-us/events/worlds/2027", "northamerica", "world"),
    ] });
    expect(events.map(({ kind, startDate, endDate }) => [kind, startDate, endDate])).toEqual([
      ["regional", "2026-11-28", "2026-11-29"],
      ["special", "2027-04-10", "2027-04-11"],
      ["international", "2026-11-20", "2026-11-22"],
      ["worlds", "2027-08-20", "2027-08-22"],
    ]);
    expect(events[0].link).toBe("https://championships.pokemon.com/en-us/events/regionals/2027/stuttgart");
    expect(events[0].location).toBe("Stuttgart, Germany");
    expect(events[0].latitude).toBeCloseTo(48.7758);
    expect(events[0].longitude).toBeCloseTo(9.1829);
    expect(events[0].gameType).toBeUndefined();
  });

  it("validates dates and rejects an empty or untrusted provider response", () => {
    expect(parseChampionshipDateRange("Oct. 31 – Nov. 1", 2027)).toEqual({ startDate: "2026-10-31", endDate: "2026-11-01" });
    expect(parseChampionshipDateRange("Feb. 30–31", 2027)).toBeNull();
    expect(() => parseOfficialChampionships({ items: [] })).toThrow("no relevant events");
    expect(() => parseOfficialChampionships({ items: [item("Regional Championships", "Nov. 28–29", "https://example.org/en-us/events/evil")] })).toThrow();
  });

  it("refreshes once a week, coalesces callers and retains stale data on failure", async () => {
    const entries = new Map<string, unknown>();
    const storage = { getItem: async (key: string) => entries.get(key) || null, setItem: async (key: string, value: unknown) => { entries.set(key, value); } };
    const data = parseOfficialChampionships({ items: [item("2027 Stuttgart Pokémon Regional Championships", "Nov. 28–29", "/en-us/events/regionals/2027/stuttgart")] });
    const fetchEvents = vi.fn(async () => data);
    let now = 0;
    const dependencies = { storage, fetchEvents, now: () => now };
    const [first, second] = await Promise.all([getCachedChampionships(dependencies), getCachedChampionships(dependencies)]);
    expect(first).toEqual(second);
    expect(fetchEvents).toHaveBeenCalledTimes(1);
    now = 6 * 24 * 60 * 60 * 1000;
    expect(await getCachedChampionships(dependencies)).toEqual(data);
    expect(fetchEvents).toHaveBeenCalledTimes(1);
    now = 8 * 24 * 60 * 60 * 1000;
    fetchEvents.mockRejectedValueOnce(new Error("offline"));
    expect(await getCachedChampionships(dependencies)).toEqual(data);
    expect(fetchEvents).toHaveBeenCalledTimes(2);
    expect(entries.has("championships:official:v2")).toBe(true);
  });
});
