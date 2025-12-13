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
    // Disable caching for this endpoint
    setResponseHeader(
      event,
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );
    setResponseHeader(event, "Pragma", "no-cache");
    setResponseHeader(event, "Expires", "0");

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
