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
