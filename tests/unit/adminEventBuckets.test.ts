// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  isCompletedAdminEvent,
  isUpcomingAdminEvent,
} from "../../utils/adminEventBuckets";

describe("adminEventBuckets", () => {
  const now = new Date("2026-05-01T12:00:00.000Z");

  it("keeps an event on a previous day out of upcoming even if its status is still upcoming", () => {
    const event = {
      eventDate: "2026-04-30T18:00:00.000Z",
      status: "upcoming",
    };

    expect(isUpcomingAdminEvent(event, now)).toBe(false);
    expect(isCompletedAdminEvent(event, now)).toBe(true);
  });

  it("does not mark an event as completed on the same calendar day after its start time", () => {
    const lateNow = new Date("2026-05-01T20:00:00.000Z");
    const event = {
      eventDate: "2026-05-01T10:00:00.000Z",
      status: "upcoming",
    };

    expect(isUpcomingAdminEvent(event, lateNow)).toBe(true);
    expect(isCompletedAdminEvent(event, lateNow)).toBe(false);
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
