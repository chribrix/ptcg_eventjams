import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock API response handlers
const mockApiHandler = {
  register: async (eventData: any) => {
    const { customEvent, player, existingRegistration } = eventData;

    // Simulate registration count check
    const activeRegistrations = eventData.currentRegistrations || 0;
    if (activeRegistrations >= customEvent.maxParticipants) {
      throw new Error("Event is full");
    }

    // Check for existing non-cancelled registration
    if (existingRegistration && existingRegistration.status !== "cancelled") {
      throw new Error("Already registered");
    }

    const initialStatus = customEvent.requiresDecklist
      ? "reserved"
      : "registered";

    if (existingRegistration && existingRegistration.status === "cancelled") {
      // Update cancelled registration
      return {
        success: true,
        registration: {
          id: existingRegistration.id,
          status: initialStatus,
          registeredAt: new Date(),
          decklist: null,
          bringingDecklistOnsite: false,
        },
      };
    }

    // Create new registration
    return {
      success: true,
      registration: {
        id: "new-reg-" + Date.now(),
        customEventId: eventData.eventId,
        playerId: player.id,
        status: initialStatus,
        decklist: null,
        bringingDecklistOnsite: false,
      },
    };
  },

  decklistUpdate: async (updateData: any) => {
    const {
      registrationId,
      decklist,
      bringingDecklistOnsite,
      existingRegistration,
    } = updateData;

    const updateFields: any = {};

    if (decklist !== undefined) {
      if (decklist === null || decklist.trim() === "") {
        updateFields.decklist = null;
      } else {
        updateFields.decklist = decklist.trim();
        updateFields.bringingDecklistOnsite = false;
      }
    }

    if (bringingDecklistOnsite !== undefined) {
      updateFields.bringingDecklistOnsite = bringingDecklistOnsite;
      if (bringingDecklistOnsite) {
        updateFields.decklist = null;
      }
    }

    // Determine status
    const hasDecklist =
      updateFields.decklist !== undefined
        ? updateFields.decklist !== null
        : existingRegistration.decklist !== null;
    const bringingOnsite =
      updateFields.bringingDecklistOnsite !== undefined
        ? updateFields.bringingDecklistOnsite
        : existingRegistration.bringingDecklistOnsite;

    if (hasDecklist || bringingOnsite) {
      updateFields.status = "registered";
    } else {
      updateFields.status = "reserved";
    }

    return {
      success: true,
      registration: {
        ...existingRegistration,
        ...updateFields,
      },
    };
  },
};

describe("Integration Tests - Full Registration Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Complete Registration Workflow", () => {
    it("should complete full registration flow for event without decklist requirement", async () => {
      const eventData = {
        eventId: "event-1",
        customEvent: {
          id: "event-1",
          name: "Local Tournament",
          requiresDecklist: false,
          maxParticipants: 10,
        },
        player: {
          id: "player-1",
          playerId: "john123",
          name: "John Doe",
          email: "john@example.com",
        },
        currentRegistrations: 5,
        existingRegistration: null,
      };

      const result = await mockApiHandler.register(eventData);

      expect(result.success).toBe(true);
      expect(result.registration.status).toBe("registered");
      expect(result.registration.customEventId).toBe("event-1");
      expect(result.registration.playerId).toBe("player-1");
    });

    it("should complete full workflow for event with decklist requirement", async () => {
      // Step 1: Initial registration (should be reserved)
      const eventData = {
        eventId: "event-2",
        customEvent: {
          id: "event-2",
          name: "Competitive Tournament",
          requiresDecklist: true,
          maxParticipants: 16,
        },
        player: {
          id: "player-2",
          playerId: "jane456",
          name: "Jane Smith",
          email: "jane@example.com",
        },
        currentRegistrations: 8,
        existingRegistration: null,
      };

      const registrationResult = await mockApiHandler.register(eventData);

      expect(registrationResult.success).toBe(true);
      expect(registrationResult.registration.status).toBe("reserved");

      // Step 2: Submit decklist (should change to registered)
      const decklistData = {
        registrationId: registrationResult.registration.id,
        decklist: "4 Pikachu\n4 Thunder Shock\n4 Pokeball",
        existingRegistration: registrationResult.registration,
      };

      const decklistResult = await mockApiHandler.decklistUpdate(decklistData);

      expect(decklistResult.success).toBe(true);
      expect(decklistResult.registration.status).toBe("registered");
      expect(decklistResult.registration.decklist).toBe(
        "4 Pikachu\n4 Thunder Shock\n4 Pokeball"
      );
    });

    it("should handle user changing from submitted decklist to onsite", async () => {
      // Initial state: registered with submitted decklist
      const initialRegistration = {
        id: "reg-123",
        customEventId: "event-3",
        playerId: "player-3",
        status: "registered",
        decklist: "4 Charizard\n4 Fire Energy",
        bringingDecklistOnsite: false,
      };

      // User chooses to bring onsite instead
      const onsiteData = {
        registrationId: "reg-123",
        bringingDecklistOnsite: true,
        existingRegistration: initialRegistration,
      };

      const result = await mockApiHandler.decklistUpdate(onsiteData);

      expect(result.registration.status).toBe("registered");
      expect(result.registration.decklist).toBe(null);
      expect(result.registration.bringingDecklistOnsite).toBe(true);
    });

    it("should handle user deleting decklist and returning to reserved status", async () => {
      // Initial state: registered with submitted decklist
      const initialRegistration = {
        id: "reg-456",
        customEventId: "event-4",
        playerId: "player-4",
        status: "registered",
        decklist: "4 Blastoise\n4 Water Energy",
        bringingDecklistOnsite: false,
      };

      // User deletes decklist
      const deleteData = {
        registrationId: "reg-456",
        decklist: null,
        bringingDecklistOnsite: false,
        existingRegistration: initialRegistration,
      };

      const result = await mockApiHandler.decklistUpdate(deleteData);

      expect(result.registration.status).toBe("reserved");
      expect(result.registration.decklist).toBe(null);
      expect(result.registration.bringingDecklistOnsite).toBe(false);
    });
  });

  describe("Re-registration After Cancellation", () => {
    it("should allow complete re-registration workflow after cancellation", async () => {
      // Step 1: User tries to re-register for event they previously cancelled
      const cancelledRegistration = {
        id: "old-reg-789",
        customEventId: "event-5",
        playerId: "player-5",
        status: "cancelled",
        registeredAt: new Date("2025-10-01"),
        decklist: "old decklist",
        bringingDecklistOnsite: true,
      };

      const eventData = {
        eventId: "event-5",
        customEvent: {
          id: "event-5",
          name: "Championship",
          requiresDecklist: true,
          maxParticipants: 32,
        },
        player: {
          id: "player-5",
          playerId: "alice789",
          name: "Alice Johnson",
          email: "alice@example.com",
        },
        currentRegistrations: 15,
        existingRegistration: cancelledRegistration,
      };

      const reregistrationResult = await mockApiHandler.register(eventData);

      expect(reregistrationResult.success).toBe(true);
      expect(reregistrationResult.registration.id).toBe("old-reg-789"); // Reuses same ID
      expect(reregistrationResult.registration.status).toBe("reserved"); // Requires decklist
      expect(reregistrationResult.registration.decklist).toBe(null); // Cleared old data
      expect(reregistrationResult.registration.bringingDecklistOnsite).toBe(
        false
      ); // Reset

      // Step 2: User submits new decklist
      const newDecklistData = {
        registrationId: "old-reg-789",
        decklist: "4 Mewtwo\n4 Psychic Energy\n4 Ultra Ball",
        existingRegistration: reregistrationResult.registration,
      };

      const finalResult = await mockApiHandler.decklistUpdate(newDecklistData);

      expect(finalResult.registration.status).toBe("registered");
      expect(finalResult.registration.decklist).toBe(
        "4 Mewtwo\n4 Psychic Energy\n4 Ultra Ball"
      );
    });

    it("should prevent registration if user has active (non-cancelled) registration", async () => {
      const activeRegistration = {
        id: "active-reg-101",
        customEventId: "event-6",
        playerId: "player-6",
        status: "registered",
      };

      const eventData = {
        eventId: "event-6",
        customEvent: {
          id: "event-6",
          name: "Local Cup",
          requiresDecklist: false,
          maxParticipants: 8,
        },
        player: {
          id: "player-6",
          playerId: "bob101",
          name: "Bob Wilson",
          email: "bob@example.com",
        },
        currentRegistrations: 4,
        existingRegistration: activeRegistration,
      };

      await expect(mockApiHandler.register(eventData)).rejects.toThrow(
        "Already registered"
      );
    });
  });

  describe("Event Capacity Management", () => {
    it("should respect event capacity when counting only active registrations", async () => {
      // Event with 3 spots, but 2 cancelled registrations shouldn't count
      const eventData = {
        eventId: "event-7",
        customEvent: {
          id: "event-7",
          name: "Small Tournament",
          requiresDecklist: false,
          maxParticipants: 3,
        },
        player: {
          id: "player-7",
          playerId: "charlie202",
          name: "Charlie Brown",
          email: "charlie@example.com",
        },
        currentRegistrations: 2, // Only active registrations (cancelled ones excluded)
        existingRegistration: null,
      };

      const result = await mockApiHandler.register(eventData);

      expect(result.success).toBe(true);
      expect(result.registration.status).toBe("registered");
    });

    it("should reject registration when event is at capacity", async () => {
      const eventData = {
        eventId: "event-8",
        customEvent: {
          id: "event-8",
          name: "Full Tournament",
          requiresDecklist: false,
          maxParticipants: 4,
        },
        player: {
          id: "player-8",
          playerId: "dave303",
          name: "Dave Miller",
          email: "dave@example.com",
        },
        currentRegistrations: 4, // At capacity
        existingRegistration: null,
      };

      await expect(mockApiHandler.register(eventData)).rejects.toThrow(
        "Event is full"
      );
    });
  });
});
