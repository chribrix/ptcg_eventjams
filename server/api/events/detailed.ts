import { defineEventHandler } from "h3";

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

export default defineEventHandler(async (): Promise<ParsedEvent[]> => {
  try {
    // Fetch events from the main events API
    console.log("Fetching events from /api/events...");
    const response = await $fetch<{
      success: boolean;
      events: ParsedEvent[];
      totalFound: number;
    }>("/api/events");

    if (response.success && response.events) {
      console.log(
        `Successfully fetched ${response.events.length} detailed events`
      );
      return response.events;
    } else {
      console.warn("Events API returned no events");
      return [];
    }
  } catch (error) {
    console.error("Error fetching detailed events:", error);
    return [];
  }
});
