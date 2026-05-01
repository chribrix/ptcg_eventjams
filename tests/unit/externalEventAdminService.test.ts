import { describe, expect, it } from "vitest";
import { buildExternalEventOverrideData } from "~/server/services/admin/externalEventAdminService";

describe("buildExternalEventOverrideData", () => {
  it("derives createdBy from the authenticated actor instead of caller payload", () => {
    const result = buildExternalEventOverrideData(
      {
        eventName: "League Cup",
        eventDate: "2026-05-01T10:00:00.000Z",
        eventLocation: "Berlin",
        overrides: { venue: "Updated Venue" },
        handleRegistrationLocally: false,
      },
      "server-actor-id",
    );

    expect(result.createdBy).toBe("server-actor-id");
    expect(result.eventName).toBe("League Cup");
  });

  it("clears local-registration-only fields when local registration is disabled", () => {
    const result = buildExternalEventOverrideData(
      {
        eventName: "Challenge",
        eventDate: "2026-05-01T10:00:00.000Z",
        eventLocation: "Hamburg",
        overrides: { venue: "Updated Venue" },
        handleRegistrationLocally: false,
        maxParticipants: 32,
        participationFee: 10,
        registrationDeadline: "2026-04-30T10:00:00.000Z",
        requiresDecklist: true,
        description: "Ignored",
      },
      "server-actor-id",
    );

    expect(result.maxParticipants).toBeNull();
    expect(result.participationFee).toBeNull();
    expect(result.registrationDeadline).toBeNull();
    expect(result.requiresDecklist).toBe(false);
    expect(result.description).toBeNull();
  });
});
