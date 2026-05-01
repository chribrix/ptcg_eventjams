import { describe, expect, it } from "vitest";
import {
  getEventDisplayBadgeClass,
  getEventDisplayBadgeStyles,
  getEventDisplayDateBadgeClass,
  getEventDisplayKey,
  getEventDisplayLabel,
} from "~/utils/eventDisplay";

describe("eventDisplay", () => {
  it("prefers a custom event's semantic prerelease type over the custom fallback", () => {
    const input = {
      isCustomEvent: true,
      tagType: "pokemon",
      tags: {
        game: "Pokemon",
        type: "prerelease",
      },
    };

    expect(getEventDisplayKey(input)).toBe("pre_release");
    expect(getEventDisplayLabel(input)).toBe("Pre-Release");
    expect(getEventDisplayBadgeClass(input)).toContain("amber");
    expect(getEventDisplayDateBadgeClass(input)).toContain("amber");
    expect(getEventDisplayBadgeStyles(input)).toEqual({
      backgroundColor: "#fef3c7",
      color: "#92400e",
    });
  });

  it("keeps custom as the fallback when no better event type exists", () => {
    const input = {
      isCustomEvent: true,
      tagType: "generic",
      tags: {},
    };

    expect(getEventDisplayKey(input)).toBe("custom");
    expect(getEventDisplayLabel(input)).toBe("Local Event");
  });
});
