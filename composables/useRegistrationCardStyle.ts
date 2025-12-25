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
        return "bg-[#2f3136] border-[#202225] border-l-4 border-l-orange-500 hover:border-l-orange-400 hover:shadow-lg";
      case "riftbound":
        return "bg-[#2f3136] border-[#202225] border-l-4 border-l-purple-500 hover:border-l-purple-400 hover:shadow-lg";
      case "generic":
        return "bg-[#2f3136] border-[#202225] border-l-4 border-l-gray-500 hover:border-l-gray-400 hover:shadow-lg";
      default:
        return "bg-[#2f3136] border-[#202225] border-l-4 border-l-gray-500 hover:border-l-gray-400 hover:shadow-lg";
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
        return "border-orange-500";
      case "riftbound":
        return "border-purple-500";
      case "generic":
        return "border-gray-500";
      default:
        return "border-gray-500";
    }
  };

  /**
   * Get text color class for game type header
   */
  const getGameHeaderTextClass = (tagType?: string): string => {
    const type = tagType || "pokemon";
    switch (type.toLowerCase()) {
      case "pokemon":
        return "text-orange-400";
      case "riftbound":
        return "text-purple-400";
      case "generic":
        return "text-gray-400";
      default:
        return "text-gray-400";
    }
  };

  return {
    getCardBackgroundClass,
    getGameTypeLabel,
    getGameHeaderClass,
    getGameHeaderTextClass,
  };
};
