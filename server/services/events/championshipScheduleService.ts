import { getCachedExternalEventFeed } from "./externalEventFeedCache";
import type { MajorCalendarEvent, MajorEventKind } from "~/utils/majorCalendarEvents";

export const CHAMPIONSHIP_SCHEDULE_URL = "https://championships.pokemon.com/api/events.json?locale=en-us";
const CHAMPIONSHIP_ORIGIN = "https://championships.pokemon.com";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type OfficialChampionship = {
  eventName_s?: unknown;
  displayDateRange_s?: unknown;
  uRL_s?: unknown;
  type_s?: unknown;
  region_s?: unknown;
  year_s?: unknown;
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function dateKey(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
    ? date.toISOString().slice(0, 10) : null;
}

/** The official JSON uses season year; September–December belong to the previous calendar year. */
export function parseChampionshipDateRange(value: string, seasonYear: number): { startDate: string; endDate: string } | null {
  const match = value.trim().replace(/[–—]/g, "-").match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})\s*-\s*(?:([A-Za-z]{3,9})\.?\s+)?(\d{1,2})$/);
  if (!match || !Number.isInteger(seasonYear) || seasonYear < 2020 || seasonYear > 2100) return null;
  const firstMonth = MONTHS[match[1].slice(0, 3).toLowerCase()];
  const lastMonth = match[3] ? MONTHS[match[3].slice(0, 3).toLowerCase()] : firstMonth;
  if (!firstMonth || !lastMonth) return null;
  const firstYear = firstMonth >= 9 ? seasonYear - 1 : seasonYear;
  const lastYear = lastMonth >= 9 ? seasonYear - 1 : seasonYear;
  const startDate = dateKey(firstYear, firstMonth, Number(match[2]));
  const endDate = dateKey(lastYear, lastMonth, Number(match[4]));
  return startDate && endDate && startDate <= endDate ? { startDate, endDate } : null;
}

function kindOf(item: OfficialChampionship): MajorEventKind | null {
  const title = item.eventName_s;
  if (typeof title !== "string") return null;
  if (/World Championships?/i.test(title)) return "worlds";
  if (/International Championships?/i.test(title)) return "international";
  if (/Special Championships?/i.test(title)) return "special";
  if (item.type_s === "regional" && /Regional Championships?/i.test(title)) return "regional";
  return null;
}

export function parseOfficialChampionships(payload: unknown): MajorCalendarEvent[] {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { items?: unknown }).items)) {
    throw new Error("Official championship schedule has no items");
  }
  const items = (payload as { items: OfficialChampionship[] }).items;
  const events: MajorCalendarEvent[] = [];
  for (const item of items) {
    const kind = kindOf(item);
    if (!kind || ((kind === "regional" || kind === "special") && item.region_s !== "europe")) continue;
    if (typeof item.displayDateRange_s !== "string" || typeof item.year_s !== "string" ||
        typeof item.uRL_s !== "string" || typeof item.eventName_s !== "string") continue;
    const range = parseChampionshipDateRange(item.displayDateRange_s, Number(item.year_s));
    if (!range) continue;
    let link: URL;
    try { link = new URL(item.uRL_s, CHAMPIONSHIP_ORIGIN); } catch { continue; }
    if (link.origin !== CHAMPIONSHIP_ORIGIN || !link.pathname.startsWith("/en-us/events/")) continue;
    events.push({
      id: `official-championship-${link.pathname.replace(/^\/|\/$/g, "").replace(/[^a-z0-9]+/gi, "-")}`,
      title: item.eventName_s,
      kind,
      ...range,
      link: link.toString(),
    });
  }
  if (events.length === 0) throw new Error("Official championship schedule has no relevant events");
  return events;
}

export async function fetchOfficialChampionships(fetcher: typeof fetch = fetch): Promise<MajorCalendarEvent[]> {
  const response = await fetcher(CHAMPIONSHIP_SCHEDULE_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Official championship schedule returned ${response.status}`);
  return parseOfficialChampionships(await response.json());
}

/** One server-side schedule for every visitor and location preference. */
export function getCachedChampionships(dependencies: {
  fetchEvents?: typeof fetchOfficialChampionships;
  storage?: { getItem: (key: string) => Promise<unknown>; setItem: (key: string, value: unknown) => Promise<unknown> };
  now?: () => number;
  force?: boolean;
} = {}): Promise<MajorCalendarEvent[]> {
  return getCachedExternalEventFeed("championships:official:v1", () => (dependencies.fetchEvents || fetchOfficialChampionships)(), {
    ...dependencies,
    policy: { freshMs: WEEK_MS, staleMs: 4 * WEEK_MS, retryMs: 24 * 60 * 60 * 1000 },
  });
}
