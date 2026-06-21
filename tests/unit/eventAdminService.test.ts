import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = {
  adminUser: {
    upsert: vi.fn(),
  },
  customEvent: {
    create: vi.fn(),
  },
};

const mockRememberVenueDirectoryEntry = vi.fn();
const mockParseDateTimeLocalInput = vi.fn();

vi.mock("~/lib/prisma", () => ({
  default: mockPrisma,
}));

vi.mock("~/server/services/admin/venueAdminService", () => ({
  rememberVenueDirectoryEntry: mockRememberVenueDirectoryEntry,
}));

vi.mock("~/utils/eventDateTime", () => ({
  DEFAULT_EVENT_TIME_ZONE: "Europe/Berlin",
  parseDateTimeLocalInput: mockParseDateTimeLocalInput,
}));

describe("eventAdminService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ensures a legacy admin row exists before creating a custom event", async () => {
    const eventDate = new Date("2026-07-10T16:00:00.000Z");
    const registrationDeadline = new Date("2026-07-10T15:45:00.000Z");

    mockParseDateTimeLocalInput
      .mockReturnValueOnce(eventDate)
      .mockReturnValueOnce(registrationDeadline);
    mockPrisma.adminUser.upsert.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin User",
    });
    mockPrisma.customEvent.create.mockResolvedValue({
      id: "event-1",
      createdBy: "admin-1",
    });

    const { createAdminCustomEvent } = await import(
      "~/server/services/admin/eventAdminService"
    );

    await createAdminCustomEvent(
      {
        name: "Friday League",
        venue: "Local Store",
        tagType: "pokemon",
        tags: {
          type: "custom",
          game: "Pokemon",
          format: "standard",
          host: "League Org",
        },
        maxParticipants: 24,
        participationFee: 10,
        description: "Weekly event",
        eventDate: "2026-07-10T18:00",
        registrationDeadline: "2026-07-10T17:45",
        requiresDecklist: true,
        timeZone: "Europe/Berlin",
      },
      {
        id: "admin-1",
        email: "admin@example.com",
        user_metadata: { name: "Admin User" },
      },
    );

    expect(mockPrisma.adminUser.upsert).toHaveBeenCalledWith({
      where: { id: "admin-1" },
      update: {
        email: "admin@example.com",
        name: "Admin User",
      },
      create: {
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin User",
      },
    });

    expect(mockPrisma.customEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          createdBy: "admin-1",
          eventDate,
          registrationDeadline,
        }),
      }),
    );

    expect(mockRememberVenueDirectoryEntry).toHaveBeenCalledWith(
      "League Org",
      "Local Store",
    );
  });
});
