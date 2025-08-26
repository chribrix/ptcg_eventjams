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

interface EventStore {
  events: ParsedEvent[];
  lastFetch: Date | null;
  isLoading: boolean;
  error: string | null;
}

const eventStore = ref<EventStore>({
  events: [],
  lastFetch: null,
  isLoading: false,
  error: null,
});

export const useEventStore = () => {
  const clearEvents = () => {
    eventStore.value.events = [];
    eventStore.value.lastFetch = null;
    eventStore.value.error = null;
  };

  const setEvents = (events: ParsedEvent[]) => {
    eventStore.value.events = events;
    eventStore.value.lastFetch = new Date();
    eventStore.value.error = null;
  };

  const setLoading = (loading: boolean) => {
    eventStore.value.isLoading = loading;
  };

  const setError = (error: string) => {
    eventStore.value.error = error;
    eventStore.value.isLoading = false;
  };

  const fetchEvents = async (
    force: boolean = false
  ): Promise<ParsedEvent[]> => {
    // Return cached events if we have them and it's not a force refresh
    if (
      !force &&
      eventStore.value.events.length > 0 &&
      eventStore.value.lastFetch
    ) {
      const cacheAge = Date.now() - eventStore.value.lastFetch.getTime();
      const maxCacheAge = 5 * 60 * 1000; // 5 minutes

      if (cacheAge < maxCacheAge) {
        console.log(
          `Using cached events (${
            eventStore.value.events.length
          } events, cached ${Math.round(cacheAge / 1000)}s ago)`
        );
        return eventStore.value.events;
      }
    }

    setLoading(true);
    setError("");

    try {
      console.log("Fetching fresh events from API...");
      const response = await $fetch<ParsedEvent[]>("/api/events/detailed");

      if (Array.isArray(response)) {
        setEvents(response);
        console.log(
          `Successfully fetched and cached ${response.length} events`
        );
        return response;
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
  };

  const getCalendarEvents = (): CalendarEvent[] => {
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
  };

  const getEventByHref = (href: string): ParsedEvent | undefined => {
    return eventStore.value.events.find(
      (event: ParsedEvent) => event.href === href || event.link === href
    );
  };

  const getEventsInDateRange = (
    startDate: Date,
    endDate: Date
  ): ParsedEvent[] => {
    return eventStore.value.events.filter((event: ParsedEvent) => {
      const eventDate = new Date(event.dateTime || event.date || new Date());
      return eventDate >= startDate && eventDate <= endDate;
    });
  };

  const getEventStats = () => {
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
  };

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
