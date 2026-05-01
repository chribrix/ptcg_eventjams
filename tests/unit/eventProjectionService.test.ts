import { describe, expect, it } from "vitest";
import {
  applyExternalEventOverridesToFeed,
  countRegistrationTickets,
  projectAdminCustomEvent,
  projectAdminExternalOverrideEvent,
  projectPublicEventDetailsFromOverride,
} from "~/server/services/events/eventProjectionService";

describe("eventProjectionService", () => {
  it("counts active tickets from either _count projections or ticket arrays", () => {
    expect(
      countRegistrationTickets([
        { _count: { tickets: 2 } },
        { tickets: [{ id: "t1" }, { id: "t2" }, { id: "t3" }] },
      ]),
    ).toBe(5);
  });

  it("applies matching external overrides, rewrites local registration links, and filters hidden events", () => {
    const events = [
      {
        id: "ext-1",
        title: "League Challenge",
        dateTime: "2026-05-10T10:00:00.000Z",
        type: "League Challenge",
        venue: "Store A",
        location: "Berlin, Germany",
        country: "DE",
        link: "https://example.com/ext-1",
        icon: "chall",
      },
      {
        id: "ext-2",
        title: "League Cup",
        dateTime: "2026-05-11T10:00:00.000Z",
        type: "League Cup",
        venue: "Store B",
        location: "Hamburg, Germany",
        country: "DE",
        link: "https://example.com/ext-2",
        icon: "cup",
      },
    ];

    const projected = applyExternalEventOverridesToFeed(events, [
      {
        id: "override-1",
        eventName: "Store A",
        eventDate: "2026-05-10T00:00:00.000Z",
        eventLocation: "Berlin",
        overrides: {
          title: "Berlin Challenge",
          venue: "New Store A",
        },
        handleRegistrationLocally: true,
        hideFromCalendar: false,
      },
      {
        id: "override-2",
        eventName: "Store B",
        eventDate: "2026-05-11T00:00:00.000Z",
        overrides: {
          title: "Hidden Cup",
        },
        hideFromCalendar: true,
      },
    ]);

    expect(projected).toHaveLength(1);
    expect(projected[0]).toMatchObject({
      id: "override-1",
      title: "Berlin Challenge",
      venue: "New Store A",
      link: "/events/register/override-1",
      hasLocalRegistration: true,
      icon: "chall",
    });
  });

  it("projects admin custom events with centralized type and ticket counts", () => {
    const projected = projectAdminCustomEvent({
      tagType: "pokemon",
      tags: {
        game: "Pokemon",
        type: "league_cup",
      },
      registrations: [{ _count: { tickets: 4 } }],
    });

    expect(projected.eventType).toBe("league_cup");
    expect(projected._count.registrations).toBe(4);
    expect(projected.isExternalEvent).toBe(false);
  });

  it("projects external overrides for the admin feed with shared event-type fallback", () => {
    const projected = projectAdminExternalOverrideEvent({
      id: "override-1",
      eventName: "Store A",
      eventDate: "2099-05-10T10:00:00.000Z",
      eventLocation: "Berlin",
      overrides: {
        title: "Berlin Cup",
        venue: "Store A Berlin",
        icon: "cup",
      },
      handleRegistrationLocally: true,
      maxParticipants: 32,
      participationFee: 10,
      requiresDecklist: true,
      registrations: [{ _count: { tickets: 3 } }],
    });

    expect(projected.name).toBe("Berlin Cup");
    expect(projected.venue).toBe("Store A Berlin");
    expect(projected.eventType).toBe("cup");
    expect(projected._count.registrations).toBe(3);
    expect(projected.isExternalEvent).toBe(true);
  });

  it("projects public event details from external overrides with the shared event-type utility", () => {
    const projected = projectPublicEventDetailsFromOverride(
      {
        id: "override-1",
        eventName: "Store A",
        eventDate: "2026-05-10T10:00:00.000Z",
        eventLocation: "Berlin",
        overrides: {
          title: "Berlin Challenge",
          icon: "chall",
        },
        maxParticipants: 24,
        requiresDecklist: false,
      },
      7,
    );

    expect(projected.event).toMatchObject({
      id: "override-1",
      name: "Berlin Challenge",
      venue: "Berlin",
      eventType: "challenge",
      isExternalEvent: true,
    });
    expect(projected.registrationCount).toBe(7);
  });
});
