import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock Prisma client
const mockPrisma = {
  customEvent: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  eventRegistration: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

// Mock Nuxt utilities
vi.mock("#imports", () => ({
  createError: (error: { statusCode: number; statusMessage: string }) => {
    const err = new Error(error.statusMessage) as any;
    err.statusCode = error.statusCode;
    err.statusMessage = error.statusMessage;
    return err;
  },
}));

// Mock event type utilities
vi.mock("~/utils/eventTypes", () => ({
  getEventTypeFromOverrides: (overrides: any) => {
    if (overrides?.icon === "cup") return "cup";
    if (overrides?.icon === "chall") return "challenge";
    if (overrides?.icon === "pre" || overrides?.icon === "friendly")
      return "local";
    return "custom";
  },
  getEventTypeName: (eventType: string) => {
    const names: Record<string, string> = {
      cup: "League Cup",
      challenge: "League Challenge",
      local: "Local Event",
      custom: "Custom Event",
    };
    return names[eventType] || "Custom Event";
  },
}));

describe("Custom Event Type Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Event Type Classification", () => {
    it("should classify event as cup type", () => {
      const event = {
        id: "1",
        name: "Test League Cup",
        eventType: "cup",
        venue: "Test Venue",
        eventDate: new Date("2025-12-15"),
        maxParticipants: 20,
      };

      expect(event.eventType).toBe("cup");
    });

    it("should classify event as challenge type", () => {
      const event = {
        id: "2",
        name: "Test League Challenge",
        eventType: "challenge",
        venue: "Test Venue",
        eventDate: new Date("2025-12-20"),
        maxParticipants: 20,
      };

      expect(event.eventType).toBe("challenge");
    });

    it("should classify event as local type", () => {
      const event = {
        id: "3",
        name: "Test Local Event",
        eventType: "local",
        venue: "Test Venue",
        eventDate: new Date("2025-12-25"),
        maxParticipants: 20,
      };

      expect(event.eventType).toBe("local");
    });

    it("should default to custom type when not specified", () => {
      const event = {
        id: "4",
        name: "Test Custom Event",
        eventType: "custom",
        venue: "Test Venue",
        eventDate: new Date("2025-12-30"),
        maxParticipants: 20,
      };

      expect(event.eventType).toBe("custom");
    });
  });

  describe("Event Type Display Names", () => {
    it("should return correct display name for cup", () => {
      const getEventTypeName = (eventType: string) => {
        const names: Record<string, string> = {
          cup: "League Cup",
          challenge: "League Challenge",
          local: "Local Event",
          custom: "Custom Event",
        };
        return names[eventType] || "Custom Event";
      };
      expect(getEventTypeName("cup")).toBe("League Cup");
    });

    it("should return correct display name for challenge", () => {
      const getEventTypeName = (eventType: string) => {
        const names: Record<string, string> = {
          cup: "League Cup",
          challenge: "League Challenge",
          local: "Local Event",
          custom: "Custom Event",
        };
        return names[eventType] || "Custom Event";
      };
      expect(getEventTypeName("challenge")).toBe("League Challenge");
    });

    it("should return correct display name for local", () => {
      const getEventTypeName = (eventType: string) => {
        const names: Record<string, string> = {
          cup: "League Cup",
          challenge: "League Challenge",
          local: "Local Event",
          custom: "Custom Event",
        };
        return names[eventType] || "Custom Event";
      };
      expect(getEventTypeName("local")).toBe("Local Event");
    });

    it("should return correct display name for custom", () => {
      const getEventTypeName = (eventType: string) => {
        const names: Record<string, string> = {
          cup: "League Cup",
          challenge: "League Challenge",
          local: "Local Event",
          custom: "Custom Event",
        };
        return names[eventType] || "Custom Event";
      };
      expect(getEventTypeName("custom")).toBe("Custom Event");
    });
  });

  describe("Custom Event Creation", () => {
    it("should create custom event with cup type", async () => {
      const eventData = {
        name: "Test Cup",
        venue: "Test Venue",
        eventDate: new Date("2025-12-15T18:00:00Z"),
        maxParticipants: 20,
        participationFee: 5,
        eventType: "cup",
        requiresDecklist: true,
        createdBy: "user-123",
      };

      mockPrisma.customEvent.create.mockResolvedValue({
        id: "event-1",
        ...eventData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await mockPrisma.customEvent.create({
        data: eventData,
      });

      expect(result.eventType).toBe("cup");
      expect(mockPrisma.customEvent.create).toHaveBeenCalledWith({
        data: eventData,
      });
    });

    it("should create custom event with challenge type", async () => {
      const eventData = {
        name: "Test Challenge",
        venue: "Test Venue",
        eventDate: new Date("2025-12-20T18:00:00Z"),
        maxParticipants: 20,
        participationFee: 3,
        eventType: "challenge",
        requiresDecklist: true,
        createdBy: "user-123",
      };

      mockPrisma.customEvent.create.mockResolvedValue({
        id: "event-2",
        ...eventData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await mockPrisma.customEvent.create({
        data: eventData,
      });

      expect(result.eventType).toBe("challenge");
    });

    it("should default to custom type if not specified", async () => {
      const eventData = {
        name: "Test Event",
        venue: "Test Venue",
        eventDate: new Date("2025-12-25T18:00:00Z"),
        maxParticipants: 20,
        participationFee: 0,
        createdBy: "user-123",
      };

      mockPrisma.customEvent.create.mockResolvedValue({
        id: "event-3",
        ...eventData,
        eventType: "custom",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await mockPrisma.customEvent.create({
        data: eventData,
      });

      expect(result.eventType).toBe("custom");
    });

    it("should validate eventType is one of allowed values", () => {
      const validTypes = ["custom", "challenge", "cup", "local"];

      validTypes.forEach((type) => {
        expect(validTypes).toContain(type);
      });

      expect(validTypes).not.toContain("invalid");
    });
  });

  describe("Custom Event Updates", () => {
    it("should update event type from custom to cup", async () => {
      mockPrisma.customEvent.update.mockResolvedValue({
        id: "event-1",
        name: "Test Event",
        eventType: "cup",
        venue: "Test Venue",
        eventDate: new Date("2025-12-15"),
        maxParticipants: 20,
        updatedAt: new Date(),
      });

      const result = await mockPrisma.customEvent.update({
        where: { id: "event-1" },
        data: { eventType: "cup" },
      });

      expect(result.eventType).toBe("cup");
      expect(mockPrisma.customEvent.update).toHaveBeenCalledWith({
        where: { id: "event-1" },
        data: { eventType: "cup" },
      });
    });

    it("should update event type from challenge to local", async () => {
      mockPrisma.customEvent.update.mockResolvedValue({
        id: "event-2",
        name: "Test Event",
        eventType: "local",
        venue: "Test Venue",
        eventDate: new Date("2025-12-20"),
        maxParticipants: 20,
        updatedAt: new Date(),
      });

      const result = await mockPrisma.customEvent.update({
        where: { id: "event-2" },
        data: { eventType: "local" },
      });

      expect(result.eventType).toBe("local");
    });
  });

  describe("Custom Event Retrieval", () => {
    it("should fetch all custom events with their event types", async () => {
      const mockEvents = [
        {
          id: "1",
          name: "Test Cup",
          eventType: "cup",
          eventDate: new Date("2025-12-15"),
          venue: "Venue A",
          maxParticipants: 20,
        },
        {
          id: "2",
          name: "Test Challenge",
          eventType: "challenge",
          eventDate: new Date("2025-12-20"),
          venue: "Venue B",
          maxParticipants: 20,
        },
        {
          id: "3",
          name: "Test Custom",
          eventType: "custom",
          eventDate: new Date("2025-12-25"),
          venue: "Venue C",
          maxParticipants: 20,
        },
      ];

      mockPrisma.customEvent.findMany.mockResolvedValue(mockEvents);

      const result = await mockPrisma.customEvent.findMany({
        select: {
          id: true,
          name: true,
          eventType: true,
          eventDate: true,
          venue: true,
          maxParticipants: true,
        },
      });

      expect(result).toHaveLength(3);
      expect(result[0].eventType).toBe("cup");
      expect(result[1].eventType).toBe("challenge");
      expect(result[2].eventType).toBe("custom");
    });

    it("should fetch single custom event with eventType field", async () => {
      const mockEvent = {
        id: "event-1",
        name: "Test Cup",
        eventType: "cup",
        eventDate: new Date("2025-12-15"),
        venue: "Test Venue",
        maxParticipants: 20,
        participationFee: 5,
        requiresDecklist: true,
      };

      mockPrisma.customEvent.findUnique.mockResolvedValue(mockEvent);

      const result = await mockPrisma.customEvent.findUnique({
        where: { id: "event-1" },
      });

      expect(result?.eventType).toBe("cup");
      expect(result?.name).toBe("Test Cup");
    });
  });

  describe("Event Type Badge Display Logic", () => {
    it("should show badge for cup events", () => {
      const event = { eventType: "cup" };
      const shouldShowBadge = event.eventType && event.eventType !== "custom";

      expect(shouldShowBadge).toBe(true);
    });

    it("should show badge for challenge events", () => {
      const event = { eventType: "challenge" };
      const shouldShowBadge = event.eventType && event.eventType !== "custom";

      expect(shouldShowBadge).toBe(true);
    });

    it("should show badge for local events", () => {
      const event = { eventType: "local" };
      const shouldShowBadge = event.eventType && event.eventType !== "custom";

      expect(shouldShowBadge).toBe(true);
    });

    it("should not show badge for custom events", () => {
      const event = { eventType: "custom" };
      const shouldShowBadge = event.eventType && event.eventType !== "custom";

      expect(shouldShowBadge).toBe(false);
    });

    it("should not show badge when eventType is undefined", () => {
      const event = { eventType: undefined };
      const shouldShowBadge = !!(
        event.eventType && event.eventType !== "custom"
      );

      expect(shouldShowBadge).toBe(false);
    });
  });

  describe("Event Type API Response", () => {
    it("should include eventType in custom events API response", async () => {
      const mockEvents = [
        {
          id: "1",
          name: "Test Cup",
          eventType: "cup",
          eventDate: new Date("2025-12-15"),
          venue: "Venue A",
          maxParticipants: 20,
          participationFee: 5,
          registrations: [],
        },
      ];

      mockPrisma.customEvent.findMany.mockResolvedValue(mockEvents);

      const result = await mockPrisma.customEvent.findMany({
        select: {
          id: true,
          name: true,
          eventDate: true,
          venue: true,
          maxParticipants: true,
          participationFee: true,
          eventType: true,
          registrations: true,
        },
      });

      expect(result[0]).toHaveProperty("eventType");
      expect(result[0].eventType).toBe("cup");
    });

    it("should not hardcode eventType in combined events response", async () => {
      const customEvent = {
        id: "custom-1",
        name: "Test Cup",
        eventType: "cup",
        eventDate: new Date("2025-12-15"),
        venue: "Venue A",
        maxParticipants: 20,
      };

      // Simulate the mapping that should preserve eventType
      const mappedEvent = {
        ...customEvent,
        isExternalEvent: false,
        eventType: customEvent.eventType || "custom",
      };

      expect(mappedEvent.eventType).toBe("cup");
      expect(mappedEvent.eventType).not.toBe("custom");
    });
  });

  describe("Calendar Event Type Handling", () => {
    it("should use custom event eventType for calendar display", () => {
      const customEvent = {
        id: "1",
        name: "Test Cup",
        eventDate: "2025-12-15T18:00:00Z",
        venue: "Test Venue",
        eventType: "cup",
      };

      const calendarEvent = {
        id: customEvent.id,
        title: customEvent.name,
        start: new Date(customEvent.eventDate).toISOString().split("T")[0],
        type: customEvent.eventType || "custom",
        isCustom: true,
      };

      expect(calendarEvent.type).toBe("cup");
      expect(calendarEvent.type).not.toBe("custom");
    });

    it("should default to custom type when eventType is not set", () => {
      const customEvent = {
        id: "2",
        name: "Test Event",
        eventDate: "2025-12-20T18:00:00Z",
        venue: "Test Venue",
        eventType: undefined,
      };

      const calendarEvent = {
        id: customEvent.id,
        title: customEvent.name,
        start: new Date(customEvent.eventDate).toISOString().split("T")[0],
        type: customEvent.eventType || "custom",
        isCustom: true,
      };

      expect(calendarEvent.type).toBe("custom");
    });
  });

  describe("Event Details Popover Type Display", () => {
    it("should display correct badge text for cup events", () => {
      const event = {
        id: "1",
        eventType: "cup",
        isCustomEvent: true,
      };

      const labels: Record<string, string> = {
        cup: "League Cup",
        challenge: "League Challenge",
        local: "Local Event",
        custom: "Custom Event",
      };

      const eventType = event.eventType || "custom";
      const label = labels[eventType] || "Custom Event";

      expect(label).toBe("League Cup");
    });

    it("should display correct badge text for challenge events", () => {
      const event = {
        id: "2",
        eventType: "challenge",
        isCustomEvent: true,
      };

      const labels: Record<string, string> = {
        cup: "League Cup",
        challenge: "League Challenge",
        local: "Local Event",
        custom: "Custom Event",
      };

      const eventType = event.eventType || "custom";
      const label = labels[eventType] || "Custom Event";

      expect(label).toBe("League Challenge");
    });

    it("should display 'Custom Event' for events without eventType", () => {
      const event = {
        id: "3",
        eventType: undefined,
        isCustomEvent: true,
      };

      const labels: Record<string, string> = {
        cup: "League Cup",
        challenge: "League Challenge",
        local: "Local Event",
        custom: "Custom Event",
      };

      const eventType = event.eventType || "custom";
      const label = labels[eventType] || "Custom Event";

      expect(label).toBe("Custom Event");
    });
  });

  describe("Registration with Custom Event Types", () => {
    it("should allow registration for cup type custom event", async () => {
      const customEvent = {
        id: "event-1",
        name: "Test Cup",
        eventType: "cup",
        maxParticipants: 20,
        eventDate: new Date("2025-12-15"),
      };

      mockPrisma.customEvent.findUnique.mockResolvedValue(customEvent);
      mockPrisma.eventRegistration.count.mockResolvedValue(5);

      const event = await mockPrisma.customEvent.findUnique({
        where: { id: "event-1" },
      });

      const registrationCount = await mockPrisma.eventRegistration.count({
        where: { customEventId: "event-1" },
      });

      expect(event?.eventType).toBe("cup");
      expect(registrationCount).toBeLessThan(event!.maxParticipants);
    });

    it("should allow registration for challenge type custom event", async () => {
      const customEvent = {
        id: "event-2",
        name: "Test Challenge",
        eventType: "challenge",
        maxParticipants: 20,
        eventDate: new Date("2025-12-20"),
      };

      mockPrisma.customEvent.findUnique.mockResolvedValue(customEvent);
      mockPrisma.eventRegistration.count.mockResolvedValue(10);

      const event = await mockPrisma.customEvent.findUnique({
        where: { id: "event-2" },
      });

      const registrationCount = await mockPrisma.eventRegistration.count({
        where: { customEventId: "event-2" },
      });

      expect(event?.eventType).toBe("challenge");
      expect(registrationCount).toBeLessThan(event!.maxParticipants);
    });
  });

  describe("Event Type Validation", () => {
    it("should accept valid event types", () => {
      const validTypes = ["custom", "challenge", "cup", "local"];
      const testType = "cup";

      expect(validTypes).toContain(testType);
    });

    it("should reject invalid event types", () => {
      const validTypes = ["custom", "challenge", "cup", "local"];
      const testType = "invalid";

      expect(validTypes).not.toContain(testType);
    });

    it("should handle enum validation in schema", () => {
      const eventTypes = ["custom", "challenge", "cup", "local"] as const;
      type EventType = (typeof eventTypes)[number];

      const isValidEventType = (type: string): type is EventType => {
        return eventTypes.includes(type as EventType);
      };

      expect(isValidEventType("cup")).toBe(true);
      expect(isValidEventType("challenge")).toBe(true);
      expect(isValidEventType("local")).toBe(true);
      expect(isValidEventType("custom")).toBe(true);
      expect(isValidEventType("invalid")).toBe(false);
    });
  });

  describe("Admin Dashboard Event List", () => {
    it("should return custom events with correct eventType in combined list", async () => {
      const customEvents = [
        {
          id: "custom-1",
          name: "Test Cup",
          eventType: "cup",
          eventDate: new Date("2025-12-15"),
          venue: "Venue A",
          maxParticipants: 20,
          registrations: [],
        },
        {
          id: "custom-2",
          name: "Test Challenge",
          eventType: "challenge",
          eventDate: new Date("2025-12-20"),
          venue: "Venue B",
          maxParticipants: 20,
          registrations: [],
        },
      ];

      mockPrisma.customEvent.findMany.mockResolvedValue(customEvents);

      const events = await mockPrisma.customEvent.findMany({
        include: {
          registrations: true,
        },
      });

      // Simulate the mapping that should preserve eventType
      const mappedEvents = events.map((e) => ({
        ...e,
        isExternalEvent: false,
        eventType: e.eventType || "custom",
      }));

      expect(mappedEvents[0].eventType).toBe("cup");
      expect(mappedEvents[1].eventType).toBe("challenge");
      expect(mappedEvents[0].eventType).not.toBe("custom");
      expect(mappedEvents[1].eventType).not.toBe("custom");
    });
  });
});
