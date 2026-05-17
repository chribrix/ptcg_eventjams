/**
 * Centralized styling logic for registration cards
 * Provides consistent appearance across dashboard and landing page
 */

export const useRegistrationCardStyle = () => {
  /**
   * Get background class with colored left border based on tagType
   */
  const getCardBackgroundClass = (tagType?: string): string => {
    const type = tagType || "pokemon";
    switch (type.toLowerCase()) {
      case "pokemon":
        return "app-registration-card app-registration-card-game-pokemon";
      case "riftbound":
        return "app-registration-card app-registration-card-game-riftbound";
      case "generic":
        return "app-registration-card app-registration-card-game-generic";
      default:
        return "app-registration-card app-registration-card-game-generic";
    }
  };

  /**
   * Get game type label for header
   */
  const getGameTypeLabel = (tagType: string): string => {
    switch (tagType.toLowerCase()) {
      case "pokemon":
        return "Pokémon TCG";
      case "riftbound":
        return "Riftbound";
      case "generic":
        return "Generic Event";
      default:
        return "Event";
    }
  };

  /**
   * Get border color class for game type header
   */
  const getGameHeaderClass = (tagType?: string): string => {
    const type = tagType || "pokemon";
    switch (type.toLowerCase()) {
      case "pokemon":
        return "app-game-header-pokemon";
      case "riftbound":
        return "app-game-header-riftbound";
      case "generic":
        return "app-game-header-generic";
      default:
        return "app-game-header-generic";
    }
  };

  /**
   * Get text color class for game type header
   */
  const getGameHeaderTextClass = (tagType?: string): string => {
    const type = tagType || "pokemon";
    switch (type.toLowerCase()) {
      case "pokemon":
        return "app-game-header-text-pokemon";
      case "riftbound":
        return "app-game-header-text-riftbound";
      case "generic":
        return "app-game-header-text-generic";
      default:
        return "app-game-header-text-generic";
    }
  };

  return {
    getCardBackgroundClass,
    getGameTypeLabel,
    getGameHeaderClass,
    getGameHeaderTextClass,
  };
};
