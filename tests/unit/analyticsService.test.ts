import { describe, expect, it } from "vitest";
import { normalizeAnalyticsPath } from "../../server/services/analytics/analyticsService";

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
