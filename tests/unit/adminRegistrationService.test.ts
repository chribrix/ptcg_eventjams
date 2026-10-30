// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const createError = (error: { statusCode: number; statusMessage: string }) => {
  const result = new Error(error.statusMessage) as Error & {
    statusCode: number;
    statusMessage: string;
  };
  result.statusCode = error.statusCode;
  result.statusMessage = error.statusMessage;
  return result;
};

const tx = {
  customEvent: { findUnique: vi.fn() },
  externalEventOverride: { findUnique: vi.fn() },
  player: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  eventRegistration: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  registrationTicket: { create: vi.fn() },
  waitlistEntry: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  $queryRaw: vi.fn(),
};

const mockPrisma = {
  $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  eventRegistration: { findMany: vi.fn() },
  player: { findMany: vi.fn() },
  waitlistEntry: { findMany: vi.fn() },
};

vi.mock("~/lib/prisma", () => ({
  default: mockPrisma,
}));

describe("adminRegistrationService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("createError", createError);

    tx.customEvent.findUnique.mockResolvedValue({ id: "event-1" });
    tx.$queryRaw.mockResolvedValue([]);
    tx.player.findUnique.mockResolvedValue(null);
    tx.player.create.mockResolvedValue({
      id: "player-record-1",
      playerId: "5124038",
      name: "Robert Müller",
      birthYear: 2000,
    });
    tx.eventRegistration.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "registration-1" });
    tx.eventRegistration.create.mockResolvedValue({ id: "registration-1" });
    tx.registrationTicket.create.mockResolvedValue({ id: "ticket-1" });
    tx.waitlistEntry.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.eventRegistration.findMany.mockResolvedValue([]);
    mockPrisma.player.findMany.mockResolvedValue([]);
    mockPrisma.waitlistEntry.findMany.mockResolvedValue([]);
  });

  it("uses each ticket participant's birth year for the registration list", async () => {
    mockPrisma.eventRegistration.findMany.mockResolvedValue([{
      id: "registration-1",
      player: { playerId: "5124038", name: "Robert Müller", birthYear: 2000 },
      tickets: [
        { id: "ticket-1", participantPlayerId: "5124038", participantName: "Robert Müller" },
        { id: "ticket-2", participantPlayerId: "7894561", participantName: "Anna Beispiel" },
      ],
    }]);
    mockPrisma.player.findMany.mockResolvedValue([
      { playerId: "5124038", birthYear: 2000 },
      { playerId: "7894561", birthYear: 2008 },
    ]);

    const { listAdminRegistrationsForEvent } = await import(
      "~/server/services/admin/adminRegistrationService"
    );
    const result = await listAdminRegistrationsForEvent("event-1");

    expect(result.registrations[0]?.tickets.map((ticket) => ticket.participantBirthYear)).toEqual([2000, 2008]);
    expect(mockPrisma.player.findMany).toHaveBeenCalledWith({
      where: { playerId: { in: ["5124038", "7894561"] } },
      select: { playerId: true, birthYear: true },
    });
  });

  it("creates a player from the manual fields and registers them even without a free-slot check", async () => {
    const { createAdminRegistration } = await import(
      "~/server/services/admin/adminRegistrationService"
    );

    await createAdminRegistration({
      eventId: "event-1",
      pokemonPlayerId: "5124038",
      playerName: "Robert Müller",
      birthYear: 2000,
      target: "registration",
    });

    expect(tx.player.create).toHaveBeenCalledWith({
      data: {
        playerId: "5124038",
        name: "Robert Müller",
        birthYear: 2000,
      },
    });
    expect(tx.eventRegistration.create).toHaveBeenCalledWith({
      data: {
        customEventId: "event-1",
        externalEventId: null,
        playerId: "player-record-1",
        notes: undefined,
      },
    });
    expect(tx.registrationTicket.create).toHaveBeenCalledWith({
      data: {
        registrationId: "registration-1",
        participantName: "Robert Müller",
        participantPlayerId: "5124038",
        status: "registered",
      },
    });
  });

  it("places a manually entered player directly on the waitlist", async () => {
    tx.waitlistEntry.findUnique.mockResolvedValue(null);
    tx.waitlistEntry.create.mockResolvedValue({ id: "waitlist-1" });

    const { createAdminRegistration } = await import(
      "~/server/services/admin/adminRegistrationService"
    );

    await createAdminRegistration({
      eventId: "event-1",
      pokemonPlayerId: "5124038",
      playerName: "Robert Müller",
      birthYear: 2000,
      target: "waitlist",
    });

    expect(tx.waitlistEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventKey: "custom:event-1",
        customEventId: "event-1",
        externalEventId: null,
        playerId: "player-record-1",
        status: "waiting",
      }),
    });
    expect(tx.registrationTicket.create).not.toHaveBeenCalled();
  });
});
