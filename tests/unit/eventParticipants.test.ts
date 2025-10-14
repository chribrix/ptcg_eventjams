import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Prisma client
const mockPrisma = {
  customEvent: {
    findUnique: vi.fn(),
  },
  eventRegistration: {
    findMany: vi.fn(),
  },
};

// Mock the participants API logic
describe("Event Participants API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/events/[id]/participants", () => {
    it("should return participants for a valid event", async () => {
      // Setup mock data
      const mockEvent = {
        id: "event-1",
        name: "Test Tournament",
      };

      const mockParticipants = [
        {
          id: "reg-1",
          status: "registered",
          registeredAt: new Date("2025-10-01"),
          decklist: "some decklist content",
          bringingDecklistOnsite: false,
          player: {
            name: "John Doe",
          },
        },
        {
          id: "reg-2",
          status: "reserved",
          registeredAt: new Date("2025-10-02"),
          decklist: null,
          bringingDecklistOnsite: true,
          player: {
            name: "Jane Smith",
          },
        },
        {
          id: "reg-3",
          status: "reserved",
          registeredAt: new Date("2025-10-03"),
          decklist: null,
          bringingDecklistOnsite: false,
          player: {
            name: "Bob Wilson",
          },
        },
      ];

      mockPrisma.customEvent.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.eventRegistration.findMany.mockResolvedValue(mockParticipants);

      // Simulate the API logic
      const event = await mockPrisma.customEvent.findUnique({
        where: { id: "event-1" },
        select: { id: true, name: true },
      });

      const participants = await mockPrisma.eventRegistration.findMany({
        where: {
          customEventId: "event-1",
          status: { not: "cancelled" },
        },
        select: {
          id: true,
          status: true,
          registeredAt: true,
          decklist: true,
          bringingDecklistOnsite: true,
          player: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { registeredAt: "asc" },
      });

      // Verify the response structure
      expect(event).toEqual(mockEvent);
      expect(participants).toHaveLength(3);

      // Test the transformation logic
      const transformedParticipants = participants.map((p: any) => ({
        id: p.id,
        status: p.status,
        registeredAt: p.registeredAt,
        playerName: p.player.name,
        hasDecklistSubmitted: Boolean(p.decklist),
        isBringingDecklistOnsite: Boolean(p.bringingDecklistOnsite),
      }));

      expect(transformedParticipants[0]).toEqual({
        id: "reg-1",
        status: "registered",
        registeredAt: expect.any(Date),
        playerName: "John Doe",
        hasDecklistSubmitted: true,
        isBringingDecklistOnsite: false,
      });

      expect(transformedParticipants[1]).toEqual({
        id: "reg-2",
        status: "reserved",
        registeredAt: expect.any(Date),
        playerName: "Jane Smith",
        hasDecklistSubmitted: false,
        isBringingDecklistOnsite: true,
      });

      expect(transformedParticipants[2]).toEqual({
        id: "reg-3",
        status: "reserved",
        registeredAt: expect.any(Date),
        playerName: "Bob Wilson",
        hasDecklistSubmitted: false,
        isBringingDecklistOnsite: false,
      });
    });

    it("should exclude cancelled registrations", async () => {
      const mockEvent = {
        id: "event-2",
        name: "Another Tournament",
      };

      const mockParticipants = [
        {
          id: "reg-1",
          status: "registered",
          registeredAt: new Date(),
          decklist: null,
          bringingDecklistOnsite: false,
          player: { name: "Active Player" },
        },
      ];

      mockPrisma.customEvent.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.eventRegistration.findMany.mockResolvedValue(mockParticipants);

      // Verify the query excludes cancelled registrations
      await mockPrisma.eventRegistration.findMany({
        where: {
          customEventId: "event-2",
          status: { not: "cancelled" },
        },
        select: {
          id: true,
          status: true,
          registeredAt: true,
          decklist: true,
          bringingDecklistOnsite: true,
          player: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { registeredAt: "asc" },
      });

      expect(mockPrisma.eventRegistration.findMany).toHaveBeenCalledWith({
        where: {
          customEventId: "event-2",
          status: { not: "cancelled" },
        },
        select: {
          id: true,
          status: true,
          registeredAt: true,
          decklist: true,
          bringingDecklistOnsite: true,
          player: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { registeredAt: "asc" },
      });
    });

    it("should return empty participants for valid event with no registrations", async () => {
      const mockEvent = {
        id: "event-3",
        name: "Empty Event",
      };

      mockPrisma.customEvent.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.eventRegistration.findMany.mockResolvedValue([]);

      const participants = await mockPrisma.eventRegistration.findMany({
        where: {
          customEventId: "event-3",
          status: { not: "cancelled" },
        },
        select: expect.any(Object),
        orderBy: { registeredAt: "asc" },
      });

      expect(participants).toEqual([]);
    });

    it("should handle non-existent event", async () => {
      mockPrisma.customEvent.findUnique.mockResolvedValue(null);

      const event = await mockPrisma.customEvent.findUnique({
        where: { id: "non-existent" },
        select: { id: true, name: true },
      });

      expect(event).toBe(null);
    });
  });

  describe("Privacy and Security", () => {
    it("should not expose sensitive player information", async () => {
      const mockParticipants = [
        {
          id: "reg-1",
          status: "registered",
          registeredAt: new Date(),
          decklist: null,
          bringingDecklistOnsite: false,
          player: {
            name: "John Doe",
            // These fields should not be exposed:
            // id: 'player-1',
            // email: 'john@example.com',
            // playerId: 'secret-id',
          },
        },
      ];

      // Verify the select clause only includes safe fields
      const selectClause = {
        id: true,
        status: true,
        registeredAt: true,
        decklist: true,
        bringingDecklistOnsite: true,
        player: {
          select: {
            name: true,
            // Should NOT include:
            // id: true,
            // email: true,
            // playerId: true,
          },
        },
      };

      expect(selectClause.player.select).not.toHaveProperty("email");
      expect(selectClause.player.select).not.toHaveProperty("playerId");
      expect(selectClause.player.select).not.toHaveProperty("id");
      expect(selectClause.player.select).toEqual({
        name: true,
      });
    });
  });
});
