import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ParsedEvent {
  id: string;
  title: string;
  dateTime: string;
  time?: string;
  type: string;
  venue: string;
  location: string;
  country: string;
  link: string;
  cost?: string;
  streetAddress?: string;
  icon?: string;
}

/**
 * Apply event overrides to external events from pokedata
 * Matches events by venue name and date, then applies any override values
 */
export async function applyEventOverrides(
  events: ParsedEvent[]
): Promise<ParsedEvent[]> {
  try {
    // Fetch all overrides
    const overrides = await prisma.externalEventOverride.findMany();

    if (overrides.length === 0) {
      return events; // No overrides, return original events
    }

    // Apply overrides to matching events
    const eventsWithOverrides = events.map((event) => {
      // Find matching override by venue name and date
      const override = overrides.find((o) => {
        const eventDate = new Date(event.dateTime).toISOString().split("T")[0];
        const overrideDate = new Date(o.eventDate).toISOString().split("T")[0];

        // Match by venue name (case-insensitive) and date
        const nameMatch =
          event.venue.toLowerCase().trim() === o.eventName.toLowerCase().trim();
        const dateMatch = eventDate === overrideDate;

        // Optional: also match by location if provided
        const locationMatch =
          !o.eventLocation ||
          event.location.toLowerCase().includes(o.eventLocation.toLowerCase());

        return nameMatch && dateMatch && locationMatch;
      });

      if (!override) {
        return event; // No override for this event
      }

      // Apply all overrides from the JSONB field
      const overrideData = override.overrides as any;

      // Preserve original event type and icon unless explicitly overridden
      const originalType = event.type;
      const originalIcon = event.icon;

      const overriddenEvent: any = {
        ...event,
        ...overrideData, // Spread all override fields onto the event
        // Preserve original type/icon if not explicitly set in overrides
        type: overrideData.type || originalType,
        icon: overrideData.icon || originalIcon,
        isOverridden: true, // Add flag to indicate this event has been overridden
      };

      // If this event has local registration enabled, update the ID and link
      if (override.handleRegistrationLocally) {
        overriddenEvent.id = override.id; // Use the override ID for registration
        overriddenEvent.link = `/events/register/${override.id}`; // Point to internal registration
        overriddenEvent.hasLocalRegistration = true; // Flag for UI
      }

      // Pass through the hideFromCalendar flag from the database
      overriddenEvent.hideFromCalendar = override.hideFromCalendar;

      return overriddenEvent;
    });

    // Filter out events that are hidden from calendar
    const visibleEvents = eventsWithOverrides.filter(
      (event: any) => event.hideFromCalendar !== true
    );

    return visibleEvents;
  } catch (error) {
    console.error("Error applying event overrides:", error);
    // On error, return original events without overrides
    return events;
  }
}
