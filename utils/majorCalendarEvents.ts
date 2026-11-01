import type { PokemonGameType } from "~/types/eventGame";

export type MajorEventKind = "regional" | "international" | "worlds" | "special";
export const MAJOR_EVENT_COLORS: Record<MajorEventKind, string> = {
  regional: "#a855f7",
  special: "#ec4899",
  international: "#22d3ee",
  worlds: "#fbbf24",
};

const MAJOR_KIND_PRIORITY: MajorEventKind[] = ["worlds", "international", "special", "regional"];
export type MajorCalendarEvent = {
  id: string;
  title: string;
  kind: MajorEventKind;
  gameType?: PokemonGameType;
  startDate: string;
  endDate: string;
  link: string;
  location?: string;
  latitude?: number;
  longitude?: number;
};

const parseDateKey = (key: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const date = new Date(`${key}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Inclusive calendar dates for a major tournament, capped to a safe two-week span. */
export function getMajorEventDateKeys(event: MajorCalendarEvent): string[] {
  const start = parseDateKey(event.startDate);
  const end = parseDateKey(event.endDate);
  if (!start || !end || end < start) return [];
  const keys: string[] = [];
  for (let day = new Date(start); day <= end && keys.length < 14; day.setUTCDate(day.getUTCDate() + 1)) {
    keys.push(day.toISOString().slice(0, 10));
  }
  return keys;
}

export function indexMajorEventsByDate(events: MajorCalendarEvent[]): Map<string, MajorCalendarEvent[]> {
  const map = new Map<string, MajorCalendarEvent[]>();
  for (const event of events) {
    for (const key of getMajorEventDateKeys(event)) {
      const current = map.get(key) || [];
      current.push(event);
      map.set(key, current);
    }
  }
  return map;
}

/** One border color per day; the strongest championship type wins if events overlap. */
export function primaryMajorEvent(events: MajorCalendarEvent[]): MajorCalendarEvent | null {
  return MAJOR_KIND_PRIORITY.map((kind) => events.find((event) => event.kind === kind)).find(Boolean) || null;
}

export function majorDaysConnect(first: MajorCalendarEvent[], second: MajorCalendarEvent[]): boolean {
  return first.some((event) => second.some((neighbor) => neighbor.id === event.id));
}
