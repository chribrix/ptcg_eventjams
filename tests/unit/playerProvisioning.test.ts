// @vitest-environment node

import { describe, expect, it, vi, beforeEach } from "vitest";
import { ensurePlayerForAuthUser } from "../../server/util/playerProvisioning";

describe("playerProvisioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new player for a new auth user", async () => {
    const prisma = {
      player: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        create: vi.fn().mockResolvedValue({
          id: "player-1",
          supabaseId: "auth-1",
          playerId: "1001",
          name: "New Player",
          email: "new@example.com",
          preferredLoginMethod: "password",
        }),
        update: vi.fn(),
      },
    };

    const player = await ensurePlayerForAuthUser(prisma as any, {
      supabaseId: "auth-1",
      email: "New@Example.com",
      name: "New Player",
      playerId: "1001",
      preferredLoginMethod: "password",
    });

    expect(prisma.player.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        supabaseId: "auth-1",
        email: "new@example.com",
        playerId: "1001",
        preferredLoginMethod: "password",
      }),
    });
    expect(player.id).toBe("player-1");
  });

  it("links an existing unlinked player by playerId", async () => {
    const prisma = {
      player: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: "player-1",
            supabaseId: null,
            playerId: "1001",
            name: "Imported Player",
            email: "imported@example.com",
          }),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({
          id: "player-1",
          supabaseId: "auth-1",
          playerId: "1001",
        }),
      },
    };

    await ensurePlayerForAuthUser(prisma as any, {
      supabaseId: "auth-1",
      email: "imported@example.com",
      name: "Imported Player",
      playerId: "1001",
    });

    expect(prisma.player.update).toHaveBeenCalledWith({
      where: { id: "player-1" },
      data: expect.objectContaining({
        supabaseId: "auth-1",
        email: "imported@example.com",
      }),
    });
  });

  it("rejects provisioning when the playerId belongs to another auth user", async () => {
    const prisma = {
      player: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: "player-2",
            supabaseId: "other-auth",
            playerId: "1001",
            email: "other@example.com",
          }),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    await expect(
      ensurePlayerForAuthUser(prisma as any, {
        supabaseId: "auth-1",
        email: "new@example.com",
        name: "New Player",
        playerId: "1001",
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: "Player ID already exists",
    });
  });
});