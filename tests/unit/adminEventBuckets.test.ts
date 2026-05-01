// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  isCompletedAdminEvent,
  isUpcomingAdminEvent,
} from "../../utils/adminEventBuckets";

describe("adminEventBuckets", () => {
  const now = new Date("2026-05-01T12:00:00.000Z");

  it("keeps a past event out of upcoming even if its status is still upcoming", () => {
    const event = {
      eventDate: "2026-04-30T18:00:00.000Z",
      status: "upcoming",
    };

    expect(isUpcomingAdminEvent(event, now)).toBe(false);
    expect(isCompletedAdminEvent(event, now)).toBe(true);
  });

  it("keeps future upcoming events in the upcoming bucket", () => {
    const event = {
      eventDate: "2026-05-02T18:00:00.000Z",
      status: "upcoming",
    };

    expect(isUpcomingAdminEvent(event, now)).toBe(true);
    expect(isCompletedAdminEvent(event, now)).toBe(false);
  });

  it("always treats explicitly completed events as completed", () => {
    const event = {
      eventDate: "2026-05-02T18:00:00.000Z",
      status: "completed",
    };

    expect(isUpcomingAdminEvent(event, now)).toBe(false);
    expect(isCompletedAdminEvent(event, now)).toBe(true);
  });

  it("normalizes mixed-case statuses", () => {
    const event = {
      eventDate: "2026-05-02T18:00:00.000Z",
      status: "Completed",
    };

    expect(isUpcomingAdminEvent(event, now)).toBe(false);
    expect(isCompletedAdminEvent(event, now)).toBe(true);
  });
});