import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  type MockedFunction,
} from "vitest";
import {
  mockUsers,
  mockApiResponses,
  mockDatabaseResponses,
} from "../mocks/adminMocks";

// Type definitions for better type safety
interface MockError extends Error {
  statusCode: number;
  statusMessage: string;
}

interface MockEvent {
  node: {
    req: { url: string };
    res: Record<string, unknown>;
  };
}

interface SupabaseUser {
  id: string;
  email: string;
  user_metadata?: { name?: string } | null;
  app_metadata: Record<string, unknown>;
  created_at: string;
}

interface AdminCheckResponse {
  isAdmin: boolean;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: "ADMIN" | "USER";
  };
}

type ServerSupabaseUserFunction = (
  event: MockEvent
) => Promise<SupabaseUser | null>;
type AdminCheckHandler = (event: MockEvent) => Promise<AdminCheckResponse>;

// Create simple mock error function
const createMockError = (
  statusCode: number,
  statusMessage: string
): MockError => {
  const error = new Error(statusMessage) as MockError;
  error.statusCode = statusCode;
  error.statusMessage = statusMessage;
  return error;
};

// Create mock Prisma instance
const mockPrisma = {
  adminUser: {
    findUnique: vi.fn(),
  },
};

// Mock admin check API logic
const createAdminCheckHandler = (
  serverSupabaseUser: ServerSupabaseUserFunction
): AdminCheckHandler => {
  return async (event: MockEvent): Promise<AdminCheckResponse> => {
    try {
      // Get the authenticated user from Supabase
      const user = await serverSupabaseUser(event);

      if (!user) {
        throw createMockError(401, "Authentication required");
      }

      // Simply check if user ID exists in admin_users table
      const adminUser = await mockPrisma.adminUser.findUnique({
        where: { id: user.id },
        select: { email: true, name: true },
      });

      // Return admin status based on whether user exists in admin table
      return {
        isAdmin: !!adminUser,
        user: {
          id: user.id,
          email: user.email || "",
          name: user.user_metadata?.name || null,
          role: adminUser ? "ADMIN" : "USER",
        },
      };
    } catch (error) {
      // Re-throw createError objects
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      throw createMockError(500, "Internal server error");
    }
  };
};

describe("Admin Check API Logic", () => {
  let mockEvent: MockEvent;
  let serverSupabaseUser: MockedFunction<ServerSupabaseUserFunction>;
  let adminCheckHandler: AdminCheckHandler;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock event object
    mockEvent = {
      node: {
        req: { url: "/api/admin/check" },
        res: {},
      },
    };

    // Mock serverSupabaseUser
    serverSupabaseUser = vi.fn();

    // Create admin check handler with mocked dependencies
    adminCheckHandler = createAdminCheckHandler(serverSupabaseUser);
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      serverSupabaseUser.mockResolvedValue(null);

      await expect(adminCheckHandler(mockEvent)).rejects.toMatchObject({
        statusCode: 401,
        statusMessage: "Authentication required",
      });

      expect(serverSupabaseUser).toHaveBeenCalledWith(mockEvent);
      expect(mockPrisma.adminUser.findUnique).not.toHaveBeenCalled();
    });

    it("should proceed with admin check when user is authenticated", async () => {
      serverSupabaseUser.mockResolvedValue(mockUsers.regularUser);
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      const result = await adminCheckHandler(mockEvent);

      expect(serverSupabaseUser).toHaveBeenCalledWith(mockEvent);
      expect(mockPrisma.adminUser.findUnique).toHaveBeenCalledWith({
        where: { id: mockUsers.regularUser.id },
        select: { email: true, name: true },
      });
      expect(result).toEqual(mockApiResponses.adminCheckNotAdmin);
    });
  });

  describe("Admin Status Check", () => {
    it("should return isAdmin: true when user exists in admin_users table", async () => {
      serverSupabaseUser.mockResolvedValue(mockUsers.adminUser);
      mockPrisma.adminUser.findUnique.mockResolvedValue(
        mockDatabaseResponses.adminUserFound
      );

      const result = await adminCheckHandler(mockEvent);

      expect(result).toEqual(mockApiResponses.adminCheckSuccess);
      expect(mockPrisma.adminUser.findUnique).toHaveBeenCalledWith({
        where: { id: mockUsers.adminUser.id },
        select: { email: true, name: true },
      });
    });

    it("should return isAdmin: false when user does not exist in admin_users table", async () => {
      serverSupabaseUser.mockResolvedValue(mockUsers.regularUser);
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      const result = await adminCheckHandler(mockEvent);

      expect(result).toEqual(mockApiResponses.adminCheckNotAdmin);
    });

    it("should handle user without metadata gracefully", async () => {
      serverSupabaseUser.mockResolvedValue(mockUsers.userWithoutMetadata);
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      const result = await adminCheckHandler(mockEvent);

      expect(result).toEqual({
        isAdmin: false,
        user: {
          id: mockUsers.userWithoutMetadata.id,
          email: mockUsers.userWithoutMetadata.email,
          name: null,
          role: "USER",
        },
      });
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when database query fails", async () => {
      serverSupabaseUser.mockResolvedValue(mockUsers.regularUser);
      mockPrisma.adminUser.findUnique.mockRejectedValue(
        new Error("Database error")
      );

      await expect(adminCheckHandler(mockEvent)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: "Internal server error",
      });
    });

    it("should re-throw createError objects", async () => {
      const customError = createMockError(403, "Custom error");
      serverSupabaseUser.mockRejectedValue(customError);

      await expect(adminCheckHandler(mockEvent)).rejects.toMatchObject({
        statusCode: 403,
        statusMessage: "Custom error",
      });
    });

    it("should handle Supabase auth errors", async () => {
      serverSupabaseUser.mockRejectedValue(new Error("Supabase auth failed"));

      await expect(adminCheckHandler(mockEvent)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: "Internal server error",
      });
    });
  });

  describe("Response Format", () => {
    it("should return correctly formatted response for admin user", async () => {
      serverSupabaseUser.mockResolvedValue(mockUsers.adminUser);
      mockPrisma.adminUser.findUnique.mockResolvedValue(
        mockDatabaseResponses.adminUserFound
      );

      const result = await adminCheckHandler(mockEvent);

      expect(result).toHaveProperty("isAdmin", true);
      expect(result).toHaveProperty("user");
      expect(result.user).toHaveProperty("id");
      expect(result.user).toHaveProperty("email");
      expect(result.user).toHaveProperty("name");
      expect(result.user).toHaveProperty("role", "ADMIN");
    });

    it("should return correctly formatted response for regular user", async () => {
      serverSupabaseUser.mockResolvedValue(mockUsers.regularUser);
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      const result = await adminCheckHandler(mockEvent);

      expect(result).toHaveProperty("isAdmin", false);
      expect(result).toHaveProperty("user");
      expect(result.user).toHaveProperty("role", "USER");
    });
  });
});
