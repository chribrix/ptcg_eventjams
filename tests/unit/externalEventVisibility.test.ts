import { describe, expect, it } from "vitest";
import { isDefaultHiddenExternalEvent } from "~/utils/externalEventVisibility";

describe("isDefaultHiddenExternalEvent", () => {
  it("matches Crow's and Owl's in Herrngasse 379 case-insensitively", () => {
    expect(
      isDefaultHiddenExternalEvent({
        venue: "Crow's and Owl's",
        streetAddress: "Herrngasse 379, 94032 Passau",
      }),
    ).toBe(true);

    expect(
      isDefaultHiddenExternalEvent({
        venue: "CROWS AND OWLS",
        streetAddress: "herrngasse 379",
      }),
    ).toBe(true);
  });

  it("does not hide unrelated events", () => {
    expect(
      isDefaultHiddenExternalEvent({
        venue: "Some League",
        streetAddress: "Herrngasse 379",
      }),
    ).toBe(false);
  });
});
