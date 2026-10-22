import {
  getPokemonGameTypeFromEventType,
  type PokemonGameType,
} from "~/types/eventGame";

export const POKEDATA_API_URL = "https://pokedata.ovh/events/tableapi/";

export interface PokedataFilters {
  games?: PokemonGameType[];
  country?: string;
  states?: string[];
  city?: string;
  shop?: string;
  league?: string;
  postcode?: string;
  latitude?: string;
  longitude?: string;
  radius?: string;
  unit?: "km" | "mi";
  includePast?: boolean;
  includePrereleases?: boolean;
  includePremier?: boolean;
}

export interface PokedataApiEvent {
  when?: string;
  date?: string;
  type?: string;
  shop?: string;
  name?: string;
  city?: string;
  country_code?: string;
  link?: string;
  cost?: string;
  pokemon_url?: string;
  street_address?: string;
  guid?: string;
}

export interface PokedataCalendarEvent {
  id: string;
  title: string;
  name?: string;
  dateTime: string;
  time?: string;
  type: string;
  gameType: PokemonGameType;
  venue: string;
  location: string;
  country: string;
  link: string;
  cost?: string;
  streetAddress?: string;
  icon: string;
}

const enabled = (value: boolean) => (value ? "1" : "0");

export function createPokedataRequest(filters: PokedataFilters = {}) {
  const games = filters.games || ["tcg", "vgc"];
  const includes = (game: PokemonGameType) => games.includes(game);

  return {
    past: filters.includePast ? "1" : "",
    country: filters.country || "DE",
    city: filters.city || "",
    shop: filters.shop || "",
    league: filters.league || "",
    states: JSON.stringify(filters.states || ["Bavaria", "Bayern"]),
    postcode: filters.postcode || "",
    cups: enabled(includes("tcg")),
    challenges: enabled(includes("tcg")),
    vcups: enabled(includes("vgc")),
    vchallenges: enabled(includes("vgc")),
    prereleases: enabled(filters.includePrereleases ?? includes("tcg")),
    premier: enabled(filters.includePremier ?? true),
    go: enabled(includes("go")),
    gocup: enabled(includes("go")),
    mss: "",
    ftcg: "0",
    fvg: "0",
    fgo: "0",
    latitude: filters.latitude || "",
    longitude: filters.longitude || "",
    radius: filters.radius || "",
    unit: filters.unit || "km",
    width: 1920,
  };
}

export function getPokedataGameType(type?: string): PokemonGameType {
  return getPokemonGameTypeFromEventType(type);
}

export function getPokedataEventIcon(type?: string): string {
  const normalizedType = type?.trim().toLowerCase() || "";
  if (normalizedType.includes("cup")) return "cup";
  if (normalizedType.includes("challenge")) return "chall";
  if (
    normalizedType.includes("pre release") ||
    normalizedType.includes("prerelease")
  ) {
    return "pre";
  }
  return "friendly";
}

export function mapPokedataEvent(
  event: PokedataApiEvent,
  index: number,
): PokedataCalendarEvent {
  const fullDateTime = event.when || `${event.date} 00:00:00`;
  const [dateOnly, rawTime = "00:00:00"] = fullDateTime.split(" ");
  const type = event.type || "TCG Event";
  const name = event.name || "";
  const venue = event.shop || event.name || "Unknown Venue";
  const rawCost = event.cost?.trim() || "";
  const cost = /^\d+$/.test(rawCost) ? `${rawCost}€` : rawCost;

  return {
    id:
      event.guid ||
      `event-${index}-${fullDateTime.replace(/[^a-zA-Z0-9]/g, "-")}`,
    title: name || (venue !== "Unknown Venue" ? venue : type),
    name,
    dateTime: dateOnly,
    time: rawTime.substring(0, 5),
    type,
    gameType: getPokedataGameType(type),
    venue,
    location: event.city || "",
    country: event.country_code || "DE",
    link: event.pokemon_url || event.link || "",
    cost,
    streetAddress: event.street_address || "",
    icon: getPokedataEventIcon(type),
  };
}

export async function fetchPokedataEvents(
  filters: PokedataFilters = {},
  fetcher: typeof fetch = fetch,
): Promise<PokedataCalendarEvent[]> {
  const response = await fetcher(POKEDATA_API_URL, {
    method: "POST",
    body: JSON.stringify(createPokedataRequest(filters)),
    headers: {
      Accept: "application/json",
      "Content-type": "application/json; charset=UTF-8",
    },
  });

  if (!response.ok) {
    throw new Error(`Pokedata request failed with status ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Pokedata returned an invalid response");
  }

  return data.map((event, index) =>
    mapPokedataEvent(event as PokedataApiEvent, index),
  );
}