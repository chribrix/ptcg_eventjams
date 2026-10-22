import { applyEventOverrides } from "./events/applyOverrides";
import {
  fetchPokedataEvents,
  type PokedataCalendarEvent,
} from "~/server/services/events/pokedataService";

type CalendarEvent = PokedataCalendarEvent & {
  hideFromCalendar?: boolean;
};

function createEventResponse(
  calendarEvents: CalendarEvent[],
  totalFound: number,
) {
  return {
    success: true,
    totalFound,
    events: calendarEvents,
    message: `Found ${totalFound} events total, returning ${calendarEvents.length} unique calendar events`,
  };
}

function filterVisibleEvents(events: CalendarEvent[]) {
  return events.filter((event) => event.hideFromCalendar !== true);
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const includeHidden =
      query.includeHidden === "1" || query.includeHidden === "true";
    // Define cache key and TTL (18 hours)
    const CACHE_KEY = "pokedata-events-v3-tcg-vgc";
    const CACHE_TTL = 18 * 60 * 60 * 1000; // 18 hours in milliseconds

    // Try to get cached data
    const storage = useStorage("cache");
    const cached = await storage.getItem<{
      data: CalendarEvent[];
      totalFound: number;
      timestamp: number;
    }>(CACHE_KEY);

    // Return cached data if valid
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      const responseEvents = includeHidden
        ? cached.data
        : filterVisibleEvents(cached.data);
      return createEventResponse(responseEvents, responseEvents.length);
    }

    const calendarEvents = await fetchPokedataEvents({
      games: ["tcg", "vgc"],
    });
    calendarEvents.sort((first, second) => {
      const firstDateTime = `${first.dateTime}T${first.time || "00:00"}`;
      const secondDateTime = `${second.dateTime}T${second.time || "00:00"}`;
      return firstDateTime.localeCompare(secondDateTime);
    });
    const eventsWithOverrides = await applyEventOverrides(calendarEvents, {
      includeHidden: true,
    });
    const visibleEvents = filterVisibleEvents(eventsWithOverrides);

    // Cache the results
    await storage.setItem(CACHE_KEY, {
      data: eventsWithOverrides,
      totalFound: visibleEvents.length,
      timestamp: Date.now(),
    });

    return createEventResponse(
      includeHidden ? eventsWithOverrides : visibleEvents,
      includeHidden ? eventsWithOverrides.length : visibleEvents.length,
    );
  } catch (error: unknown) {
    console.error("Failed to scrape events:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to scrape events";
    throw createError({
      statusCode: 500,
      statusMessage: errorMessage,
    });
  }
});
