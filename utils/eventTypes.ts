/**
 * Centralized event type utilities
 * Used across the application to determine event types from overrides
 */

/**
 * Determine event type from external event overrides
 * @param overrides - The overrides JSON object from ExternalEventOverride
 * @returns Event type string: "cup", "challenge", "local", or "custom"
 */
export function getEventTypeFromOverrides(overrides: any): string {
  if (!overrides) return "custom";

  // Check icon field first (primary indicator)
  if (overrides.icon) {
    const iconMap: Record<string, string> = {
      cup: "cup",
      chall: "challenge",
      pre: "local",
      friendly: "local",
    };
    return iconMap[overrides.icon] || "local";
  }

  // Check type field as fallback
  if (overrides.type) {
    return overrides.type;
  }

  // Default to custom for events without clear type
  return "custom";
}

/**
 * Get display name for event type
 * @param eventType - The event type code
 * @returns Human-readable event type name
 */
export function getEventTypeName(eventType: string): string {
  const types: Record<string, string> = {
    cup: "League Cup",
    challenge: "League Challenge",
    local: "Local Event",
    custom: "Custom Event",
  };
  return types[eventType] || eventType;
}
