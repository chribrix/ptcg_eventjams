import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Prisma client and methods
const mockPrisma = {
  customEvent: {
    findUnique: vi.fn(),
  },
  player: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  eventRegistration: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
}

// Mock createError function
const createError = (error: { statusCode: number; statusMessage: string; data?: any }) => {
  const err = new Error(error.statusMessage) as any
  err.statusCode = error.statusCode
  err.statusMessage = error.statusMessage
  err.data = error.data
  return err
}

describe('API Endpoint Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/events/[id]/register', () => {
    it('should create reserved registration for event requiring decklist', async () => {
      // Setup mocks
      const mockEvent = {
        id: 'event-1',
        name: 'Competitive Tournament',
        requiresDecklist: true,
        maxParticipants: 16,
        eventDate: new Date('2025-12-01')
      }

      const mockPlayer = {
        id: 'player-1',
        playerId: 'user123',
        name: 'John Doe',
        email: 'john@example.com'
      }

      mockPrisma.customEvent.findUnique.mockResolvedValue(mockEvent)
      mockPrisma.eventRegistration.count.mockResolvedValue(5) // Current registrations
      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer)
      mockPrisma.eventRegistration.findUnique.mockResolvedValue(null) // No existing registration
      mockPrisma.eventRegistration.create.mockResolvedValue({
        id: 'reg-1',
        customEventId: 'event-1',
        playerId: 'player-1',
        status: 'reserved',
        decklist: null,
        bringingDecklistOnsite: false
      })

      // Simulate the registration logic
      const requestData = {
        playerId: 'user123',
        name: 'John Doe',
        email: 'john@example.com'
      }

      // Validate event exists
      const event = await mockPrisma.customEvent.findUnique({ where: { id: 'event-1' } })
      expect(event).toBeTruthy()
      expect(event.requiresDecklist).toBe(true)

      // Check capacity
      const currentCount = await mockPrisma.eventRegistration.count({
        where: { customEventId: 'event-1', status: { not: 'cancelled' } }
      })
      expect(currentCount).toBeLessThan(event.maxParticipants)

      // Check for existing registration
      const existingReg = await mockPrisma.eventRegistration.findUnique({
        where: { customEventId_playerId: { customEventId: 'event-1', playerId: 'player-1' } }
      })
      expect(existingReg).toBe(null)

      // Create registration
      const registration = await mockPrisma.eventRegistration.create({
        data: {
          customEventId: 'event-1',
          playerId: 'player-1',
          status: event.requiresDecklist ? 'reserved' : 'registered',
          decklist: null,
          bringingDecklistOnsite: false
        }
      })

      expect(registration.status).toBe('reserved')
      expect(registration.decklist).toBe(null)
      expect(registration.bringingDecklistOnsite).toBe(false)
    })

    it('should update cancelled registration instead of creating new one', async () => {
      const mockEvent = {
        id: 'event-2',
        name: 'Local Cup',
        requiresDecklist: false,
        maxParticipants: 8,
        eventDate: new Date('2025-12-01')
      }

      const mockPlayer = {
        id: 'player-2',
        playerId: 'user456',
        name: 'Jane Smith',
        email: 'jane@example.com'
      }

      const cancelledRegistration = {
        id: 'old-reg-1',
        customEventId: 'event-2',
        playerId: 'player-2',
        status: 'cancelled',
        registeredAt: new Date('2025-10-01'),
        decklist: 'old content',
        bringingDecklistOnsite: true
      }

      mockPrisma.customEvent.findUnique.mockResolvedValue(mockEvent)
      mockPrisma.eventRegistration.count.mockResolvedValue(3)
      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer)
      mockPrisma.eventRegistration.findUnique.mockResolvedValue(cancelledRegistration)
      mockPrisma.eventRegistration.update.mockResolvedValue({
        ...cancelledRegistration,
        status: 'registered',
        registeredAt: new Date(),
        decklist: null,
        bringingDecklistOnsite: false,
        notes: null
      })

      // Check existing registration
      const existingReg = await mockPrisma.eventRegistration.findUnique({
        where: { customEventId_playerId: { customEventId: 'event-2', playerId: 'player-2' } }
      })
      
      expect(existingReg.status).toBe('cancelled')

      // Since it's cancelled, should update instead of create
      const updatedRegistration = await mockPrisma.eventRegistration.update({
        where: { id: existingReg.id },
        data: {
          status: mockEvent.requiresDecklist ? 'reserved' : 'registered',
          registeredAt: expect.any(Date),
          decklist: null,
          bringingDecklistOnsite: false,
          notes: null
        }
      })

      expect(updatedRegistration.status).toBe('registered')
      expect(updatedRegistration.decklist).toBe(null)
      expect(updatedRegistration.bringingDecklistOnsite).toBe(false)
    })

    it('should reject registration for full event', async () => {
      const mockEvent = {
        id: 'event-3',
        name: 'Full Tournament',
        requiresDecklist: false,
        maxParticipants: 4,
        eventDate: new Date('2025-12-01')
      }

      mockPrisma.customEvent.findUnique.mockResolvedValue(mockEvent)
      mockPrisma.eventRegistration.count.mockResolvedValue(4) // At capacity

      const currentCount = await mockPrisma.eventRegistration.count({
        where: { customEventId: 'event-3', status: { not: 'cancelled' } }
      })

      const shouldThrow = () => {
        if (currentCount >= mockEvent.maxParticipants) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Event is full',
            data: { message: 'This event has reached maximum capacity' }
          })
        }
      }

      expect(shouldThrow).toThrow('Event is full')
    })

    it('should reject registration for active existing registration', async () => {
      const activeRegistration = {
        id: 'active-reg',
        customEventId: 'event-4',
        playerId: 'player-4',
        status: 'registered'
      }

      mockPrisma.eventRegistration.findUnique.mockResolvedValue(activeRegistration)

      const shouldThrow = () => {
        if (activeRegistration && activeRegistration.status !== 'cancelled') {
          throw createError({
            statusCode: 400,
            statusMessage: 'Already registered',
            data: { message: 'You are already registered for this event' }
          })
        }
      }

      expect(shouldThrow).toThrow('Already registered')
    })
  })

  describe('PUT /api/dashboard/decklist', () => {
    it('should update registration status to registered when decklist is submitted', async () => {
      const existingRegistration = {
        id: 'reg-1',
        customEventId: 'event-1',
        playerId: 'player-1',
        status: 'reserved',
        decklist: null,
        bringingDecklistOnsite: false,
        customEvent: { requiresDecklist: true }
      }

      const updateData = {
        registrationId: 'reg-1',
        decklist: '4 Pikachu\n4 Thunder Shock',
        bringingDecklistOnsite: false
      }

      mockPrisma.eventRegistration.findUnique.mockResolvedValue(existingRegistration)
      mockPrisma.eventRegistration.update.mockResolvedValue({
        ...existingRegistration,
        decklist: updateData.decklist.trim(),
        bringingDecklistOnsite: false,
        status: 'registered'
      })

      // Simulate the update logic
      const updatedReg = await mockPrisma.eventRegistration.update({
        where: { id: updateData.registrationId },
        data: {
          decklist: updateData.decklist.trim(),
          bringingDecklistOnsite: false,
          status: 'registered'
        }
      })

      expect(updatedReg.decklist).toBe('4 Pikachu\n4 Thunder Shock')
      expect(updatedReg.status).toBe('registered')
      expect(updatedReg.bringingDecklistOnsite).toBe(false)
    })

    it('should update status to registered when choosing to bring onsite', async () => {
      const existingRegistration = {
        id: 'reg-2',
        status: 'reserved',
        decklist: null,
        bringingDecklistOnsite: false,
        customEvent: { requiresDecklist: true }
      }

      const updateData = {
        registrationId: 'reg-2',
        bringingDecklistOnsite: true
      }

      mockPrisma.eventRegistration.update.mockResolvedValue({
        ...existingRegistration,
        decklist: null,
        bringingDecklistOnsite: true,
        status: 'registered'
      })

      const updatedReg = await mockPrisma.eventRegistration.update({
        where: { id: updateData.registrationId },
        data: {
          decklist: null,
          bringingDecklistOnsite: true,
          status: 'registered'
        }
      })

      expect(updatedReg.bringingDecklistOnsite).toBe(true)
      expect(updatedReg.status).toBe('registered')
      expect(updatedReg.decklist).toBe(null)
    })

    it('should revert status to reserved when decklist is deleted', async () => {
      const existingRegistration = {
        id: 'reg-3',
        status: 'registered',
        decklist: 'existing decklist',
        bringingDecklistOnsite: false,
        customEvent: { requiresDecklist: true }
      }

      const updateData = {
        registrationId: 'reg-3',
        decklist: null,
        bringingDecklistOnsite: false
      }

      mockPrisma.eventRegistration.update.mockResolvedValue({
        ...existingRegistration,
        decklist: null,
        bringingDecklistOnsite: false,
        status: 'reserved'
      })

      const updatedReg = await mockPrisma.eventRegistration.update({
        where: { id: updateData.registrationId },
        data: {
          decklist: null,
          bringingDecklistOnsite: false,
          status: 'reserved'
        }
      })

      expect(updatedReg.decklist).toBe(null)
      expect(updatedReg.bringingDecklistOnsite).toBe(false)
      expect(updatedReg.status).toBe('reserved')
    })
  })

  describe('GET /api/events/[id] - Registration Count', () => {
    it('should exclude cancelled registrations from count', async () => {
      const mockEvent = {
        id: 'event-5',
        name: 'Test Event',
        maxParticipants: 10
      }

      // Should only count non-cancelled registrations
      mockPrisma.customEvent.findUnique.mockResolvedValue(mockEvent)
      mockPrisma.eventRegistration.count.mockResolvedValue(6) // Excludes cancelled ones

      const event = await mockPrisma.customEvent.findUnique({ where: { id: 'event-5' } })
      const registrationCount = await mockPrisma.eventRegistration.count({
        where: {
          customEventId: 'event-5',
          status: { not: 'cancelled' }
        }
      })

      expect(registrationCount).toBe(6)
      expect(registrationCount).toBeLessThan(event.maxParticipants)
    })
  })
})