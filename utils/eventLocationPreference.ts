export const EVENT_LOCATION_STORAGE_KEY = "event_location_preference_v1";
export const GERMAN_STATES = [
  "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", "Hamburg",
  "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen", "Nordrhein-Westfalen",
  "Rheinland-Pfalz", "Saarland", "Sachsen", "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen",
] as const;
export type PostcodeCountry = "DE" | "AT" | "CH";
export type PostcodeLocation = {
  country: PostcodeCountry;
  postcode: string;
  place: string;
  latitude: number;
  longitude: number;
};

export type EventLocationPreference =
  | { mode: "default" }
  | { mode: "state"; state: string }
  | {
      mode: "nearby";
      source: "postcode" | "device";
      label: string;
      country: PostcodeCountry;
      latitude: number;
      longitude: number;
      radiusKm: number;
    };

export function parseEventLocationPreference(raw: string | null): EventLocationPreference | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const candidate = value as Record<string, unknown>;
    if (candidate.mode === "default") return { mode: "default" };
    if (candidate.mode === "state" && typeof candidate.state === "string" && GERMAN_STATES.some((state) => state === candidate.state)) {
      return { mode: "state", state: candidate.state };
    }
    if (candidate.mode === "nearby" &&
        (candidate.source === "postcode" || candidate.source === "device") &&
        typeof candidate.label === "string" && candidate.label.length <= 80 &&
        (candidate.country === "DE" || candidate.country === "AT" || candidate.country === "CH") &&
        typeof candidate.latitude === "number" && Number.isFinite(candidate.latitude) && Math.abs(candidate.latitude) <= 90 &&
        typeof candidate.longitude === "number" && Number.isFinite(candidate.longitude) && Math.abs(candidate.longitude) <= 180 &&
        typeof candidate.radiusKm === "number" && Number.isInteger(candidate.radiusKm) && candidate.radiusKm >= 20 && candidate.radiusKm <= 200) {
      return candidate as EventLocationPreference;
    }
  } catch {
    return null;
  }
  return null;
}

export function eventLocationQuery(preference: EventLocationPreference | null): Record<string, string> {
  if (preference?.mode === "state") return { state: preference.state };
  if (preference?.mode === "nearby") return {
    country: preference.country,
    latitude: String(preference.latitude),
    longitude: String(preference.longitude),
    radius: String(preference.radiusKm),
  };
  return {};
}

export function eventLocationQueryKey(preference: EventLocationPreference | null): string {
  return new URLSearchParams(eventLocationQuery(preference)).toString();
}
