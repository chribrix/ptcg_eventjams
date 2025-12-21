import { applyEventOverrides } from "./applyOverrides";

interface ParsedEvent {
  id: string;
  title: string;
  dateTime: string;
  type: string;
  venue: string;
  location: string;
  country: string;
  link: string;
  icon?: string;
  time?: string;
  cost?: string;
  streetAddress?: string;
}

export default defineEventHandler(
  async (event): Promise<{ events: ParsedEvent[] }> => {
    // Define cache key and TTL (5 minutes)
    const CACHE_KEY = "pokedata:detailed-events";
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

    // Try to get cached data
    const storage = useStorage("cache");
    const cached = await storage.getItem<{
      events: ParsedEvent[];
      timestamp: number;
    }>(CACHE_KEY);

    // Return cached data if valid
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(
        `Returning cached detailed events (${
          cached.events.length
        } events, cached ${Math.round(
          (Date.now() - cached.timestamp) / 1000
        )}s ago)`
      );
      // Set cache headers for client-side caching
      setResponseHeader(
        event,
        "Cache-Control",
        `public, max-age=${Math.floor(
          (CACHE_TTL - (Date.now() - cached.timestamp)) / 1000
        )}`
      );
      return { events: cached.events };
    }

    try {
      // Fetch events from the main events API
      const response = await $fetch<{
        success: boolean;
        events: ParsedEvent[];
        totalFound: number;
      }>("/api/events");

      if (response.success && response.events) {
        // Apply any admin overrides to the events (includes filtering hidden events)
        const eventsWithOverrides = await applyEventOverrides(response.events);

        // Cache the results
        await storage.setItem(CACHE_KEY, {
          events: eventsWithOverrides,
          timestamp: Date.now(),
        });
        console.log(
          `Cached ${eventsWithOverrides.length} detailed events for ${
            CACHE_TTL / 1000
          } seconds`
        );

        // Set cache headers for client-side caching
        setResponseHeader(
          event,
          "Cache-Control",
          `public, max-age=${Math.floor(CACHE_TTL / 1000)}`
        );

        return { events: eventsWithOverrides };
      } else {
        return { events: [] };
      }
    } catch (error) {
      console.error("Error fetching detailed events:", error);
      return { events: [] };
    }
  }
);
