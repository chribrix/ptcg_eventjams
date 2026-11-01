import { describe, expect, it } from "vitest";
import { eventLocationQuery, parseEventLocationPreference } from "~/utils/eventLocationPreference";

describe("persistent event location preference", () => {
  it("restores a saved location and converts it to a bounded API query", () => {
    const saved = parseEventLocationPreference(JSON.stringify({
      mode: "nearby", source: "postcode", label: "84028 Landshut", country: "DE",
      latitude: 48.54, longitude: 12.15, radiusKm: 50,
    }));
    expect(eventLocationQuery(saved)).toEqual({
      country: "DE", latitude: "48.54", longitude: "12.15", radius: "50",
    });
    expect(parseEventLocationPreference(JSON.stringify({ mode: "nearby", radiusKm: 500 }))).toBeNull();
    expect(parseEventLocationPreference("bad json")).toBeNull();
    expect(eventLocationQuery({ mode: "default" })).toEqual({});
  });
});
