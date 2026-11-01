export type RollingCalendarWeek = {
  days: ({ date: Date; inRange: boolean; isMonthStart: boolean } | null)[];
  sectionMonth: Date | null;
};

const atMidnight = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addCalendarDays = (date: Date, count: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);

/** A rolling-window Date represents a local calendar day, not an instant in UTC. */
export const getRollingCalendarDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Exactly 28 active dates. A month boundary splits its week so day 1 follows the month heading. */
export function getRollingCalendarWindow(anchor: Date): {
  start: Date;
  end: Date;
  weeks: RollingCalendarWeek[];
} {
  const start = atMidnight(anchor);
  const end = addCalendarDays(start, 27);
  const gridStart = addCalendarDays(start, -((start.getDay() + 6) % 7));
  const gridEnd = addCalendarDays(end, (7 - end.getDay()) % 7);
  const weeks: RollingCalendarWeek[] = [];
  let previousActiveMonth: string | null = null;
  for (let weekStart = gridStart; weekStart <= gridEnd; weekStart = addCalendarDays(weekStart, 7)) {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = addCalendarDays(weekStart, index);
      return { date, inRange: date >= start && date <= end, isMonthStart: date.getDate() === 1 };
    });
    const monthStartIndex = days.findIndex((day) => day.isMonthStart);
    const splitAtMonth = monthStartIndex > 0
      && days.slice(0, monthStartIndex).some((day) => day.inRange)
      && days.slice(monthStartIndex).some((day) => day.inRange);
    const rows = splitAtMonth
      ? [
          days.map((day, index) => index < monthStartIndex ? day : null),
          days.map((day, index) => index >= monthStartIndex ? day : null),
        ]
      : [days];
    for (const row of rows) {
      const firstActive = row.find((day) => day?.inRange)?.date;
      const activeMonth = firstActive ? `${firstActive.getFullYear()}-${firstActive.getMonth()}` : null;
      const sectionMonth = activeMonth && previousActiveMonth && activeMonth !== previousActiveMonth
        ? new Date(firstActive!.getFullYear(), firstActive!.getMonth(), 1)
        : null;
      weeks.push({ days: row, sectionMonth });
      if (activeMonth) previousActiveMonth = activeMonth;
    }
  }
  return { start, end, weeks };
}

export function shiftRollingCalendarWindow(anchor: Date, direction: number): Date {
  return addCalendarDays(atMidnight(anchor), direction * 28);
}
