import { parseEventTags, type TagType } from "~/types/eventTags";
import {
  DEFAULT_EVENT_TIME_ZONE,
  getDateKeyInTimeZone,
} from "~/utils/eventDateTime";
import { EVENT_COLORS } from "~/utils/eventColors";

export type CalendarEventType =
  | "cup"
  | "challenge"
  | "local"
  | "custom"
  | "riftbound"
  | "prerelease";

export type CalendarCategory =
  | "cup"
  | "challenge"
  | "custom"
  | "riftbound"
  | "prerelease";

export interface ExternalCalendarEvent {
  id: string | number;
  title: string;
  dateTime: string;
  type?: string;
  icon?: string;
  venue: string;
  location: string;
  country: string;
  link: string;
  time?: string;
  cost?: string;
  streetAddress?: string;
}

export interface CustomCalendarEvent {
  id: string | number;
  name: string;
  eventDate: string;
  venue: string;
  maxParticipants?: number;
  participationFee?: number;
  registrationCount?: number;
  eventType?: string;
  tags?: unknown;
  tagType?: string;
}

export interface UnifiedCalendarEvent {
  id: string;
  title: string;
  name?: string;
  dateTime: string;
  start: string;
  type: CalendarEventType;
  venue: string;
  location: string;
  country: string;
  link: string;
  time?: string;
  cost?: string;
  streetAddress?: string;
  icon?: string;
  isCustomEvent: boolean;
  isLocalRegistration?: boolean;
  eventType?: string;
  tags?: unknown;
  tagType?: string;
}

export interface CalendarCategoryDefinition {
  key: CalendarCategory;
  label: string;
  bg: string;
  text: string;
}

export const CALENDAR_CATEGORY_DEFINITIONS: CalendarCategoryDefinition[] = [
  {
    key: "cup",
    label: EVENT_COLORS.cup.name,
    bg: EVENT_COLORS.cup.bg,
    text: EVENT_COLORS.cup.text,
  },
  {
    key: "challenge",
    label: EVENT_COLORS.challenge.name,
    bg: EVENT_COLORS.challenge.bg,
    text: EVENT_COLORS.challenge.text,
  },
  {
    key: "custom",
    label: EVENT_COLORS.custom.name,
    bg: EVENT_COLORS.custom.bg,
    text: EVENT_COLORS.custom.text,
  },
  {
    key: "prerelease",
    label: EVENT_COLORS.prerelease.name,
    bg: EVENT_COLORS.prerelease.bg,
    text: EVENT_COLORS.prerelease.text,
  },
  {
    key: "riftbound",
    label: EVENT_COLORS.riftbound.name,
    bg: EVENT_COLORS.riftbound.bg,
    text: EVENT_COLORS.riftbound.text,
  },
];

export function extractDateKey(dateTime: string): string {
  return dateTime.includes(" ") ? dateTime.split(" ")[0] : dateTime;
}

export function getCalendarDateKey(
  dateTime: string,
  timeZone: string = DEFAULT_EVENT_TIME_ZONE,
): string {
  const isoLikeDateMatch = dateTime.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoLikeDateMatch) {
    return isoLikeDateMatch[1];
  }

  return getDateKeyInTimeZone(dateTime, timeZone);
}

export function getExternalCalendarEventType(
  event: Pick<ExternalCalendarEvent, "icon" | "type">
): CalendarEventType {
  const normalizedType = event.type?.toLowerCase() || "";
  const normalizedLooseType = normalizedType.replace(/[-_]/g, " ");

  if (event.icon === "cup" || normalizedLooseType.includes("cup")) {
    return "cup";
  }
  if (event.icon === "chall" || normalizedLooseType.includes("challenge")) {
    return "challenge";
  }
  if (
    event.icon === "pre" ||
    normalizedLooseType.includes("pre release") ||
    normalizedType.includes("prerelease")
  ) {
    return "prerelease";
  }
  if (normalizedLooseType.includes("riftbound")) {
    return "riftbound";
  }

  return "local";
}

export function getCustomCalendarEventType(
  event: Pick<CustomCalendarEvent, "eventType" | "tags" | "tagType">
): CalendarEventType {
  if (event.tagType === "riftbound") {
    return "riftbound";
  }

  if (event.tags && event.tagType) {
    const parsedTags = parseEventTags(event.tags, event.tagType as TagType);
    const parsedType = String(parsedTags.type || "").toLowerCase();

    if (parsedTags.game === "Pokemon" && parsedTags.type) {
      if (parsedType === "league_cup") return "cup";
      if (parsedType === "league_challenge") return "challenge";
      if (parsedType === "local" || parsedType === "local_tournament") {
        return "local";
      }
      if (parsedType === "custom") return "custom";
      if (
        parsedType === "prerelease" ||
        parsedType === "pre release" ||
        parsedType === "pre_release"
      ) {
        return "prerelease";
      }
    }
  }

  const normalizedEventType = event.eventType?.toLowerCase() || "";
  const normalizedLooseEventType = normalizedEventType.replace(/[-_]/g, " ");
  if (normalizedEventType === "cup" || normalizedEventType === "league_cup") {
    return "cup";
  }
  if (
    normalizedEventType === "challenge" ||
    normalizedEventType === "league_challenge"
  ) {
    return "challenge";
  }
  if (
    normalizedEventType === "prerelease" ||
    normalizedLooseEventType === "pre release" ||
    normalizedEventType === "pre_release"
  ) {
    return "prerelease";
  }
  if (normalizedEventType === "riftbound") {
    return "riftbound";
  }
  if (
    normalizedEventType === "local" ||
    normalizedEventType === "local_tournament"
  ) {
    return "local";
  }

  return "custom";
}

export function normalizeExternalCalendarEvent(
  event: ExternalCalendarEvent,
  timeZone: string = DEFAULT_EVENT_TIME_ZONE,
): UnifiedCalendarEvent {
  const isLocalRegistration = event.link?.startsWith("/events/register/") || false;
  return {
    id: String(event.id),
    title: event.title,
    dateTime: event.dateTime,
    start: getCalendarDateKey(event.dateTime, timeZone),
    type: getExternalCalendarEventType(event),
    venue: event.venue,
    location: event.location,
    country: event.country,
    link: event.link,
    time: event.time,
    cost: event.cost,
    streetAddress: event.streetAddress,
    icon: event.icon,
    isCustomEvent: false,
    isLocalRegistration,
  };
}

export function normalizeCustomCalendarEvent(
  event: CustomCalendarEvent,
  userTimeZone: string
): UnifiedCalendarEvent {
  return {
    id: String(event.id),
    title: event.name,
    name: event.name,
    dateTime: event.eventDate,
    start: getDateKeyInTimeZone(event.eventDate, userTimeZone),
    type: getCustomCalendarEventType(event),
    venue: event.venue,
    location: "",
    country: "",
    link: "",
    isCustomEvent: true,
    isLocalRegistration: true,
    eventType: event.eventType,
    tags: event.tags,
    tagType: event.tagType,
  };
}

export function sortCalendarEvents<T extends { dateTime: string }>(
  events: T[]
): T[] {
  return [...events].sort((first, second) => {
    const firstLocal =
      ("isLocalRegistration" in first &&
        Boolean((first as any).isLocalRegistration)) ||
      ("isCustomEvent" in first && Boolean((first as any).isCustomEvent));
    const secondLocal =
      ("isLocalRegistration" in second &&
        Boolean((second as any).isLocalRegistration)) ||
      ("isCustomEvent" in second && Boolean((second as any).isCustomEvent));

    if (firstLocal !== secondLocal) {
      return firstLocal ? -1 : 1;
    }

    return new Date(first.dateTime).getTime() - new Date(second.dateTime).getTime();
  });
}

export function isUpcomingCalendarEvent(
  event: Pick<UnifiedCalendarEvent, "start">,
  todayKey: string
): boolean {
  return event.start >= todayKey;
}

export function eventMatchesCategory(
  event: Pick<UnifiedCalendarEvent, "type" | "isCustomEvent">,
  category: CalendarCategory
): boolean {
  if (category === "custom") {
    return (
      event.isCustomEvent &&
      !["cup", "challenge", "prerelease", "riftbound"].includes(event.type)
    );
  }

  return event.type === category;
}

export function getCalendarCategoryTitle(category: CalendarCategory): string {
  const definition = CALENDAR_CATEGORY_DEFINITIONS.find(
    (item) => item.key === category
  );
  return definition?.label || "Events";
}
