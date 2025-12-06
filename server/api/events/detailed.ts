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
  async (): Promise<{ events: ParsedEvent[] }> => {
    try {
      // Fetch events from the main events API
      console.log("Fetching events from /api/events...");
      const response = await $fetch<{
        success: boolean;
        events: ParsedEvent[];
        totalFound: number;
      }>("/api/events");

      console.log("API /events response:", {
        success: response.success,
        eventsCount: response.events?.length,
        totalFound: response.totalFound,
        firstEvent: response.events?.[0],
      });

      if (response.success && response.events) {
        console.log(
          `Successfully fetched ${response.events.length} detailed events`
        );

        // Apply any admin overrides to the events
        const eventsWithOverrides = await applyEventOverrides(response.events);

        return { events: eventsWithOverrides };
      } else {
        console.warn("Events API returned no events");
        return { events: [] };
      }
    } catch (error) {
      console.error("Error fetching detailed events:", error);
      return { events: [] };
    }
  }
);
