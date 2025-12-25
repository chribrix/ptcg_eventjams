/**
 * Event Tags Type Definition
 *
 * Provides semantic categorization for events
 * Different tag schemas can be used based on tagType
 */

/**
 * Tag type enum - defines which tag schema to use
 */
export type TagType = "pokemon" | "riftbound" | "generic";

/**
 * Base event tags interface
 */
export interface BaseEventTags {
  /**
   * Game name
   * Examples: "Pokemon", "Riftbound"
   */
  game?: string;

  /**
   * Host/Store name
   * Examples: "GameStop Munich", "TCG Central Berlin"
   */
  host?: string;

  /**
   * Additional custom tags as key-value pairs
   */
  [key: string]: string | undefined;
}

/**
 * Pokemon-specific event tags
 */
export interface PokemonEventTags extends BaseEventTags {
  game: "Pokemon";

  /**
   * Event type/tier
   * Examples: "league_cup", "league_challenge", "local", "regional", "international", "worlds"
   */
  type?:
    | "league_cup"
    | "league_challenge"
    | "local"
    | "regional"
    | "international"
    | "worlds"
    | "custom";

  /**
   * Tournament format
   * Examples: "standard", "expanded", "unlimited", "sealed", "draft"
   */
  format?: "standard" | "expanded" | "unlimited" | "sealed" | "draft";
}

/**
 * Riftbound-specific event tags
 */
export interface RiftboundEventTags extends BaseEventTags {
  game: "Riftbound";

  /**
   * Event type/tier
   */
  type?: string;

  /**
   * Tournament format
   */
  format?: string;
}

/**
 * Generic event tags for other games
 */
export interface GenericEventTags extends BaseEventTags {
  /**
   * Event type/tier
   */
  type?: string;

  /**
   * Tournament format
   */
  format?: string;
}

/**
 * Union type for all event tags
 */
export type EventTags =
  | PokemonEventTags
  | RiftboundEventTags
  | GenericEventTags;

/**
 * Default tags based on tagType
 */
export const DEFAULT_TAGS_BY_TYPE: Record<TagType, EventTags> = {
  pokemon: { game: "Pokemon" },
  riftbound: { game: "Riftbound" },
  generic: {},
};

/**
 * Default tags for pokedata.ovh events (always Pokemon)
 */
export const POKEDATA_DEFAULT_TAGS: PokemonEventTags = {
  game: "Pokemon",
};

/**
 * Predefined game options
 */
export const GAME_OPTIONS = [
  { value: "Pokemon", label: "Pokémon TCG" },
  { value: "Riftbound", label: "Riftbound" },
] as const;

/**
 * Predefined event type options
 */
export const EVENT_TYPE_OPTIONS = [
  { value: "league_cup", label: "League Cup" },
  { value: "league_challenge", label: "League Challenge" },
  { value: "local_tournament", label: "Locals" },
  { value: "store_tournament", label: "Store Tournament" },
  { value: "premier_challenge", label: "Premier Challenge" },
  { value: "midseason_showdown", label: "Midseason Showdown" },
  { value: "regional_championships", label: "Regional Championships" },
  { value: "special_event", label: "Special Event" },
  { value: "custom", label: "Custom Event" },
] as const;

/**
 * Predefined format options
 */
export const FORMAT_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "expanded", label: "Expanded" },
  { value: "unlimited", label: "Unlimited" },
  { value: "sealed", label: "Sealed" },
  { value: "draft", label: "Draft" },
] as const;

/**
 * Parse tags from JSONB to typed interface based on tagType
 */
export function parseEventTags(
  tags: any,
  tagType: TagType = "pokemon"
): EventTags {
  if (!tags) return DEFAULT_TAGS_BY_TYPE[tagType];
  if (typeof tags === "string") {
    try {
      return JSON.parse(tags);
    } catch {
      return DEFAULT_TAGS_BY_TYPE[tagType];
    }
  }
  return tags as EventTags;
}

/**
 * Serialize tags for database storage
 */
export function serializeEventTags(tags: EventTags): string {
  return JSON.stringify(tags);
}

/**
 * Get default tags for a specific tag type
 */
export function getDefaultTags(tagType: TagType): EventTags {
  return { ...DEFAULT_TAGS_BY_TYPE[tagType] };
}

/**
 * Get display label for event type
 */
export function getEventTypeLabel(type?: string): string {
  const option = EVENT_TYPE_OPTIONS.find((opt) => opt.value === type);
  return option?.label || type || "Event";
}

/**
 * Get display label for game
 */
export function getGameLabel(game?: string): string {
  const option = GAME_OPTIONS.find((opt) => opt.value === game);
  return option?.label || game || "Unknown Game";
}

/**
 * Get display label for format
 */
export function getFormatLabel(format?: string): string {
  const option = FORMAT_OPTIONS.find((opt) => opt.value === format);
  return option?.label || format || "";
}

/**
 * Check if event is a Pokemon event
 */
export function isPokemonEvent(tags: EventTags): boolean {
  return tags.game === "Pokemon";
}

/**
 * Check if event is from pokedata.ovh (must have Pokemon game tag)
 */
export function isPokedataEvent(tags: EventTags): boolean {
  return isPokemonEvent(tags);
}

/**
 * Get badge color class for event type
 */
export function getEventTypeBadgeClass(type?: string): string {
  switch (type) {
    case "league_cup":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "league_challenge":
      return "bg-green-100 text-green-800 border-green-200";
    case "regional":
    case "international":
    case "worlds":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "local":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-amber-100 text-amber-800 border-amber-200";
  }
}

/**
 * Get badge color class for game
 */
export function getGameBadgeClass(game?: string): string {
  switch (game) {
    case "Pokemon":
      return "bg-red-100 text-red-800 border-red-200";
    case "Riftbound":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}
