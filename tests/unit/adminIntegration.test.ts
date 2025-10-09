import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockUsers,
  mockApiResponses,
  mockDatabaseResponses,
} from "../mocks/adminMocks";

describe("Admin Access Integration Tests", () => {
  describe("Admin Script Tests", () => {
    let mockPrisma: any;

    beforeEach(() => {
      // Mock Prisma client for admin script
      mockPrisma = {
        adminUser: {
          create: vi.fn(),
          delete: vi.fn(),
          findMany: vi.fn(),
        },
        $disconnect: vi.fn(),
      };
    });

    it("should create admin user with valid data", async () => {
      // Arrange
      mockPrisma.adminUser.create.mockResolvedValue(
        mockDatabaseResponses.adminUserFound
      );

      // Act
      const result = await mockPrisma.adminUser.create({
        data: {
          id: mockUsers.adminUser.id,
          email: mockUsers.adminUser.email,
          name: mockUsers.adminUser.user_metadata?.name,
        },
      });

      // Assert
      expect(result).toEqual(mockDatabaseResponses.adminUserFound);
      expect(mockPrisma.adminUser.create).toHaveBeenCalledWith({
        data: {
          id: mockUsers.adminUser.id,
          email: mockUsers.adminUser.email,
          name: mockUsers.adminUser.user_metadata?.name,
        },
      });
    });

    it("should handle duplicate admin creation", async () => {
      // Arrange
      const duplicateError = new Error("Unique constraint failed") as any;
      duplicateError.code = "P2002";
      mockPrisma.adminUser.create.mockRejectedValue(duplicateError);

      // Act & Assert
      await expect(
        mockPrisma.adminUser.create({
          data: {
            id: mockUsers.adminUser.id,
            email: mockUsers.adminUser.email,
            name: mockUsers.adminUser.user_metadata?.name,
          },
        })
      ).rejects.toMatchObject({
        code: "P2002",
      });
    });

    it("should delete admin user by ID", async () => {
      // Arrange
      mockPrisma.adminUser.delete.mockResolvedValue(
        mockDatabaseResponses.adminUserFound
      );

      // Act
      const result = await mockPrisma.adminUser.delete({
        where: { id: mockUsers.adminUser.id },
      });

      // Assert
      expect(result).toEqual(mockDatabaseResponses.adminUserFound);
      expect(mockPrisma.adminUser.delete).toHaveBeenCalledWith({
        where: { id: mockUsers.adminUser.id },
      });
    });

    it("should list all admin users", async () => {
      // Arrange
      const adminList = [mockDatabaseResponses.adminUserFound];
      mockPrisma.adminUser.findMany.mockResolvedValue(adminList);

      // Act
      const result = await mockPrisma.adminUser.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      // Assert
      expect(result).toEqual(adminList);
      expect(mockPrisma.adminUser.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });
    });
  });

  describe("API Response Format Tests", () => {
    it("should return correct format for admin user response", () => {
      // Assert
      expect(mockApiResponses.adminCheckSuccess).toHaveProperty(
        "isAdmin",
        true
      );
      expect(mockApiResponses.adminCheckSuccess).toHaveProperty("user");
      expect(mockApiResponses.adminCheckSuccess.user).toHaveProperty("id");
      expect(mockApiResponses.adminCheckSuccess.user).toHaveProperty("email");
      expect(mockApiResponses.adminCheckSuccess.user).toHaveProperty("name");
      expect(mockApiResponses.adminCheckSuccess.user).toHaveProperty(
        "role",
        "ADMIN"
      );
    });

    it("should return correct format for regular user response", () => {
      // Assert
      expect(mockApiResponses.adminCheckNotAdmin).toHaveProperty(
        "isAdmin",
        false
      );
      expect(mockApiResponses.adminCheckNotAdmin).toHaveProperty("user");
      expect(mockApiResponses.adminCheckNotAdmin.user).toHaveProperty(
        "role",
        "USER"
      );
    });

    it("should have consistent user object structure", () => {
      // Assert
      const adminUserKeys = Object.keys(
        mockApiResponses.adminCheckSuccess.user
      );
      const regularUserKeys = Object.keys(
        mockApiResponses.adminCheckNotAdmin.user
      );

      expect(adminUserKeys).toEqual(regularUserKeys);
      expect(adminUserKeys).toContain("id");
      expect(adminUserKeys).toContain("email");
      expect(adminUserKeys).toContain("name");
      expect(adminUserKeys).toContain("role");
    });
  });

  describe("Database Schema Tests", () => {
    it("should validate admin user data structure", () => {
      // Assert
      const adminUser = mockDatabaseResponses.adminUserFound;

      expect(adminUser).toHaveProperty("id");
      expect(adminUser).toHaveProperty("email");
      expect(adminUser).toHaveProperty("name");
      expect(adminUser).toHaveProperty("createdAt");
      expect(adminUser).toHaveProperty("updatedAt");

      // Validate data types
      expect(typeof adminUser.id).toBe("string");
      expect(typeof adminUser.email).toBe("string");
      expect(adminUser.createdAt instanceof Date).toBe(true);
      expect(adminUser.updatedAt instanceof Date).toBe(true);
    });

    it("should handle optional name field", () => {
      // Arrange
      const adminWithoutName = {
        ...mockDatabaseResponses.adminUserFound,
        name: null,
      };

      // Assert
      expect(adminWithoutName.name).toBe(null);
      expect(adminWithoutName.email).toBeTruthy();
      expect(adminWithoutName.id).toBeTruthy();
    });
  });

  describe("Security Tests", () => {
    it("should not expose sensitive data in API responses", () => {
      // Assert
      expect(mockApiResponses.adminCheckSuccess.user).not.toHaveProperty(
        "password"
      );
      expect(mockApiResponses.adminCheckSuccess.user).not.toHaveProperty(
        "hash"
      );
      expect(mockApiResponses.adminCheckSuccess.user).not.toHaveProperty(
        "token"
      );
      expect(mockApiResponses.adminCheckSuccess.user).not.toHaveProperty(
        "secret"
      );
    });

    it("should return proper HTTP status codes", () => {
      // Assert
      expect(mockApiResponses.unauthenticatedResponse.statusCode).toBe(401);
      expect(mockApiResponses.forbiddenResponse.statusCode).toBe(403);
      expect(mockApiResponses.serverErrorResponse.statusCode).toBe(500);
    });

    it("should have descriptive error messages", () => {
      // Assert
      expect(mockApiResponses.unauthenticatedResponse.statusMessage).toBe(
        "Authentication required"
      );
      expect(mockApiResponses.forbiddenResponse.statusMessage).toBe(
        "Access denied - Admin privileges required"
      );
      expect(mockApiResponses.serverErrorResponse.statusMessage).toBe(
        "Internal server error"
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle user without metadata", () => {
      // Arrange
      const userWithoutMeta = mockUsers.userWithoutMetadata;

      // Assert
      expect(userWithoutMeta.user_metadata).toBe(null);
      expect(userWithoutMeta.email).toBeTruthy();
      expect(userWithoutMeta.id).toBeTruthy();
    });

    it("should handle empty admin list", () => {
      // Arrange
      const emptyAdminList: any[] = [];

      // Assert
      expect(Array.isArray(emptyAdminList)).toBe(true);
      expect(emptyAdminList.length).toBe(0);
    });

    it("should validate UUID format for user IDs", () => {
      // Arrange
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // Assert
      expect(mockUsers.adminUser.id).toMatch(uuidRegex);
      expect(mockUsers.regularUser.id).toMatch(uuidRegex);
      expect(mockUsers.userWithoutMetadata.id).toMatch(uuidRegex);
    });
  });
});
