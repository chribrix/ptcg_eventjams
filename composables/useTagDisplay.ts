import { ref, computed } from "vue";
import {
  parseEventTags,
  getEventTypeLabel,
  getGameLabel,
  getFormatLabel,
  getEventTypeBadgeClass,
  getGameBadgeClass,
  type TagType,
} from "~/types/eventTags";

interface TagDisplayConfig {
  pokemon: string[];
  riftbound: string[];
  generic: string[];
}

const defaultConfig: TagDisplayConfig = {
  pokemon: ["type", "format"],
  riftbound: ["type"],
  generic: ["type"],
};

export const useTagDisplay = () => {
  const config = ref<TagDisplayConfig>(defaultConfig);

  // Load config from localStorage
  if (process.client) {
    const savedConfig = localStorage.getItem("tagDisplayConfig");
    if (savedConfig) {
      try {
        config.value = JSON.parse(savedConfig);
      } catch (e) {
        console.error("Failed to load tag config:", e);
      }
    }
  }

  // Get tags to display for an event
  const getDisplayTags = (tags: any, tagType?: string) => {
    // Default to 'pokemon' if tagType is not provided
    const actualTagType = (tagType || "pokemon") as TagType;
    const parsedTags = parseEventTags(tags, actualTagType);
    const enabledFields = config.value[actualTagType] || [];

    const displayTags: Array<{
      label: string;
      value: string;
      badgeClass: string;
    }> = [];

    // Don't show game tag as badge anymore - it's shown via card background

    // Show configured tags
    if (enabledFields.includes("type") && parsedTags.type) {
      displayTags.push({
        label: getEventTypeLabel(parsedTags.type),
        value: parsedTags.type,
        badgeClass: `type-${parsedTags.type}`,
      });
    }

    if (enabledFields.includes("format") && parsedTags.format) {
      displayTags.push({
        label: getFormatLabel(parsedTags.format),
        value: parsedTags.format,
        badgeClass: `format-${parsedTags.format.toLowerCase()}`,
      });
    }

    if (enabledFields.includes("host") && parsedTags.host) {
      displayTags.push({
        label: parsedTags.host,
        value: parsedTags.host,
        badgeClass: "host",
      });
    }

    return displayTags;
  };

  return {
    config,
    getDisplayTags,
  };
};
