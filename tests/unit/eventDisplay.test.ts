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
    expect(getEventDisplayBadgeClass(input)).toContain("green");
    expect(getEventDisplayDateBadgeClass(input)).toContain("green");
    expect(getEventDisplayBadgeStyles(input)).toEqual({
      backgroundColor: "#dcfce7",
      color: "#166534",
    });
  });

  it("uses the shared blue, yellow and green tournament palette", () => {
    expect(getEventDisplayBadgeStyles({ type: "League Challenge", icon: "chall" })).toMatchObject({
      backgroundColor: "#dbeafe",
      color: "#1e40af",
    });
    expect(getEventDisplayBadgeStyles({ type: "League Cup", icon: "cup" })).toMatchObject({
      backgroundColor: "#fef3c7",
      color: "#92400e",
    });
    expect(getEventDisplayBadgeStyles({ type: "Pre-Release", icon: "pre" })).toMatchObject({
      backgroundColor: "#dcfce7",
      color: "#166534",
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
