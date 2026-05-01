import { describe, expect, it } from "vitest";
import {
  isLandingBannerActive,
  normalizeLandingBannerState,
} from "~/server/services/admin/adminBannerService";

describe("normalizeLandingBannerState", () => {
  it("falls back to a safe default state for invalid persisted values", () => {
    const banner = normalizeLandingBannerState(null);

    expect(banner).toEqual({
      enabled: false,
      severity: "info",
      title: null,
      body: null,
      ctaLabel: null,
      ctaHref: null,
      startsAt: null,
      endsAt: null,
    });
  });

  it("normalizes persisted banner content", () => {
    const banner = normalizeLandingBannerState({
      enabled: true,
      severity: "warning",
      title: " Planned downtime ",
      body: " Service window tonight ",
      ctaLabel: " Learn more ",
      ctaHref: " /status ",
      startsAt: "2026-05-01T18:00:00.000Z",
      endsAt: "2026-05-01T22:00:00.000Z",
    });

    expect(banner).toEqual({
      enabled: true,
      severity: "warning",
      title: "Planned downtime",
      body: "Service window tonight",
      ctaLabel: "Learn more",
      ctaHref: "/status",
      startsAt: "2026-05-01T18:00:00.000Z",
      endsAt: "2026-05-01T22:00:00.000Z",
    });
  });
});

describe("isLandingBannerActive", () => {
  it("returns true for an enabled banner within its publish window", () => {
    const banner = {
      enabled: true,
      severity: "info" as const,
      title: "Notice",
      body: "Body",
      ctaLabel: null,
      ctaHref: null,
      startsAt: "2026-05-01T10:00:00.000Z",
      endsAt: "2026-05-01T12:00:00.000Z",
    };

    expect(
      isLandingBannerActive(banner, new Date("2026-05-01T11:00:00.000Z")),
    ).toBe(true);
  });

  it("returns false when the banner is disabled or outside the publish window", () => {
    const banner = {
      enabled: true,
      severity: "info" as const,
      title: "Notice",
      body: "Body",
      ctaLabel: null,
      ctaHref: null,
      startsAt: "2026-05-01T10:00:00.000Z",
      endsAt: "2026-05-01T12:00:00.000Z",
    };

    expect(
      isLandingBannerActive(banner, new Date("2026-05-01T09:00:00.000Z")),
    ).toBe(false);
    expect(
      isLandingBannerActive(
        { ...banner, enabled: false },
        new Date("2026-05-01T11:00:00.000Z"),
      ),
    ).toBe(false);
  });
});
