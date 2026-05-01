import { describe, expect, it } from "vitest";
import {
  eventMatchesCategory,
  getCustomCalendarEventType,
  getExternalCalendarEventType,
  isUpcomingCalendarEvent,
  normalizeCustomCalendarEvent,
} from "~/utils/calendarEventUtils";

describe("calendarEventUtils", () => {
  it("classifies external prerelease events via icon", () => {
    expect(
      getExternalCalendarEventType({
        icon: "pre",
        type: "Pre Release",
      })
    ).toBe("prerelease");
  });

  it("classifies custom prerelease events via eventType", () => {
    expect(
      getCustomCalendarEventType({
        eventType: "prerelease",
        tags: null,
        tagType: "pokemon",
      })
    ).toBe("prerelease");
  });

  it("keeps pokemon local custom events inside the custom pill category", () => {
    const normalizedEvent = normalizeCustomCalendarEvent(
      {
        id: "evt-1",
        name: "Weekly Local",
        eventDate: "2026-07-10T18:00:00.000Z",
        venue: "Crow's & Owl's",
        eventType: "local",
        tags: { game: "Pokemon", type: "local" },
        tagType: "pokemon",
      },
      "Europe/Berlin"
    );

    expect(normalizedEvent.type).toBe("local");
    expect(eventMatchesCategory(normalizedEvent, "custom")).toBe(true);
  });

  it("treats ISO date keys on or after today as upcoming", () => {
    expect(isUpcomingCalendarEvent({ start: "2026-05-01" }, "2026-05-01")).toBe(
      true
    );
    expect(isUpcomingCalendarEvent({ start: "2026-04-30" }, "2026-05-01")).toBe(
      false
    );
  });
});
