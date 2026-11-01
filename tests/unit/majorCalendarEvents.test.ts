import { describe, expect, it } from "vitest";
import { MAJOR_EVENT_COLORS, getMajorEventDateKeys, indexMajorEventsByDate, majorDaysConnect, primaryMajorEvent, type MajorCalendarEvent } from "~/utils/majorCalendarEvents";
import { getRollingCalendarDateKey, getRollingCalendarWindow } from "~/utils/rollingCalendarWindow";

const major: MajorCalendarEvent = {
  id: "regional-1", title: "Regional Championships", kind: "regional", gameType: "tcg",
  startDate: "2026-10-31", endDate: "2026-11-02", link: "https://pokedata.ovh/standings2/1",
};

describe("major-event calendar projection", () => {
  it("covers each day across a month break without assigning an event tile category", () => {
    expect(getMajorEventDateKeys(major)).toEqual(["2026-10-31", "2026-11-01", "2026-11-02"]);
    const byDate = indexMajorEventsByDate([major]);
    expect(majorDaysConnect(byDate.get("2026-10-31") || [], byDate.get("2026-11-01") || [])).toBe(true);
    expect(majorDaysConnect(byDate.get("2026-11-02") || [], byDate.get("2026-11-03") || [])).toBe(false);
  });

  it("connects only days belonging to the same tournament", () => {
    expect(majorDaysConnect([major], [{ ...major, id: "different" }])).toBe(false);
    expect(getMajorEventDateKeys({ ...major, startDate: "2026-11-03", endDate: "2026-11-02" })).toEqual([]);
  });

  it("retains all EUIC dates in the visible week when the 28-day window starts on its final day", () => {
    const euic: MajorCalendarEvent = { ...major, id: "euic-2027", kind: "international", startDate: "2027-02-19", endDate: "2027-02-21" };
    const window = getRollingCalendarWindow(new Date(2027, 1, 21));
    const firstWeek = window.weeks[0].days.filter((day) => day && [19, 20, 21].includes(day.date.getDate()));
    expect(firstWeek.map((day) => day!.inRange)).toEqual([false, false, true]);
    const indexed = indexMajorEventsByDate([euic]);
    expect(firstWeek.map((day) => indexed.get(getRollingCalendarDateKey(day!.date))?.[0]?.id)).toEqual(["euic-2027", "euic-2027", "euic-2027"]);
  });

  it("uses a distinct border for Regional, International and Worlds", () => {
    expect(new Set([MAJOR_EVENT_COLORS.regional, MAJOR_EVENT_COLORS.international, MAJOR_EVENT_COLORS.worlds]).size).toBe(3);
    expect(primaryMajorEvent([major, { ...major, id: "worlds", kind: "worlds" }])?.kind).toBe("worlds");
  });
});
