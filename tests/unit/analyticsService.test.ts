import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENT_TYPES, normalizeAnalyticsPath } from "../../server/services/analytics/analyticsService";
import { normalizeAnalyticsRangeDays } from "../../utils/analyticsRange";

describe("analytics path normalization", () => {
  it("removes locale prefixes and query parameters", () => {
    expect(normalizeAnalyticsPath("/en/eventlist?filter=league#october")).toBe("/eventlist");
    expect(normalizeAnalyticsPath("/de/events/abc-123")).toBe("/events/abc-123");
  });

  it("does not track admin or API routes in any locale", () => {
    expect(normalizeAnalyticsPath("/admin/analytics")).toBeNull();
    expect(normalizeAnalyticsPath("/en/admin/events")).toBeNull();
    expect(normalizeAnalyticsPath("/de/api/events")).toBeNull();
  });

  it("rejects malformed paths", () => {
    expect(normalizeAnalyticsPath("https://example.com/eventlist")).toBeNull();
  });
});

describe("analytics date range", () => {
  it("defaults to today and accepts the existing longer ranges", () => {
    expect(normalizeAnalyticsRangeDays(undefined)).toBe(1);
    expect(normalizeAnalyticsRangeDays("1")).toBe(1);
    expect(normalizeAnalyticsRangeDays("7")).toBe(7);
    expect(normalizeAnalyticsRangeDays(30)).toBe(30);
    expect(normalizeAnalyticsRangeDays(90)).toBe(90);
    expect(normalizeAnalyticsRangeDays("365")).toBe(1);
  });
});

describe("analytics interaction contract", () => {
  it("accepts clicks while retaining the existing event types", () => {
    expect(ANALYTICS_EVENT_TYPES).toContain("interaction_click");
    expect(ANALYTICS_EVENT_TYPES).toContain("page_view");
    expect(ANALYTICS_EVENT_TYPES).toContain("registration_completed");
  });

  it("accepts the specifically requested calendar and successful-login signals", () => {
    expect(ANALYTICS_EVENT_TYPES).toContain("home_calendar_click");
    expect(ANALYTICS_EVENT_TYPES).toContain("login_completed");
  });
});
