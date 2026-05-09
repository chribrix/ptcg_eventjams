import { describe, expect, it } from "vitest";
import { getBookingPermissions } from "../../utils/bookingPermissions";

describe("getBookingPermissions", () => {
  const now = new Date("2026-05-09T10:00:00.000Z");

  it("allows all booking changes more than 2 hours before the event", () => {
    const permissions = getBookingPermissions(
      "2026-05-09T13:00:00.000Z",
      now,
    );

    expect(permissions).toEqual({
      canModify: true,
      canAddTickets: true,
      canCancelTickets: true,
      canEditDecklist: true,
    });
  });

  it("keeps decklists editable inside the 2 hour booking modification window", () => {
    const permissions = getBookingPermissions(
      "2026-05-09T11:00:00.000Z",
      now,
    );

    expect(permissions.canModify).toBe(false);
    expect(permissions.canAddTickets).toBe(false);
    expect(permissions.canCancelTickets).toBe(false);
    expect(permissions.canEditDecklist).toBe(true);
  });

  it("disallows decklist edits once the event has started", () => {
    const permissions = getBookingPermissions(
      "2026-05-09T10:00:00.000Z",
      now,
    );

    expect(permissions.canModify).toBe(false);
    expect(permissions.canEditDecklist).toBe(false);
  });
});
