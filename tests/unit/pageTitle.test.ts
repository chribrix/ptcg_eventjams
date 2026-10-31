import { describe, expect, it } from "vitest";
import { pageTitleForPath } from "~/utils/pageTitle";

describe("page titles", () => {
  it("uses a relevant fallback for public routes and locale prefixes", () => {
    expect(pageTitleForPath("/de/tournaments/event-1")).toBe("Turnieransicht – ChrispyJams");
    expect(pageTitleForPath("/tournaments/event-1/qr")).toBe("Turnier QR-Display – ChrispyJams");
    expect(pageTitleForPath("/events/register/event-1")).toBe("Event-Anmeldung – ChrispyJams");
  });

  it("reserves admin titles for the page layout", () => {
    expect(pageTitleForPath("/admin/tournament-management")).toBe("Administration – ChrispyJams");
  });
});
