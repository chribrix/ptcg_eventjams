/**
 * Centralized color palette for event types across the application
 * Use these colors consistently in calendar, badges, and all event-related UI
 */

export const EVENT_COLORS = {
  cup: {
    bg: "#bbf7d0", // green-200 - soft green for League Cups
    text: "#166534", // green-800 - dark green text
    name: "League Cup",
  },
  challenge: {
    bg: "#bfdbfe", // blue-200 - soft blue for Challenges
    text: "#1e40af", // blue-800 - dark blue text
    name: "League Challenge",
  },
  local: {
    bg: "#e0f2fe", // sky-100 - soft sky blue for local events
    text: "#0c4a6e", // sky-900 - dark sky blue text
    name: "Local Event",
  },
  custom: {
    bg: "#fed7aa", // orange-200 - soft orange for custom events
    text: "#9a3412", // orange-800 - dark orange text
    name: "Crow's & Owl's Locals",
  },
  prerelease: {
    bg: "#fef3c7", // amber-100 - soft yellow for prereleases
    text: "#92400e", // amber-800 - dark amber text
    name: "Pre Release",
  },
  friendly: {
    bg: "#e0f2fe", // sky-100 - same as local
    text: "#0c4a6e", // sky-900
    name: "Friendly Event",
  },
} as const;

/**
 * Get event color configuration based on event type or icon
 */
export function getEventColor(typeOrIcon: string): typeof EVENT_COLORS.cup {
  const normalized = typeOrIcon.toLowerCase();

  if (normalized === "cup" || normalized.includes("league cup")) {
    return EVENT_COLORS.cup;
  }
  if (normalized === "chall" || normalized.includes("challenge")) {
    return EVENT_COLORS.challenge;
  }
  if (
    normalized === "pre" ||
    normalized.includes("pre release") ||
    normalized.includes("prerelease")
  ) {
    return EVENT_COLORS.prerelease;
  }
  if (normalized === "custom" || normalized.includes("custom event")) {
    return EVENT_COLORS.custom;
  }
  if (normalized === "friendly" || normalized.includes("friendly")) {
    return EVENT_COLORS.friendly;
  }

  // Default to local
  return EVENT_COLORS.local;
}

/**
 * Get CSS classes for event badge based on type
 */
export function getEventBadgeClasses(typeOrIcon: string): string {
  const color = getEventColor(typeOrIcon);
  return `bg-[${color.bg}] text-[${color.text}]`;
}

/**
 * Get inline styles for event badge (more reliable than dynamic classes)
 */
export function getEventBadgeStyles(typeOrIcon: string): {
  backgroundColor: string;
  color: string;
} {
  const color = getEventColor(typeOrIcon);
  return {
    backgroundColor: color.bg,
    color: color.text,
  };
}
