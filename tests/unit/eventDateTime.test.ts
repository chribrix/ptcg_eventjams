import { describe, expect, it } from "vitest";
import {
  formatDateTimeLocalInput,
  getDateKeyInTimeZone,
  parseDateTimeLocalInput,
} from "~/utils/eventDateTime";

describe("eventDateTime utilities", () => {
  it("converts Berlin summer local input to UTC consistently", () => {
    const result = parseDateTimeLocalInput(
      "2026-07-10T16:00",
      "Europe/Berlin",
    );

    expect(result.toISOString()).toBe("2026-07-10T14:00:00.000Z");
  });

  it("converts Berlin winter local input to UTC consistently", () => {
    const result = parseDateTimeLocalInput(
      "2026-01-10T16:00",
      "Europe/Berlin",
    );

    expect(result.toISOString()).toBe("2026-01-10T15:00:00.000Z");
  });

  it("formats stored UTC datetimes back into local datetime-local values", () => {
    expect(
      formatDateTimeLocalInput(
        "2026-07-10T14:00:00.000Z",
        "Europe/Berlin",
      ),
    ).toBe("2026-07-10T16:00");
  });

  it("keeps calendar date keys aligned with the user's timezone", () => {
    expect(
      getDateKeyInTimeZone("2026-07-10T22:30:00.000Z", "Europe/Berlin"),
    ).toBe("2026-07-11");
  });
});
