/**
 * Represents a parsed external event from the pokedata.ovh API
 * Used for displaying Pokemon TCG tournament events in the calendar
 */
interface ParsedEvent {
  id: string;
  title: string;
  dateTime: string;
  type: string;
  venue: string;
  location: string;
  country: string;
  link: string;
  date?: string;
  price?: string;
  href?: string;
}

/**
 * Calendar-formatted event data for use with VCalendar component
 * Transforms ParsedEvent data into a format compatible with calendar libraries
 */
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  extendedProps: {
    location: string;
    price?: string;
    href?: string;
    originalEvent: ParsedEvent;
  };
}

/**
 * Internal state structure for the event store
 * Manages external Pokemon TCG events with caching and error handling
 */
interface EventStore {
  events: ParsedEvent[]; // Cached external events from pokedata.ovh
  lastFetch: Date | null; // Timestamp of last successful fetch for cache invalidation
  isLoading: boolean; // Loading state for UI feedback
  error: string | null; // Error message if fetch fails
}

const eventStore = ref<EventStore>({
  events: [],
  lastFetch: null,
  isLoading: false,
  error: null,
});

/**
 * Composable for managing external Pokemon TCG events from pokedata.ovh
 *
 * Features:
 * - Fetches external tournament events from pokedata.ovh API
 * - Implements 5-minute caching to reduce API calls
 * - Provides loading states and error handling
 * - Transforms data for calendar display compatibility
 * - Offers utility functions for filtering and searching events
 *
 * Usage:
 * ```typescript
 * const { events, isLoading, fetchEvents, getCalendarEvents } = useEventStore()
 *
 * // Fetch events (uses cache if available)
 * await fetchEvents()
 *
 * // Get events formatted for calendar
 * const calendarEvents = getCalendarEvents()
 * ```
 *
 * Note: This composable only handles EXTERNAL events from pokedata.ovh
 * Custom events are managed separately via the database API
 */
export const useEventStore = () => {
  /**
   * Clears all cached events and resets store state
   * Useful for forcing a fresh fetch or handling logout scenarios
   */
  function clearEvents(): void {
    eventStore.value.events = [];
    eventStore.value.lastFetch = null;
    eventStore.value.error = null;
  }

  /**
   * Updates the store with new events and marks cache as fresh
   * @param events - Array of parsed events to cache
   */
  function setEvents(events: ParsedEvent[]): void {
    eventStore.value.events = events;
    eventStore.value.lastFetch = new Date();
    eventStore.value.error = null;
  }

  /**
   * Updates the loading state for UI feedback
   * @param loading - True when fetching data, false when complete
   */
  function setLoading(loading: boolean): void {
    eventStore.value.isLoading = loading;
  }

  /**
   * Sets an error message and stops loading
   * @param error - Error message to display
   */
  function setError(error: string): void {
    eventStore.value.error = error;
    eventStore.value.isLoading = false;
  }

  /**
   * Fetches external Pokemon TCG events from the API with intelligent caching
   *
   * @param force - If true, bypasses cache and fetches fresh data
   * @returns Promise<ParsedEvent[]> - Array of external events
   *
   * Caching behavior:
   * - Cache is valid for 5 minutes
   * - Returns cached data if available and not expired
   * - Automatically fetches fresh data if cache is stale
   */
  async function fetchEvents(force: boolean = false): Promise<ParsedEvent[]> {
    // Return cached events if we have them and it's not a force refresh
    if (
      !force &&
      eventStore.value.events.length > 0 &&
      eventStore.value.lastFetch
    ) {
      const cacheAge = Date.now() - eventStore.value.lastFetch.getTime();
      const maxCacheAge = 5 * 60 * 1000; // 5 minutes

      if (cacheAge < maxCacheAge) {
        return eventStore.value.events;
      }
    }

    setLoading(true);
    setError("");

    try {
      // Add cache busting parameter to force fresh data
      const cacheBuster = force ? `?_t=${Date.now()}` : "";
      const response = await $fetch<{ events: ParsedEvent[] }>(
        `/api/events/detailed${cacheBuster}`,
        {
          // Disable caching for this request
          cache: "no-cache" as RequestCache,
        }
      );


      if (response?.events && Array.isArray(response.events)) {
        setEvents(response.events);

        return response.events;
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch events";
      setError(errorMessage);
      console.error("Error fetching events:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Transforms stored events into calendar-compatible format
   *
   * @returns CalendarEvent[] - Events formatted for VCalendar component
   *
   * Color coding:
   * - Green: Free events
   * - Blue: Paid events with known price
   * - Red: Events with unknown/no price information
   */
  function getCalendarEvents(): CalendarEvent[] {
    return eventStore.value.events.map((event: ParsedEvent) => ({
      id: event.id || event.href || event.link,
      title: event.title || "Event",
      start: new Date(event.dateTime || event.date || new Date()),
      end: new Date(event.dateTime || event.date || new Date()), // Single day events
      color:
        event.price === "Free"
          ? "green"
          : event.price && event.price !== "N/A" && event.price !== "Unknown"
          ? "blue"
          : "red",
      extendedProps: {
        location: event.location || event.venue || "",
        price: event.price,
        href: event.href || event.link,
        originalEvent: event,
      },
    }));
  }

  /**
   * Finds an event by its URL/link
   *
   * @param href - The URL to search for
   * @returns ParsedEvent | undefined - Found event or undefined if not found
   */
  function getEventByHref(href: string): ParsedEvent | undefined {
    return eventStore.value.events.find(
      (event: ParsedEvent) => event.href === href || event.link === href
    );
  }

  /**
   * Filters events within a specific date range
   *
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @returns ParsedEvent[] - Events falling within the specified range
   */
  function getEventsInDateRange(startDate: Date, endDate: Date): ParsedEvent[] {
    return eventStore.value.events.filter((event: ParsedEvent) => {
      const eventDate = new Date(event.dateTime || event.date || new Date());
      return eventDate >= startDate && eventDate <= endDate;
    });
  }

  /**
   * Provides statistical analysis of cached events
   *
   * @returns Object with comprehensive stats or null if no events
   *
   * Includes:
   * - Total event count
   * - Date range coverage
   * - Pricing breakdown (free/paid/unknown)
   * - Cache metadata (last fetch, loading state, errors)
   */
  function getEventStats() {
    const events = eventStore.value.events;
    if (events.length === 0) return null;

    const dates = events.map(
      (e: ParsedEvent) => new Date(e.dateTime || e.date || new Date())
    );
    const minDate = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));

    const freeEvents = events.filter(
      (e: ParsedEvent) => e.price === "Free"
    ).length;
    const paidEvents = events.filter(
      (e: ParsedEvent) =>
        e.price &&
        e.price !== "Free" &&
        e.price !== "N/A" &&
        e.price !== "Unknown"
    ).length;
    const unknownPriceEvents = events.length - freeEvents - paidEvents;

    return {
      totalEvents: events.length,
      dateRange: {
        start: minDate,
        end: maxDate,
        span: Math.ceil(
          (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
        ),
      },
      pricing: {
        free: freeEvents,
        paid: paidEvents,
        unknown: unknownPriceEvents,
      },
      lastFetch: eventStore.value.lastFetch,
      isLoading: eventStore.value.isLoading,
      error: eventStore.value.error,
    };
  }

  return {
    // State
    events: readonly(toRef(eventStore.value, "events")),
    isLoading: readonly(toRef(eventStore.value, "isLoading")),
    error: readonly(toRef(eventStore.value, "error")),
    lastFetch: readonly(toRef(eventStore.value, "lastFetch")),

    // Actions
    fetchEvents,
    clearEvents,
    setEvents,

    // Getters
    getCalendarEvents,
    getEventByHref,
    getEventsInDateRange,
    getEventStats,
  };
};
