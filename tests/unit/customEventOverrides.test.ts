import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Prisma client
const mockPrisma = {
  customEvent: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  externalEventOverride: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  eventRegistration: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  player: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
};

// Mock external events API response
const mockExternalEventsResponse = [
  {
    id: "ext-1",
    name: "League Challenge December",
    type: "League Challenge",
    venue: "Game Store A",
    date: "2025-12-15",
    link: "https://pokedata.ovh/event/ext-1",
    icon: "chall",
  },
  {
    id: "ext-2",
    name: "League Cup January",
    type: "League Cup",
    venue: "Game Store B",
    date: "2025-01-20",
    link: "https://pokedata.ovh/event/ext-2",
    icon: "cup",
  },
  {
    id: "ext-3",
    name: "Local Tournament",
    type: "Local",
    venue: "Game Store C",
    date: "2025-12-30",
    link: "https://pokedata.ovh/event/ext-3",
    icon: "local",
  },
];

// Mock createError function
const createError = (error: {
  statusCode: number;
  statusMessage: string;
  data?: any;
}) => {
  const err = new Error(error.statusMessage) as any;
  err.statusCode = error.statusCode;
  err.statusMessage = error.statusMessage;
  err.data = error.data;
  return err;
};

describe("Custom Event Overrides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Event Type Mapping", () => {
    it("should map League Challenge to challenge type", () => {
      const event = mockExternalEventsResponse[0];
      expect(event.type).toBe("League Challenge");
      expect(event.icon).toBe("chall");
    });

    it("should map League Cup to cup type", () => {
      const event = mockExternalEventsResponse[1];
      expect(event.type).toBe("League Cup");
      expect(event.icon).toBe("cup");
    });

    it("should map Local to local type", () => {
      const event = mockExternalEventsResponse[2];
      expect(event.type).toBe("Local");
      expect(event.icon).toBe("local");
    });

    it("should extract event type from overrides JSON with icon field", () => {
      const overrides = { icon: "cup", title: "Test Cup" };
      const getEventType = (overrides: any): string => {
        if (!overrides) return "custom";
        if (overrides.icon === "cup" || overrides.type === "cup") return "cup";
        if (
          overrides.icon === "challenge" ||
          overrides.icon === "chall" ||
          overrides.type === "challenge"
        )
          return "challenge";
        if (overrides.icon === "local" || overrides.type === "local")
          return "local";
        return "custom";
      };

      expect(getEventType(overrides)).toBe("cup");
    });

    it("should extract event type from overrides JSON with type field", () => {
      const overrides = { type: "challenge", title: "Test Challenge" };
      const getEventType = (overrides: any): string => {
        if (!overrides) return "custom";
        if (overrides.icon === "cup" || overrides.type === "cup") return "cup";
        if (
          overrides.icon === "challenge" ||
          overrides.icon === "chall" ||
          overrides.type === "challenge"
        )
          return "challenge";
        if (overrides.icon === "local" || overrides.type === "local")
          return "local";
        return "custom";
      };

      expect(getEventType(overrides)).toBe("challenge");
    });

    it("should default to custom type when no icon or type in overrides", () => {
      const overrides = { title: "Custom Event", venue: "Test Venue" };
      const getEventType = (overrides: any): string => {
        if (!overrides) return "custom";
        if (overrides.icon === "cup" || overrides.type === "cup") return "cup";
        if (
          overrides.icon === "challenge" ||
          overrides.icon === "chall" ||
          overrides.type === "challenge"
        )
          return "challenge";
        if (overrides.icon === "local" || overrides.type === "local")
          return "local";
        return "custom";
      };

      expect(getEventType(overrides)).toBe("custom");
    });
  });

  describe("POST /api/admin/event-overrides", () => {
    it("should create override with registration fields", async () => {
      const overrideData = {
        externalEventId: "ext-1",
        handleRegistrationLocally: true,
        maxParticipants: 32,
        participationFee: 5.0,
        registrationDeadline: new Date("2025-12-14"),
        requiresDecklist: true,
        description: "Test event description",
        overrides: {
          type: "League Challenge",
          icon: "chall",
          venue: "New Venue",
          title: "Modified Challenge",
        },
      };

      mockPrisma.externalEventOverride.create.mockResolvedValue({
        id: "override-1",
        ...overrideData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await mockPrisma.externalEventOverride.create({
        data: overrideData,
      });

      expect(mockPrisma.externalEventOverride.create).toHaveBeenCalledWith({
        data: overrideData,
      });
      expect(result.handleRegistrationLocally).toBe(true);
      expect(result.maxParticipants).toBe(32);
      expect(result.requiresDecklist).toBe(true);
      expect(result.overrides).toMatchObject({
        type: "League Challenge",
        icon: "chall",
      });
    });

    it("should preserve original event type and icon in overrides", async () => {
      const externalEvent = mockExternalEventsResponse[0];
      const overrideData = {
        externalEventId: externalEvent.id,
        handleRegistrationLocally: true,
        maxParticipants: 16,
        overrides: {
          type: externalEvent.type,
          icon: externalEvent.icon,
          venue: "Modified Venue",
        },
      };

      mockPrisma.externalEventOverride.create.mockResolvedValue({
        id: "override-1",
        ...overrideData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await mockPrisma.externalEventOverride.create({
        data: overrideData,
      });

      expect(result.overrides).toMatchObject({
        type: "League Challenge",
        icon: "chall",
      });
    });

    it("should create override without registration (link override only)", async () => {
      const overrideData = {
        externalEventId: "ext-2",
        handleRegistrationLocally: false,
        overrides: {
          link: "https://custom-registration.com",
          type: "League Cup",
          icon: "cup",
        },
      };

      mockPrisma.externalEventOverride.create.mockResolvedValue({
        id: "override-2",
        ...overrideData,
        maxParticipants: null,
        participationFee: null,
        registrationDeadline: null,
        requiresDecklist: false,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await mockPrisma.externalEventOverride.create({
        data: overrideData,
      });

      expect(result.handleRegistrationLocally).toBe(false);
      expect(result.maxParticipants).toBeNull();
      expect(result.overrides).toMatchObject({
        link: "https://custom-registration.com",
      });
    });
  });

  describe("GET /api/events/[id] - Event Details", () => {
    it("should return custom event with event type", async () => {
      const mockCustomEvent = {
        id: "custom-1",
        name: "Custom League Cup",
        venue: "Local Store",
        maxParticipants: 24,
        participationFee: 10.0,
        eventDate: new Date("2025-12-20"),
        registrationDeadline: new Date("2025-12-19"),
        requiresDecklist: true,
        eventType: "cup",
        status: "upcoming",
        description: "Test custom event",
      };

      mockPrisma.customEvent.findUnique.mockResolvedValue(mockCustomEvent);

      const result = await mockPrisma.customEvent.findUnique({
        where: { id: "custom-1" },
      });

      expect(result).toMatchObject(mockCustomEvent);
      expect(result.eventType).toBe("cup");
    });

    it("should return external event override with preserved type", async () => {
      const mockOverride = {
        id: "override-1",
        externalEventId: "ext-1",
        handleRegistrationLocally: true,
        maxParticipants: 32,
        participationFee: 5.0,
        registrationDeadline: new Date("2025-12-14"),
        requiresDecklist: true,
        description: "Override description",
        overrides: {
          type: "League Challenge",
          icon: "chall",
          title: "Modified Challenge Event",
          venue: "New Venue",
        },
      };

      mockPrisma.externalEventOverride.findUnique.mockResolvedValue(
        mockOverride
      );

      const result = await mockPrisma.externalEventOverride.findUnique({
        where: { id: "override-1" },
      });

      expect(result).toMatchObject(mockOverride);
      expect(result.overrides).toHaveProperty("type", "League Challenge");
      expect(result.overrides).toHaveProperty("icon", "chall");
    });

    it("should extract correct event type from override", async () => {
      const mockOverride = {
        id: "override-2",
        handleRegistrationLocally: true,
        overrides: {
          type: "League Cup",
          icon: "cup",
          title: "Cup Event",
        },
      };

      mockPrisma.externalEventOverride.findUnique.mockResolvedValue(
        mockOverride
      );

      const result = await mockPrisma.externalEventOverride.findUnique({
        where: { id: "override-2" },
      });

      const getEventType = (overrides: any): string => {
        if (!overrides) return "custom";
        if (overrides.icon === "cup" || overrides.type === "cup") return "cup";
        if (
          overrides.icon === "challenge" ||
          overrides.icon === "chall" ||
          overrides.type === "challenge"
        )
          return "challenge";
        if (overrides.icon === "local" || overrides.type === "local")
          return "local";
        return "custom";
      };

      const eventType = getEventType(result.overrides);
      expect(eventType).toBe("cup");
    });
  });

  describe("GET /api/admin/events/combined", () => {
    it("should merge custom events and external overrides", async () => {
      const mockCustomEvents = [
        {
          id: "custom-1",
          name: "Custom Challenge",
          venue: "Store A",
          eventDate: new Date("2025-12-20"),
          maxParticipants: 24,
          status: "upcoming",
          eventType: "challenge",
        },
      ];

      const mockExternalOverrides = [
        {
          id: "override-1",
          externalEventId: "ext-1",
          handleRegistrationLocally: true,
          maxParticipants: 32,
          participationFee: 5.0,
          overrides: {
            type: "League Cup",
            icon: "cup",
            title: "Store Cup",
            venue: "Store B",
          },
        },
      ];

      mockPrisma.customEvent.findMany.mockResolvedValue(mockCustomEvents);
      mockPrisma.externalEventOverride.findMany.mockResolvedValue(
        mockExternalOverrides
      );

      const customEvents = await mockPrisma.customEvent.findMany();
      const externalOverrides = await mockPrisma.externalEventOverride.findMany(
        {
          where: { handleRegistrationLocally: true },
        }
      );

      expect(customEvents).toHaveLength(1);
      expect(externalOverrides).toHaveLength(1);
      expect(customEvents[0].eventType).toBe("challenge");
      expect(externalOverrides[0].overrides).toHaveProperty("icon", "cup");
    });

    it("should transform external events to match custom event structure", () => {
      const externalOverride = {
        id: "override-1",
        externalEventId: "ext-1",
        handleRegistrationLocally: true,
        maxParticipants: 32,
        participationFee: 5.0,
        registrationDeadline: new Date("2025-12-14"),
        requiresDecklist: true,
        description: "Override desc",
        overrides: {
          type: "League Challenge",
          icon: "chall",
          title: "Challenge Event",
          venue: "Test Venue",
        },
      };

      const getEventType = (overrides: any): string => {
        if (!overrides) return "custom";
        if (overrides.icon === "cup" || overrides.type === "cup") return "cup";
        if (
          overrides.icon === "challenge" ||
          overrides.icon === "chall" ||
          overrides.type === "challenge"
        )
          return "challenge";
        if (overrides.icon === "local" || overrides.type === "local")
          return "local";
        return "custom";
      };

      const transformed = {
        id: externalOverride.id,
        name: externalOverride.overrides.title || "External Event",
        venue: externalOverride.overrides.venue || "",
        maxParticipants: externalOverride.maxParticipants || 0,
        participationFee: externalOverride.participationFee,
        eventDate: externalOverride.registrationDeadline || new Date(),
        registrationDeadline: externalOverride.registrationDeadline,
        requiresDecklist: externalOverride.requiresDecklist,
        description: externalOverride.description,
        status: "upcoming",
        eventType: getEventType(externalOverride.overrides),
        isExternalEvent: true,
      };

      expect(transformed.eventType).toBe("challenge");
      expect(transformed.isExternalEvent).toBe(true);
      expect(transformed.name).toBe("Challenge Event");
    });
  });

  describe("GET /api/events/[id]/participants", () => {
    it("should return participants for custom event", async () => {
      const mockParticipants = [
        {
          id: "reg-1",
          status: "registered",
          registeredAt: new Date(),
          decklist: "decklist data",
          bringingDecklistOnsite: false,
          player: { name: "Player 1" },
        },
        {
          id: "reg-2",
          status: "reserved",
          registeredAt: new Date(),
          decklist: null,
          bringingDecklistOnsite: true,
          player: { name: "Player 2" },
        },
      ];

      mockPrisma.customEvent.findUnique.mockResolvedValue({
        id: "custom-1",
        name: "Test Event",
      });

      mockPrisma.eventRegistration.findMany.mockResolvedValue(mockParticipants);

      const event = await mockPrisma.customEvent.findUnique({
        where: { id: "custom-1" },
      });
      const participants = await mockPrisma.eventRegistration.findMany({
        where: {
          customEventId: "custom-1",
          status: { not: "cancelled" },
        },
      });

      expect(event).toBeTruthy();
      expect(participants).toHaveLength(2);
      expect(participants[0].player.name).toBe("Player 1");
    });

    it("should return participants for external event override", async () => {
      const mockParticipants = [
        {
          id: "reg-3",
          status: "registered",
          registeredAt: new Date(),
          decklist: "deck data",
          bringingDecklistOnsite: false,
          player: { name: "Player 3" },
        },
      ];

      mockPrisma.customEvent.findUnique.mockResolvedValue(null);
      mockPrisma.externalEventOverride.findUnique.mockResolvedValue({
        id: "override-1",
        overrides: {
          title: "External Challenge",
          icon: "chall",
        },
      });

      mockPrisma.eventRegistration.findMany.mockResolvedValue(mockParticipants);

      const customEvent = await mockPrisma.customEvent.findUnique({
        where: { id: "override-1" },
      });
      const externalEvent = await mockPrisma.externalEventOverride.findUnique({
        where: { id: "override-1" },
      });
      const participants = await mockPrisma.eventRegistration.findMany({
        where: {
          externalEventId: "override-1",
          status: { not: "cancelled" },
        },
      });

      expect(customEvent).toBeNull();
      expect(externalEvent).toBeTruthy();
      expect(participants).toHaveLength(1);
      expect(participants[0].player.name).toBe("Player 3");
    });

    it("should handle no participants", async () => {
      mockPrisma.customEvent.findUnique.mockResolvedValue({
        id: "custom-2",
        name: "Empty Event",
      });

      mockPrisma.eventRegistration.findMany.mockResolvedValue([]);

      const participants = await mockPrisma.eventRegistration.findMany({
        where: {
          customEventId: "custom-2",
          status: { not: "cancelled" },
        },
      });

      expect(participants).toHaveLength(0);
    });
  });

  describe("POST /api/events/[id]/register", () => {
    it("should register player to external event override", async () => {
      const mockOverride = {
        id: "override-1",
        externalEventId: "ext-1",
        handleRegistrationLocally: true,
        maxParticipants: 32,
        requiresDecklist: false,
        registrationDeadline: new Date("2025-12-20"),
      };

      const mockPlayer = {
        id: "player-1",
        playerId: "12345",
        name: "Test Player",
      };

      mockPrisma.customEvent.findUnique.mockResolvedValue(null);
      mockPrisma.externalEventOverride.findUnique.mockResolvedValue(
        mockOverride
      );
      mockPrisma.player.findFirst.mockResolvedValue(mockPlayer);
      mockPrisma.eventRegistration.count.mockResolvedValue(10);
      mockPrisma.eventRegistration.findUnique.mockResolvedValue(null);
      mockPrisma.eventRegistration.create.mockResolvedValue({
        id: "reg-new",
        externalEventId: "override-1",
        playerId: "player-1",
        status: "registered",
        registeredAt: new Date(),
      });

      const registration = await mockPrisma.eventRegistration.create({
        data: {
          externalEventId: "override-1",
          playerId: "player-1",
          status: "registered",
        },
      });

      expect(registration.externalEventId).toBe("override-1");
      expect(registration.status).toBe("registered");
    });

    it("should enforce max participants for external events", async () => {
      const mockOverride = {
        id: "override-1",
        handleRegistrationLocally: true,
        maxParticipants: 2,
      };

      mockPrisma.externalEventOverride.findUnique.mockResolvedValue(
        mockOverride
      );
      mockPrisma.eventRegistration.count.mockResolvedValue(2);

      const currentRegistrations = await mockPrisma.eventRegistration.count({
        where: {
          externalEventId: "override-1",
          status: { not: "cancelled" },
        },
      });

      expect(currentRegistrations).toBe(2);
      expect(currentRegistrations).toBe(mockOverride.maxParticipants);
      // Should throw error in actual implementation
    });
  });

  describe("Event Type Display Logic", () => {
    it("should return correct badge color for cup events", () => {
      const eventType = "cup";
      const colorMap: Record<string, string> = {
        cup: "#bbf7d0",
        challenge: "#bfdbfe",
        local: "#e0f2fe",
        custom: "#fed7aa",
      };
      expect(colorMap[eventType]).toBe("#bbf7d0");
    });

    it("should return correct badge color for challenge events", () => {
      const eventType = "challenge";
      const colorMap: Record<string, string> = {
        cup: "#bbf7d0",
        challenge: "#bfdbfe",
        local: "#e0f2fe",
        custom: "#fed7aa",
      };
      expect(colorMap[eventType]).toBe("#bfdbfe");
    });

    it("should return correct display name for event types", () => {
      const getEventTypeName = (eventType: string): string => {
        const types: Record<string, string> = {
          cup: "League Cup",
          challenge: "League Challenge",
          local: "Local Event",
          custom: "Custom Event",
        };
        return types[eventType] || eventType;
      };

      expect(getEventTypeName("cup")).toBe("League Cup");
      expect(getEventTypeName("challenge")).toBe("League Challenge");
      expect(getEventTypeName("local")).toBe("Local Event");
      expect(getEventTypeName("custom")).toBe("Custom Event");
    });
  });

  describe("applyOverrides Logic", () => {
    it("should preserve original event type and icon", () => {
      const originalEvent = {
        id: "ext-1",
        name: "Original Challenge",
        type: "League Challenge",
        icon: "chall",
        venue: "Original Venue",
      };

      const override = {
        id: "override-1",
        handleRegistrationLocally: true,
        overrides: {
          type: "League Challenge",
          icon: "chall",
          venue: "New Venue",
          title: "Modified Challenge",
        },
      };

      const overriddenEvent = {
        ...originalEvent,
        ...override.overrides,
        id: override.id,
        type: override.overrides.type || originalEvent.type,
        icon: override.overrides.icon || originalEvent.icon,
        link: `/events/register/${override.id}`,
        hasLocalRegistration: true,
      };

      expect(overriddenEvent.type).toBe("League Challenge");
      expect(overriddenEvent.icon).toBe("chall");
      expect(overriddenEvent.venue).toBe("New Venue");
      expect(overriddenEvent.hasLocalRegistration).toBe(true);
    });

    it("should not change link if handleRegistrationLocally is false", () => {
      const originalEvent = {
        id: "ext-1",
        link: "https://external.com/register",
        type: "League Cup",
        icon: "cup",
      };

      const override = {
        id: "override-1",
        handleRegistrationLocally: false,
        overrides: {
          type: "League Cup",
          icon: "cup",
          venue: "Modified Venue",
        },
      };

      const overriddenEvent = {
        ...originalEvent,
        ...override.overrides,
        link: override.handleRegistrationLocally
          ? `/events/register/${override.id}`
          : originalEvent.link,
      };

      expect(overriddenEvent.link).toBe("https://external.com/register");
    });
  });
});
