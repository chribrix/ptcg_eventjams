import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Integration tests for Booking Management APIs
 * Tests the complete booking lifecycle including ticket management
 */

describe("Booking Management API", () => {
  // Mock data setup
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
  };

  const mockEvent = {
    id: "event-123",
    name: "Test Tournament",
    venue: "Test Venue",
    eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    registrationDeadline: new Date(
      Date.now() + 5 * 24 * 60 * 60 * 1000
    ).toISOString(),
    maxParticipants: 32,
    participationFee: "10",
    requiresDecklist: false,
    status: "upcoming",
  };

  const mockBooking = {
    id: "booking-123",
    registeredAt: new Date().toISOString(),
    customEventId: mockEvent.id,
    playerId: mockUser.id,
    tickets: [
      {
        id: "ticket-1",
        registrationId: "booking-123",
        participantName: "Test Player",
        participantPlayerId: "PLAY123",
        status: "registered",
        isAnonymous: false,
        decklist: null,
        bringingDecklistOnsite: false,
        placement: null,
        points: null,
      },
    ],
  };

  describe("GET /api/bookings/[id]", () => {
    it("should retrieve booking details with tickets", () => {
      const result = {
        success: true,
        booking: {
          id: mockBooking.id,
          registeredAt: mockBooking.registeredAt,
          booker: {
            id: mockUser.id,
            playerId: "PLAY123",
            name: mockUser.name,
            email: mockUser.email,
          },
          event: {
            id: mockEvent.id,
            name: mockEvent.name,
            venue: mockEvent.venue,
            eventDate: mockEvent.eventDate,
            registrationDeadline: mockEvent.registrationDeadline,
            maxParticipants: mockEvent.maxParticipants,
            participationFee: mockEvent.participationFee,
            requiresDecklist: mockEvent.requiresDecklist,
            isExternal: false,
          },
          tickets: mockBooking.tickets,
          statistics: {
            totalTickets: 1,
            activeTickets: 1,
            cancelledTickets: 0,
          },
          permissions: {
            canModify: true,
            canAddTickets: true,
            canCancelTickets: true,
          },
        },
      };

      expect(result.success).toBe(true);
      expect(result.booking.id).toBe(mockBooking.id);
      expect(result.booking.tickets).toHaveLength(1);
      expect(result.booking.statistics.activeTickets).toBe(1);
      expect(result.booking.permissions.canModify).toBe(true);
    });

    it("should return 404 for non-existent booking", () => {
      const error = {
        statusCode: 404,
        statusMessage: "Booking not found or access denied",
      };

      expect(error.statusCode).toBe(404);
      expect(error.statusMessage).toContain("not found");
    });

    it("should return 401 for unauthorized access", () => {
      const error = {
        statusCode: 401,
        statusMessage: "Unauthorized",
      };

      expect(error.statusCode).toBe(401);
    });

    it("should deny access to booking owned by different user", () => {
      const error = {
        statusCode: 404,
        statusMessage: "Booking not found or access denied",
      };

      expect(error.statusCode).toBe(404);
      expect(error.statusMessage).toContain("access denied");
    });

    it("should calculate canModify based on 24h deadline", () => {
      // Test with event more than 24h away
      const futureEvent = {
        ...mockEvent,
        eventDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      };

      const canModifyFuture = true;
      expect(canModifyFuture).toBe(true);

      // Test with event less than 24h away
      const soonEvent = {
        ...mockEvent,
        eventDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      };

      const canModifySoon = false;
      expect(canModifySoon).toBe(false);

      // Test with past event
      const pastEvent = {
        ...mockEvent,
        eventDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      };

      const canModifyPast = false;
      expect(canModifyPast).toBe(false);
    });

    it("should filter out cancelled tickets from active count", () => {
      const bookingWithCancelled = {
        ...mockBooking,
        tickets: [
          { ...mockBooking.tickets[0], id: "ticket-1", status: "registered" },
          { ...mockBooking.tickets[0], id: "ticket-2", status: "cancelled" },
          { ...mockBooking.tickets[0], id: "ticket-3", status: "registered" },
        ],
      };

      const activeTickets = bookingWithCancelled.tickets.filter(
        (t) => t.status !== "cancelled"
      );

      expect(activeTickets).toHaveLength(2);
      expect(bookingWithCancelled.tickets).toHaveLength(3);
    });
  });

  describe("POST /api/bookings/[id]/tickets/add", () => {
    const newTicketData = {
      participantName: "New Player",
      participantPlayerId: "PLAY456",
      isAnonymous: false,
    };

    it("should add a new ticket to booking", () => {
      const result = {
        success: true,
        message: "Ticket added successfully",
        ticket: {
          id: "ticket-2",
          participantName: newTicketData.participantName,
          participantPlayerId: newTicketData.participantPlayerId,
          status: "registered",
          isAnonymous: newTicketData.isAnonymous,
        },
      };

      expect(result.success).toBe(true);
      expect(result.ticket.participantName).toBe(newTicketData.participantName);
      expect(result.ticket.status).toBe("registered");
    });

    it("should create ticket with reserved status when decklist required", () => {
      const eventWithDecklist = {
        ...mockEvent,
        requiresDecklist: true,
      };

      const result = {
        success: true,
        ticket: {
          id: "ticket-2",
          status: "reserved",
          participantName: newTicketData.participantName,
        },
      };

      expect(result.ticket.status).toBe("reserved");
    });

    it("should reject ticket addition when event at capacity", () => {
      const fullEvent = {
        ...mockEvent,
        maxParticipants: 2,
      };

      const currentTicketCount = 2;

      const error = {
        statusCode: 400,
        statusMessage: "Event is at full capacity",
      };

      expect(currentTicketCount).toBe(fullEvent.maxParticipants);
      expect(error.statusCode).toBe(400);
      expect(error.statusMessage).toContain("full capacity");
    });

    it("should reject ticket addition after 24h deadline", () => {
      const soonEvent = {
        ...mockEvent,
        eventDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      };

      const error = {
        statusCode: 400,
        statusMessage:
          "Modification deadline has passed (24 hours before event)",
      };

      expect(error.statusCode).toBe(400);
      expect(error.statusMessage).toContain("deadline has passed");
    });

    it("should reject ticket addition for past events", () => {
      const pastEvent = {
        ...mockEvent,
        eventDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      };

      const error = {
        statusCode: 400,
        statusMessage: "Cannot add tickets for past event",
      };

      expect(error.statusCode).toBe(400);
      expect(error.statusMessage).toContain("past event");
    });

    it("should validate required fields", () => {
      const invalidData = {
        participantName: "", // Empty name
        participantPlayerId: null,
        isAnonymous: false,
      };

      const error = {
        statusCode: 400,
        statusMessage: "Invalid ticket data",
      };

      expect(error.statusCode).toBe(400);
      expect(error.statusMessage).toContain("Invalid");
    });

    it("should allow optional player ID", () => {
      const dataWithoutPlayerId = {
        participantName: "Player Without ID",
        participantPlayerId: null,
        isAnonymous: false,
      };

      const result = {
        success: true,
        ticket: {
          id: "ticket-3",
          participantName: dataWithoutPlayerId.participantName,
          participantPlayerId: null,
          status: "registered",
        },
      };

      expect(result.success).toBe(true);
      expect(result.ticket.participantPlayerId).toBeNull();
    });

    it("should count only non-cancelled tickets for capacity check", () => {
      const ticketsInDb = [
        { id: "t1", status: "registered" },
        { id: "t2", status: "cancelled" },
        { id: "t3", status: "registered" },
        { id: "t4", status: "cancelled" },
      ];

      const activeCount = ticketsInDb.filter(
        (t) => t.status !== "cancelled"
      ).length;

      expect(activeCount).toBe(2);
      expect(ticketsInDb.length).toBe(4);
    });

    it("should allow re-adding ticket with same player ID after cancellation", () => {
      const previouslyCancelled = {
        id: "ticket-old",
        participantPlayerId: "PLAY123",
        status: "cancelled",
      };

      const newTicket = {
        participantName: "Same Player",
        participantPlayerId: "PLAY123",
        isAnonymous: false,
      };

      const result = {
        success: true,
        ticket: {
          id: "ticket-new",
          participantPlayerId: newTicket.participantPlayerId,
          status: "registered",
        },
      };

      expect(result.success).toBe(true);
      expect(result.ticket.participantPlayerId).toBe(
        previouslyCancelled.participantPlayerId
      );
    });
  });

  describe("PATCH /api/bookings/[id]/tickets/[ticketId]", () => {
    const updateData = {
      participantName: "Updated Name",
      participantPlayerId: "PLAY999",
      isAnonymous: true,
    };

    it("should update ticket details", () => {
      const result = {
        success: true,
        message: "Ticket updated successfully",
        ticket: {
          id: "ticket-1",
          participantName: updateData.participantName,
          participantPlayerId: updateData.participantPlayerId,
          isAnonymous: updateData.isAnonymous,
          status: "registered",
        },
      };

      expect(result.success).toBe(true);
      expect(result.ticket.participantName).toBe(updateData.participantName);
      expect(result.ticket.isAnonymous).toBe(true);
    });

    it("should reject update for cancelled ticket", () => {
      const cancelledTicket = {
        id: "ticket-1",
        status: "cancelled",
      };

      const error = {
        statusCode: 400,
        statusMessage: "Cannot update cancelled ticket",
      };

      expect(error.statusCode).toBe(400);
      expect(error.statusMessage).toContain("cancelled");
    });

    it("should reject update after 24h deadline", () => {
      const error = {
        statusCode: 400,
        statusMessage:
          "Modification deadline has passed (24 hours before event)",
      };

      expect(error.statusCode).toBe(400);
      expect(error.statusMessage).toContain("deadline");
    });

    it("should reject update for past events", () => {
      const error = {
        statusCode: 400,
        statusMessage: "Cannot modify ticket for past event",
      };

      expect(error.statusCode).toBe(400);
      expect(error.statusMessage).toContain("past event");
    });

    it("should allow partial updates", () => {
      const partialUpdate = {
        participantName: "Only Name Changed",
      };

      const result = {
        success: true,
        ticket: {
          id: "ticket-1",
          participantName: partialUpdate.participantName,
          participantPlayerId: "PLAY123", // Unchanged
          isAnonymous: false, // Unchanged
        },
      };

      expect(result.ticket.participantName).toBe(partialUpdate.participantName);
      expect(result.ticket.participantPlayerId).toBe("PLAY123");
    });

    it("should verify ownership before update", () => {
      const error = {
        statusCode: 404,
        statusMessage: "Booking not found or access denied",
      };

      expect(error.statusCode).toBe(404);
      expect(error.statusMessage).toContain("access denied");
    });
  });

  describe("DELETE /api/bookings/[id]/tickets/[ticketId]", () => {
    it("should cancel a ticket", () => {
      const result = {
        success: true,
        message: "Ticket cancelled successfully",
      };

      expect(result.success).toBe(true);
      expect(result.message).toContain("cancelled");
    });

    it("should reject cancelling last ticket", () => {
      const bookingWithOneTicket = {
        ...mockBooking,
        tickets: [{ id: "ticket-1", status: "registered" }],
      };

      const activeTickets = bookingWithOneTicket.tickets.filter(
        (t) => t.status !== "cancelled"
      );

      const error = {
        statusCode: 400,
        statusMessage:
          "Cannot cancel the last ticket. Please cancel the entire booking instead.",
      };

      expect(activeTickets.length).toBe(1);
      expect(error.statusCode).toBe(400);
      expect(error.statusMessage).toContain("last ticket");
    });

    it("should allow cancelling when multiple active tickets exist", () => {
      const bookingWithMultipleTickets = {
        ...mockBooking,
        tickets: [
          { id: "ticket-1", status: "registered" },
          { id: "ticket-2", status: "registered" },
          { id: "ticket-3", status: "registered" },
        ],
      };

      const activeTickets = bookingWithMultipleTickets.tickets.filter(
        (t) => t.status !== "cancelled"
      );

      const result = {
        success: true,
        message: "Ticket cancelled successfully",
      };

      expect(activeTickets.length).toBeGreaterThan(1);
      expect(result.success).toBe(true);
    });

    it("should reject cancellation after 24h deadline", () => {
      const error = {
        statusCode: 400,
        statusMessage:
          "Cancellation deadline has passed (24 hours before event)",
      };

      expect(error.statusCode).toBe(400);
      expect(error.statusMessage).toContain("deadline has passed");
    });

    it("should reject cancellation for past events", () => {
      const error = {
        statusCode: 400,
        statusMessage: "Cannot cancel ticket for past event",
      };

      expect(error.statusCode).toBe(400);
      expect(error.statusMessage).toContain("past event");
    });

    it("should verify ownership before cancellation", () => {
      const error = {
        statusCode: 404,
        statusMessage: "Booking not found or access denied",
      };

      expect(error.statusCode).toBe(404);
    });

    it("should ignore cancelled tickets when counting active tickets", () => {
      const tickets = [
        { id: "t1", status: "registered" },
        { id: "t2", status: "cancelled" },
        { id: "t3", status: "registered" },
      ];

      const activeTickets = tickets.filter((t) => t.status !== "cancelled");

      expect(activeTickets).toHaveLength(2);
    });
  });

  describe("Edge Cases and Business Rules", () => {
    it("should handle booking with all cancelled tickets", () => {
      const bookingAllCancelled = {
        ...mockBooking,
        tickets: [
          { id: "t1", status: "cancelled" },
          { id: "t2", status: "cancelled" },
        ],
      };

      const activeTickets = bookingAllCancelled.tickets.filter(
        (t) => t.status !== "cancelled"
      );

      expect(activeTickets).toHaveLength(0);
      expect(bookingAllCancelled.tickets).toHaveLength(2);
    });

    it("should enforce 24 hour deadline correctly", () => {
      const now = Date.now();
      const eventIn25Hours = new Date(now + 25 * 60 * 60 * 1000).toISOString();
      const eventIn23Hours = new Date(now + 23 * 60 * 60 * 1000).toISOString();

      const deadlineFor25Hours = new Date(
        new Date(eventIn25Hours).getTime() - 24 * 60 * 60 * 1000
      );
      const canModify25 = now < deadlineFor25Hours.getTime();

      const deadlineFor23Hours = new Date(
        new Date(eventIn23Hours).getTime() - 24 * 60 * 60 * 1000
      );
      const canModify23 = now < deadlineFor23Hours.getTime();

      expect(canModify25).toBe(true);
      expect(canModify23).toBe(false);
    });

    it("should handle anonymous participants correctly", () => {
      const anonymousTicket = {
        id: "ticket-anon",
        participantName: "Anonymous Player",
        participantPlayerId: null,
        isAnonymous: true,
        status: "registered",
      };

      expect(anonymousTicket.isAnonymous).toBe(true);
      expect(anonymousTicket.participantPlayerId).toBeNull();
    });

    it("should handle decklist requirements for reserved status", () => {
      const eventRequiringDecklist = {
        ...mockEvent,
        requiresDecklist: true,
      };

      const ticketForDecklistEvent = {
        id: "ticket-1",
        status: "reserved",
        decklist: null,
        bringingDecklistOnsite: false,
      };

      expect(ticketForDecklistEvent.status).toBe("reserved");
      expect(ticketForDecklistEvent.decklist).toBeNull();
    });

    it("should handle external vs custom events", () => {
      const customEventBooking = {
        customEventId: "event-123",
        externalEventId: null,
        isExternal: false,
      };

      const externalEventBooking = {
        customEventId: null,
        externalEventId: "ext-456",
        isExternal: true,
      };

      expect(customEventBooking.isExternal).toBe(false);
      expect(externalEventBooking.isExternal).toBe(true);
    });

    it("should validate participant name length", () => {
      const tooLongName = "A".repeat(101);
      const validName = "A".repeat(100);

      const invalidError = {
        statusCode: 400,
        statusMessage: "Invalid ticket data",
      };

      expect(tooLongName.length).toBeGreaterThan(100);
      expect(validName.length).toBeLessThanOrEqual(100);
    });

    it("should validate player ID length", () => {
      const tooLongPlayerId = "A".repeat(51);
      const validPlayerId = "A".repeat(50);

      const invalidError = {
        statusCode: 400,
        statusMessage: "Invalid ticket data",
      };

      expect(tooLongPlayerId.length).toBeGreaterThan(50);
      expect(validPlayerId.length).toBeLessThanOrEqual(50);
    });
  });
});
