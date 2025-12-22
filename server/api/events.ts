interface ParsedEvent {
  id: string;
  title: string;
  name?: string; // Event name from API
  dateTime: string;
  time?: string; // Add separate time field
  type: string;
  venue: string;
  location: string;
  country: string;
  link: string;
  cost?: string; // Add cost field
  streetAddress?: string; // Add street address field
}

interface CalendarEvent {
  id: string;
  title: string;
  name?: string; // Event name from API
  dateTime: string;
  time?: string; // Add separate time field
  type: string;
  venue: string;
  location: string;
  country: string;
  link: string;
  cost?: string; // Add cost field
  streetAddress?: string; // Add street address field
  icon: string;
}

interface ExternalAPIEvent {
  when?: string;
  date?: string;
  type?: string;
  shop?: string;
  name?: string;
  city?: string;
  country_code?: string;
  tournament_type?: string;
  tournament_type_id?: string;
  player_count?: number;
  link?: string;
  cost?: string;
  shop_address?: string;
  pokemon_url?: string;
  street_address?: string;
  guid?: string;
}

function convertToCalendarEvents(parsedEvents: ParsedEvent[]): CalendarEvent[] {
  return parsedEvents.map((event) => {
    let icon = "friendly"; // Default: Green for friendly
    const eventType = event.type;

    // Match exact event types from the API data
    if (eventType === "League Cup") {
      icon = "cup"; // Red for League Cup
    } else if (
      eventType === "League Challenge" ||
      eventType === "GO Challenge"
    ) {
      icon = "chall"; // Blue for Challenges
    } else if (eventType === "Pre Release") {
      icon = "pre"; // Yellow for Pre Release
    } else if (eventType === "nonpremier TCG") {
      icon = "friendly"; // Green for nonpremier TCG/friendly events
    } else {
      // Fallback for any other types - check if they contain keywords
      const lowerType = eventType.toLowerCase();
      if (lowerType.includes("cup")) {
        icon = "cup";
      } else if (lowerType.includes("challenge")) {
        icon = "chall";
      } else if (
        lowerType.includes("pre release") ||
        lowerType.includes("prerelease") ||
        lowerType.includes("prereleases")
      ) {
        icon = "pre"; // Yellow for any prerelease variant
      } else {
        icon = "friendly";
      }
    }

    return {
      ...event,
      icon,
    };
  });
}

function createEventResponse(
  calendarEvents: CalendarEvent[],
  totalFound: number
) {
  return {
    success: true,
    totalFound,
    events: calendarEvents,
    message: `Found ${totalFound} events total, returning ${calendarEvents.length} unique calendar events`,
  };
}

function groupEventsByDate(events: ParsedEvent[]): CalendarEvent[] {
  // Convert all events to calendar events first
  const allCalendarEvents = convertToCalendarEvents(events);

  // Sort by date and time to ensure chronological order
  return allCalendarEvents.sort((a, b) => {
    const dateTimeA = new Date(a.dateTime);
    const dateTimeB = new Date(b.dateTime);
    return dateTimeA.getTime() - dateTimeB.getTime();
  });
}

export default defineEventHandler(async (event) => {
  try {
    // Define cache key and TTL (18 hours)
    const CACHE_KEY = "pokedata:events";
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
      return createEventResponse(cached.data, cached.totalFound);
    }

    // Use the same API endpoint that the website uses
    const apiUrl = "https://pokedata.ovh/events/tableapi/";
    const postData = {
      past: "",
      country: "DE", // Germany
      city: "",
      shop: "",
      league: "",
      states: '["Bavaria", "Bayern"]', // Bavaria state
      postcode: "",
      cups: "1",
      challenges: "1",
      vcups: "0",
      vchallenges: "0",
      prereleases: "0",
      premier: "1",
      go: "0",
      gocup: "0",
      mss: "",
      ftcg: "0",
      fvg: "0",
      fgo: "0",
      latitude: "",
      longitude: "",
      radius: "",
      unit: "km",
      width: 1920,
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      body: JSON.stringify(postData),
      headers: {
        Accept: "application/json",
        "Content-type": "application/json; charset=UTF-8",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const apiData = await response.json();

    // Sort events chronologically
    apiData.sort((a: ExternalAPIEvent, b: ExternalAPIEvent) => {
      const dateA = new Date(a.when || a.date || "1970-01-01");
      const dateB = new Date(b.when || b.date || "1970-01-01");
      const today = new Date("2025-08-27");

      const diffA = dateA.getTime() - today.getTime();
      const diffB = dateB.getTime() - today.getTime();

      if (diffA >= 0 && diffB >= 0) {
        return diffA - diffB;
      } else if (diffA >= 0) {
        return -1;
      } else if (diffB >= 0) {
        return 1;
      } else {
        return diffB - diffA;
      }
    });

    // Convert API events directly to our format using structured data
    const events: ParsedEvent[] = apiData.map(
      (event: ExternalAPIEvent, index: number) => {
        // Use the structured data from the API
        const fullDateTime = event.when || `${event.date} 00:00:00`;
        const dateOnly = fullDateTime.split(" ")[0];
        const timeOnly = fullDateTime.split(" ")[1] || "00:00:00";

        // Format time to HH:MM for display
        const displayTime = timeOnly.substring(0, 5); // Get HH:MM from HH:MM:SS

        const type = event.type || "TCG Event";
        const eventName = event.name || ""; // Get the event name from API
        const venue = event.shop || event.name || "Unknown Venue";
        const location = event.city || "";
        const country = event.country_code || "DE";
        const href = event.pokemon_url || "";
        const streetAddress = event.street_address || "";

        // Format cost - add € for numeric values if not already present
        let formattedCost = "";
        if (event.cost && event.cost.trim() !== "") {
          const cost = event.cost.trim();
          // Check if it's a number and doesn't already contain currency symbols
          if (/^\d+$/.test(cost)) {
            formattedCost = `${cost}€`;
          } else {
            formattedCost = cost;
          }
        }

        const id =
          event.guid ||
          `event-${index}-${fullDateTime.replace(/[^a-zA-Z0-9]/g, "-")}`;

        // Use event name as title, fallback to venue/shop name, then type
        const title = eventName || (venue !== "Unknown Venue" ? venue : type);

        return {
          id,
          title,
          name: eventName, // Store the raw event name
          dateTime: dateOnly, // Keep date-only for calendar grouping
          time: displayTime, // Add separate time field for display
          type,
          venue,
          location,
          country,
          link: href,
          cost: formattedCost, // Include formatted cost field
          streetAddress, // Include street address field
        };
      }
    );

    // Group events by date for calendar display
    const calendarEvents = groupEventsByDate(events);

    // Cache the results
    await storage.setItem(CACHE_KEY, {
      data: calendarEvents,
      totalFound: apiData.length,
      timestamp: Date.now(),
    });

    return createEventResponse(calendarEvents, apiData.length);
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
