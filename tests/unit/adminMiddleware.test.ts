import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockedFunction,
} from "vitest";
import { mockUsers, mockDatabaseResponses } from "../mocks/adminMocks";

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

type ServerSupabaseUserFunction = (
  event: MockEvent
) => Promise<SupabaseUser | null>;
type VerifyAdminFunction = (event: MockEvent) => Promise<SupabaseUser>;

// Create mock functions that simulate the middleware behavior
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

// Mock verifyAdmin function that simulates the server middleware logic
const createVerifyAdmin = (
  serverSupabaseUser: ServerSupabaseUserFunction
): VerifyAdminFunction => {
  return async (event: MockEvent): Promise<SupabaseUser> => {
    try {
      // Get the authenticated user from Supabase
      const user = await serverSupabaseUser(event);

      if (!user) {
        throw createMockError(401, "Authentication required");
      }

      // Simply check if user ID exists in admin_users table
      const adminUser = await mockPrisma.adminUser.findUnique({
        where: { id: user.id },
      });

      // If user doesn't exist in admin table, they're not admin
      if (!adminUser) {
        throw createMockError(403, "Access denied - Admin privileges required");
      }

      return user; // Return the authenticated user if they are admin
    } catch (error) {
      // Re-throw createError objects
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      throw createMockError(
        500,
        "Internal server error during admin verification"
      );
    }
  };
};

describe("Admin Server Middleware Logic", () => {
  let mockEvent: MockEvent;
  let serverSupabaseUser: MockedFunction<ServerSupabaseUserFunction>;
  let verifyAdmin: VerifyAdminFunction;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock event object
    mockEvent = {
      node: {
        req: { url: "/api/admin/custom-events" },
        res: {},
      },
    };

    // Mock serverSupabaseUser
    serverSupabaseUser = vi.fn();

    // Create verifyAdmin function with mocked dependencies
    verifyAdmin = createVerifyAdmin(serverSupabaseUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("verifyAdmin function", () => {
    it("should throw 401 when user is not authenticated", async () => {
      serverSupabaseUser.mockResolvedValue(null);

      await expect(verifyAdmin(mockEvent)).rejects.toMatchObject({
        statusCode: 401,
        statusMessage: "Authentication required",
      });

      expect(serverSupabaseUser).toHaveBeenCalledWith(mockEvent);
      expect(mockPrisma.adminUser.findUnique).not.toHaveBeenCalled();
    });

    it("should throw 403 when user is not in admin_users table", async () => {
      serverSupabaseUser.mockResolvedValue(mockUsers.regularUser);
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(verifyAdmin(mockEvent)).rejects.toMatchObject({
        statusCode: 403,
        statusMessage: "Access denied - Admin privileges required",
      });

      expect(mockPrisma.adminUser.findUnique).toHaveBeenCalledWith({
        where: { id: mockUsers.regularUser.id },
      });
    });

    it("should return user when user is admin", async () => {
      serverSupabaseUser.mockResolvedValue(mockUsers.adminUser);
      mockPrisma.adminUser.findUnique.mockResolvedValue(
        mockDatabaseResponses.adminUserFound
      );

      const result = await verifyAdmin(mockEvent);

      expect(result).toBe(mockUsers.adminUser);
      expect(mockPrisma.adminUser.findUnique).toHaveBeenCalledWith({
        where: { id: mockUsers.adminUser.id },
      });
    });

    it("should throw 500 on database error", async () => {
      serverSupabaseUser.mockResolvedValue(mockUsers.regularUser);
      mockPrisma.adminUser.findUnique.mockRejectedValue(
        new Error("Database error")
      );

      await expect(verifyAdmin(mockEvent)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: "Internal server error during admin verification",
      });
    });

    it("should re-throw createError objects", async () => {
      const customError = createError({
        statusCode: 401,
        statusMessage: "Custom auth error",
      });
      serverSupabaseUser.mockRejectedValue(customError);

      await expect(verifyAdmin(mockEvent)).rejects.toBe(customError);
    });
  });

  describe("Middleware Route Protection Logic", () => {
    // Mock middleware handler that simulates the route protection logic
    const createMiddlewareHandler = (verifyAdminFn: VerifyAdminFunction) => {
      return async (event: MockEvent): Promise<void> => {
        // Only apply to admin API routes (except the check endpoint)
        if (
          event.node.req.url?.startsWith("/api/admin/") &&
          !event.node.req.url.includes("/api/admin/check")
        ) {
          await verifyAdminFn(event);
        }
      };
    };

    it("should call verifyAdmin for admin API routes", async () => {
      const adminEvent: MockEvent = {
        node: {
          req: { url: "/api/admin/custom-events" },
          res: {},
        },
      };
      serverSupabaseUser.mockResolvedValue(mockUsers.adminUser);
      mockPrisma.adminUser.findUnique.mockResolvedValue(
        mockDatabaseResponses.adminUserFound
      );

      const middlewareHandler = createMiddlewareHandler(verifyAdmin);

      await middlewareHandler(adminEvent);

      expect(serverSupabaseUser).toHaveBeenCalledWith(adminEvent);
    });

    it("should skip verification for admin check endpoint", async () => {
      const checkEvent: MockEvent = {
        node: {
          req: { url: "/api/admin/check" },
          res: {},
        },
      };

      const middlewareHandler = createMiddlewareHandler(verifyAdmin);

      await middlewareHandler(checkEvent);

      expect(serverSupabaseUser).not.toHaveBeenCalled();
    });

    it("should skip verification for non-admin routes", async () => {
      const publicEvent: MockEvent = {
        node: {
          req: { url: "/api/events" },
          res: {},
        },
      };

      const middlewareHandler = createMiddlewareHandler(verifyAdmin);

      await middlewareHandler(publicEvent);

      expect(serverSupabaseUser).not.toHaveBeenCalled();
    });

    it("should handle admin routes with trailing paths", async () => {
      const adminSubRouteEvent: MockEvent = {
        node: {
          req: { url: "/api/admin/custom-events/123" },
          res: {},
        },
      };
      serverSupabaseUser.mockResolvedValue(mockUsers.adminUser);
      mockPrisma.adminUser.findUnique.mockResolvedValue(
        mockDatabaseResponses.adminUserFound
      );

      const middlewareHandler = createMiddlewareHandler(verifyAdmin);

      await middlewareHandler(adminSubRouteEvent);

      expect(serverSupabaseUser).toHaveBeenCalledWith(adminSubRouteEvent);
    });
  });
});
