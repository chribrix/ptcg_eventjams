// Mock data for admin access tests
export const mockUsers = {
  // Regular authenticated user (not admin)
  regularUser: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    email: "user@example.com",
    user_metadata: {
      name: "Regular User",
    },
    app_metadata: {
      role: "user",
    },
    created_at: "2024-01-01T00:00:00.000Z",
  },

  // Admin user (exists in admin_users table)
  adminUser: {
    id: "123e4567-e89b-12d3-a456-426614174000",
    email: "admin@example.com",
    user_metadata: {
      name: "Admin User",
    },
    app_metadata: {
      role: "admin",
      roles: ["admin"],
    },
    created_at: "2024-01-01T00:00:00.000Z",
  },

  // User with no metadata
  userWithoutMetadata: {
    id: "550e8400-e29b-41d4-a716-446655440001",
    email: "nometadata@example.com",
    user_metadata: null,
    app_metadata: {
      role: "user",
    },
    created_at: "2024-01-01T00:00:00.000Z",
  },
};

// Mock Supabase sessions
export const mockSessions = {
  validSession: {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: mockUsers.regularUser,
  },

  adminSession: {
    access_token: "mock-admin-access-token",
    refresh_token: "mock-admin-refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: mockUsers.adminUser,
  },

  expiredSession: null,
};

// Expected API responses
export const mockApiResponses = {
  // Successful admin check - user is admin
  adminCheckSuccess: {
    isAdmin: true,
    user: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "admin@example.com",
      name: "Admin User",
      role: "ADMIN",
    },
  },

  // Successful admin check - user is not admin
  adminCheckNotAdmin: {
    isAdmin: false,
    user: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "user@example.com",
      name: "Regular User",
      role: "USER",
    },
  },

  // Unauthenticated response
  unauthenticatedResponse: {
    statusCode: 401,
    statusMessage: "Authentication required",
  },

  // Forbidden response
  forbiddenResponse: {
    statusCode: 403,
    statusMessage: "Access denied - Admin privileges required",
  },

  // Server error response
  serverErrorResponse: {
    statusCode: 500,
    statusMessage: "Internal server error",
  },
};

export const mockDatabaseResponses = {
  adminUserFound: {
    id: mockUsers.adminUser.id,
    email: mockUsers.adminUser.email,
    name: mockUsers.adminUser.user_metadata.name,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  },
};
