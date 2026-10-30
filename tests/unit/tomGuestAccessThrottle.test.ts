// @vitest-environment node
import { createError } from "h3";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("createError", createError);
import { assertTomGuestAccessAttemptsAvailable, recordTomGuestAccessFailure } from "~/server/services/events/tomGuestAccessService";

describe("TOM guest access attempt limit", () => {
  it("blocks repeated wrong birth dates for the same event, player and client", () => {
    const event = { context: {}, node: { req: { socket: { remoteAddress: "192.0.2.42" } } } } as any;
    const key = assertTomGuestAccessAttemptsAvailable(event, "rate-limit-event", "7777777");
    for (let index = 0; index < 8; index += 1) recordTomGuestAccessFailure(key);
    expect(() => assertTomGuestAccessAttemptsAvailable(event, "rate-limit-event", "7777777"))
      .toThrow(expect.objectContaining({ statusCode: 429 }));
    expect(() => assertTomGuestAccessAttemptsAvailable(event, "other-event", "7777777")).not.toThrow();
  });
});
