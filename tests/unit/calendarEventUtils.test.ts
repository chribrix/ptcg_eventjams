import { describe, expect, it } from "vitest";
import {
  eventMatchesCategory,
  getCalendarDateKey,
  getCustomCalendarEventType,
  getExternalCalendarEventType,
  isUpcomingCalendarEvent,
  normalizeCustomCalendarEvent,
  normalizeExternalCalendarEvent,
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

  it("normalizes external event date keys consistently for visible calendar days", () => {
    expect(getCalendarDateKey("2026-07-11 00:00:00")).toBe("2026-07-11");
    expect(getCalendarDateKey("2026-07-11T18:00:00.000Z")).toBe("2026-07-11");

    const normalizedEvent = normalizeExternalCalendarEvent(
      {
        id: "ext-1",
        title: "League Cup",
        dateTime: "2026-07-11T18:00:00.000Z",
        type: "League Cup",
        venue: "Test Store",
        location: "Munich",
        country: "DE",
        link: "/events/register/ext-1",
      },
      "Europe/Berlin"
    );

    expect(normalizedEvent.start).toBe("2026-07-11");
  });
});
