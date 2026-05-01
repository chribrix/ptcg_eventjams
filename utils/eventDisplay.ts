import {
  getCustomCalendarEventType,
  getExternalCalendarEventType,
  type CalendarEventType,
  type CustomCalendarEvent,
  type ExternalCalendarEvent,
} from "~/utils/calendarEventUtils";
import { getEventColor } from "~/utils/eventColors";
import { getEventTypeLabel as getTagEventTypeLabel } from "~/types/eventTags";

export type EventDisplayInput = {
  isCustomEvent?: boolean;
  type?: string;
  icon?: string;
  eventType?: string;
  tags?: unknown;
  tagType?: string;
};

export type EventDisplayKey =
  | "league_cup"
  | "league_challenge"
  | "pre_release"
  | "local"
  | "custom"
  | "riftbound";

const EVENT_DISPLAY_META: Record<
  EventDisplayKey,
  {
    label: string;
    badgeClass: string;
    dateBadgeClass: string;
  }
> = {
  league_cup: {
    label: "League Cup",
    badgeClass: "border-green-200 bg-green-50 text-green-800",
    dateBadgeClass: "bg-green-600 text-white",
  },
  league_challenge: {
    label: "League Challenge",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-800",
    dateBadgeClass: "bg-blue-600 text-white",
  },
  pre_release: {
    label: "Pre-Release",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    dateBadgeClass: "bg-amber-500 text-white",
  },
  local: {
    label: "Local Event",
    badgeClass: "border-sky-200 bg-sky-50 text-sky-800",
    dateBadgeClass: "bg-sky-700 text-white",
  },
  custom: {
    label: "Local Event",
    badgeClass: "border-orange-200 bg-orange-50 text-orange-800",
    dateBadgeClass: "bg-orange-600 text-white",
  },
  riftbound: {
    label: "Riftbound",
    badgeClass: "border-purple-200 bg-purple-50 text-purple-800",
    dateBadgeClass: "bg-purple-600 text-white",
  },
};

function prettifyLabel(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[-\s]+/g, "_");

  if (normalized === "prerelease" || normalized === "pre_release") {
    return "Pre-Release";
  }

  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getRawCustomTypeLabel(input: EventDisplayInput): string | null {
  const rawType = String(input.eventType || "").trim();

  if (rawType) {
    const fromTagTypes = getTagEventTypeLabel(rawType);
    return fromTagTypes !== rawType ? fromTagTypes : prettifyLabel(rawType);
  }

  return null;
}

export function resolveEventDisplayType(
  input: EventDisplayInput
): CalendarEventType {
  if (input.isCustomEvent || input.tags || input.eventType || input.tagType) {
    return getCustomCalendarEventType(
      input as Pick<CustomCalendarEvent, "eventType" | "tags" | "tagType">
    );
  }

  return getExternalCalendarEventType(
    input as Pick<ExternalCalendarEvent, "icon" | "type">
  );
}

export function getEventDisplayKey(input: EventDisplayInput): EventDisplayKey {
  const displayType = resolveEventDisplayType(input);

  switch (displayType) {
    case "cup":
      return "league_cup";
    case "challenge":
      return "league_challenge";
    case "prerelease":
      return "pre_release";
    case "riftbound":
      return "riftbound";
    case "custom":
      return "custom";
    default:
      return "local";
  }
}

export function getEventDisplayLabel(input: EventDisplayInput): string {
  const displayType = resolveEventDisplayType(input);
  const rawType = input.type?.trim();

  if (!input.isCustomEvent && rawType) {
    const normalized = rawType.toLowerCase().replace(/[-_]/g, " ");

    if (
      displayType === "local" &&
      (normalized.includes("nonpremier") || normalized.includes("friendly"))
    ) {
      return "Friendly";
    }

    if (displayType === "prerelease") {
      return "Pre-Release";
    }

    return rawType;
  }

  const rawCustomLabel = getRawCustomTypeLabel(input);
  if (rawCustomLabel && displayType !== "custom") {
    return rawCustomLabel;
  }

  return EVENT_DISPLAY_META[getEventDisplayKey(input)].label;
}

export function getEventDisplayBadgeClass(input: EventDisplayInput): string {
  return EVENT_DISPLAY_META[getEventDisplayKey(input)].badgeClass;
}

export function getEventDisplayDateBadgeClass(input: EventDisplayInput): string {
  return EVENT_DISPLAY_META[getEventDisplayKey(input)].dateBadgeClass;
}

export function getEventDisplayBadgeStyles(input: EventDisplayInput): {
  backgroundColor: string;
  color: string;
} {
  const color = getEventColor(resolveEventDisplayType(input));

  return {
    backgroundColor: color.bg,
    color: color.text,
  };
}
