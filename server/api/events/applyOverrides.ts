import prisma from "~/lib/prisma";
import { applyExternalEventOverridesToFeed } from "~/server/services/events/eventProjectionService";

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
  events: ParsedEvent[],
  options: { includeHidden?: boolean } = {},
): Promise<ParsedEvent[]> {
  try {
    const overrides = await prisma.externalEventOverride.findMany();
    return applyExternalEventOverridesToFeed(events, overrides, options);
  } catch (error) {
    console.error("Error applying event overrides:", error);
    // On error, return original events without overrides
    return events;
  }
}
