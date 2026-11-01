import { describe, expect, it } from "vitest";
import { getRollingCalendarDateKey, getRollingCalendarWindow, shiftRollingCalendarWindow } from "../../utils/rollingCalendarWindow";

describe("rolling four-week calendar", () => {
  it("places November 1 below its month heading in the Sunday column", () => {
    const window = getRollingCalendarWindow(new Date(2026, 9, 31));
    expect(window.weeks).toHaveLength(6);
    expect(window.weeks.flatMap((week) => week.days).filter((day) => day?.inRange)).toHaveLength(28);
    expect(window.weeks[0].days[5]?.date.getDate()).toBe(31);
    expect(getRollingCalendarDateKey(window.weeks[0].days[5]!.date)).toBe("2026-10-31");
    expect(window.weeks[0].days[6]).toBeNull();
    expect(window.weeks[1].days.slice(0, 6)).toEqual(Array(6).fill(null));
    expect(window.weeks[1].days[6]?.date.getDate()).toBe(1);
    expect(getRollingCalendarDateKey(window.weeks[1].days[6]!.date)).toBe("2026-11-01");
    expect(window.weeks[1].days[6]?.isMonthStart).toBe(true);
    expect(window.weeks[1].sectionMonth?.getMonth()).toBe(10);
    expect(window.end.toDateString()).toBe(new Date(2026, 10, 27).toDateString());
  });

  it("moves by calendar days over DST and year boundaries", () => {
    const first = new Date(2026, 9, 25);
    expect(shiftRollingCalendarWindow(first, 1).toDateString()).toBe(new Date(2026, 10, 22).toDateString());
    const yearEnd = getRollingCalendarWindow(new Date(2026, 11, 31));
    expect(yearEnd.weeks.flatMap((week) => week.days).filter((day) => day?.inRange)).toHaveLength(28);
    expect(yearEnd.weeks.some((week) => week.sectionMonth?.getFullYear() === 2027)).toBe(true);
  });
});
