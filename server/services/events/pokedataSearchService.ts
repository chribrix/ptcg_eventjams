import prisma from "~/lib/prisma";
import { applyExternalEventOverridesToFeed } from "./eventProjectionService";
import { fetchPokedataEvents, type PokedataCalendarEvent, type PokedataFilters } from "./pokedataService";

const FRESH_MS = 6 * 60 * 60 * 1000;
const STALE_MS = 30 * 60 * 60 * 1000;
const FAILURE_RETRY_MS = 15 * 60 * 1000;

const STATE_NAMES: Record<string, string[]> = {
  "baden-württemberg": ["Baden-Württemberg", "Baden-Wurttemberg"],
  bayern: ["Bavaria", "Bayern"],
  berlin: ["Berlin", "Mitte", "Pankow", "Charlottenburg-Wilmersdorf", "Friedrichshain-Kreuzberg", "Neukolln", "Neukölln", "Tempelhof-Schöneberg", "Steglitz-Zehlendorf", "Treptow-Köpenick", "Lichtenberg", "Marzahn-Hellersdorf", "Reinickendorf", "Spandau"],
  brandenburg: ["Brandenburg"],
  bremen: ["Bremen"],
  hamburg: ["Hamburg"],
  hessen: ["Hessen", "Hesse"],
  "mecklenburg-vorpommern": ["Mecklenburg-Vorpommern"],
  niedersachsen: ["Niedersachsen", "Lower Saxony"],
  "nordrhein-westfalen": ["Nordrhein-Westfalen", "North Rhine-Westphalia"],
  "rheinland-pfalz": ["Rheinland-Pfalz", "Rhineland-Palatinate"],
  saarland: ["Saarland"],
  sachsen: ["Sachsen", "Saxony"],
  "sachsen-anhalt": ["Sachsen-Anhalt", "Saxony-Anhalt"],
  "schleswig-holstein": ["Schleswig-Holstein"],
  thüringen: ["Thüringen", "Thuringia"],
};

export class PokedataSearchInputError extends Error {}

export type PokedataSearch = {
  country: "DE" | "AT" | "CH";
  state: string | null;
  geo: { latitude: number; longitude: number; radiusKm: number } | null;
};

const single = (value: unknown): string | undefined =>
  typeof value === "string" ? value.trim() : undefined;

export function parsePokedataSearchQuery(query: Record<string, unknown>): PokedataSearch {
  const country = (single(query.country) || "DE").toUpperCase();
  if (!["DE", "AT", "CH"].includes(country)) {
    throw new PokedataSearchInputError("country must be DE, AT or CH");
  }
  const stateInput = single(query.state) || null;
  const state = stateInput?.toLocaleLowerCase("de-DE") || null;
  if (state && (country !== "DE" || !STATE_NAMES[state])) {
    throw new PokedataSearchInputError("state must be a German federal state");
  }
  const coordinateValues = [query.latitude, query.longitude, query.radius];
  const hasGeoValue = coordinateValues.some((value) => value !== undefined);
  let geo: PokedataSearch["geo"] = null;
  if (hasGeoValue) {
    if (coordinateValues.some((value) => !single(value))) {
      throw new PokedataSearchInputError("latitude, longitude and radius are required together");
    }
    const [latitude, longitude, radiusKm] = coordinateValues.map((value) => Number(single(value)));
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
        !Number.isInteger(radiusKm) || radiusKm < 20 || radiusKm > 200) {
      throw new PokedataSearchInputError("coordinates or radius are outside the allowed range");
    }
    geo = { latitude, longitude, radiusKm };
  }
  return { country: country as PokedataSearch["country"], state, geo };
}

export function createPokedataFetchPlan(search: PokedataSearch): { filters: PokedataFilters; key: string } {
  // One paginated upstream feed per country serves all radii and states.
  const filters: PokedataFilters = { games: ["tcg", "vgc"], country: search.country, states: [] };
  return { filters, key: `pokedata:raw:v4:${search.country}` };
}

export function distanceKm(firstLat: number, firstLon: number, secondLat: number, secondLon: number): number {
  const radians = Math.PI / 180;
  const dLat = (secondLat - firstLat) * radians;
  const dLon = (secondLon - firstLon) * radians;
  const haversine = Math.sin(dLat / 2) ** 2 +
    Math.cos(firstLat * radians) * Math.cos(secondLat * radians) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

type CacheEntry = { timestamp: number; data: PokedataCalendarEvent[]; retryAfter?: number };
type CacheStore = { getItem: (key: string) => Promise<unknown>; setItem: (key: string, value: CacheEntry) => Promise<unknown> };
const inFlight = new Map<string, Promise<PokedataCalendarEvent[]>>();
const failedUntil = new Map<string, number>();

export async function getCachedPokedataEvents(
  search: PokedataSearch,
  dependencies: {
    storage?: CacheStore;
    fetchEvents?: typeof fetchPokedataEvents;
    now?: () => number;
  } = {},
): Promise<PokedataCalendarEvent[]> {
  const { key, filters } = createPokedataFetchPlan(search);
  const storage = dependencies.storage || useStorage("cache");
  const now = dependencies.now || Date.now;
  const cached = await storage.getItem(key) as CacheEntry | null;
  if (cached && now() - cached.timestamp < FRESH_MS) return filterPokedataEvents(cached.data, search);
  const retryAfter = Math.max(cached?.retryAfter || 0, failedUntil.get(key) || 0);
  if (retryAfter > now()) {
    if (cached && now() - cached.timestamp < STALE_MS) return filterPokedataEvents(cached.data, search);
    throw new Error("Pokedata is temporarily unavailable");
  }

  let refresh = inFlight.get(key);
  if (!refresh) {
    refresh = (async () => {
      const data = await (dependencies.fetchEvents || fetchPokedataEvents)(filters);
      await storage.setItem(key, { data, timestamp: now() });
      failedUntil.delete(key);
      return data;
    })();
    inFlight.set(key, refresh);
    void refresh.then(() => inFlight.delete(key), () => inFlight.delete(key));
  }
  try {
    return filterPokedataEvents(await refresh, search);
  } catch {
    failedUntil.set(key, now() + FAILURE_RETRY_MS);
    if (cached && now() - cached.timestamp < STALE_MS) {
      try {
        await storage.setItem(key, { ...cached, retryAfter: now() + FAILURE_RETRY_MS });
      } catch {
        // The stale entry remains usable in this request even if storage is unavailable.
      }
      return filterPokedataEvents(cached.data, search);
    }
    throw new Error("Pokedata is temporarily unavailable");
  }
}

export function filterPokedataEvents(events: PokedataCalendarEvent[], search: PokedataSearch): PokedataCalendarEvent[] {
  const allowedStates = search.state
    ? new Set(STATE_NAMES[search.state].map((name) => name.toLocaleLowerCase("de-DE")))
    : !search.geo && search.country === "DE"
      ? new Set(STATE_NAMES.bayern.map((name) => name.toLocaleLowerCase("de-DE")))
      : null;
  const byState = allowedStates
    ? events.filter((event) => event.state && allowedStates.has(event.state.toLocaleLowerCase("de-DE")))
    : events;
  const selected = search.geo
    ? byState.flatMap((event) => {
        if (event.latitude === undefined || event.longitude === undefined) return [];
        const distance = distanceKm(search.geo!.latitude, search.geo!.longitude, event.latitude, event.longitude);
        return distance <= search.geo!.radiusKm ? [{ ...event, distanceKm: Math.round(distance * 10) / 10 }] : [];
      })
    : byState;
  return [...selected].sort((first, second) =>
    `${first.dateTime}T${first.time || "00:00"}`.localeCompare(`${second.dateTime}T${second.time || "00:00"}`));
}

export async function listPokedataCatalogEvents(
  search: PokedataSearch,
  includeHidden = false,
  dependencies: {
    loadEvents?: (search: PokedataSearch) => Promise<PokedataCalendarEvent[]>;
    loadOverrides?: () => Promise<Parameters<typeof applyExternalEventOverridesToFeed>[1]>;
  } = {},
) {
  const events = await (dependencies.loadEvents || getCachedPokedataEvents)(search);
  let projected: Array<PokedataCalendarEvent & { hideFromCalendar?: boolean }> = events;
  try {
    const compatibleOverrides = await (dependencies.loadOverrides || (async () => {
      const overrides = await prisma.externalEventOverride.findMany();
      return overrides.map((override) => ({
        ...override,
        participationFee: override.participationFee?.toNumber() ?? null,
      }));
    }))();
    projected = applyExternalEventOverridesToFeed(events, compatibleOverrides, { includeHidden: true }) as typeof projected;
  } catch {
    // Preserve public feed availability during a local override database outage.
    console.error("Failed to apply external event overrides");
  }
  return includeHidden ? projected : projected.filter((event) => event.hideFromCalendar !== true);
}
