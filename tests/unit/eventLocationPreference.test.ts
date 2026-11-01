import { describe, expect, it } from "vitest";
import { eventLocationQuery, parseEventLocationPreference } from "~/utils/eventLocationPreference";
import { getRoadDistanceLabel, roadDistanceLabel } from "~/utils/eventDistance";

describe("persistent event location preference", () => {
  it("labels geocoded events for a saved postcode or device position only", () => {
    const origin = { mode: "nearby" as const, source: "postcode" as const, label: "Landshut", country: "DE" as const, latitude: 48.54, longitude: 12.15, radiusKm: 200 };
    const destination = { latitude: 48.54, longitude: 12.15 };
    expect(getRoadDistanceLabel(origin, destination, 12000)).toBe("12 km");
    expect(getRoadDistanceLabel({ ...origin, source: "device" }, { latitude: 48.675, longitude: 12.15 }, 22000)).toBe("22 km");
    expect(getRoadDistanceLabel({ mode: "default" }, destination, 12000)).toBeNull();
    expect(getRoadDistanceLabel({ mode: "state", state: "Bayern" }, destination, 12000)).toBeNull();
    expect(getRoadDistanceLabel(origin, {}, 12000)).toBeNull();
    expect(getRoadDistanceLabel(origin, { latitude: 99, longitude: 12.15 }, 12000)).toBeNull();
  });
  it("formats routed meters without substituting an air-line estimate", () => {
    expect(roadDistanceLabel(100400)).toBe("100 km");
    expect(roadDistanceLabel(500)).toBe("1 km");
    expect(roadDistanceLabel(null)).toBeNull();
  });
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
