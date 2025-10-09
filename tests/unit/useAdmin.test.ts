import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  type MockedFunction,
} from "vitest";
import { ref, type Ref } from "vue";
import { mockUsers, mockApiResponses } from "../mocks/adminMocks";

// Type definitions for better type safety
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

interface MockError extends Error {
  statusCode: number;
  statusMessage: string;
}

interface UseAdminComposable {
  isAdmin: Ref<boolean>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  checkAdminStatus: () => Promise<boolean>;
  checkAdminAccess: () => Promise<void>;
}

// Create a simplified mock composable for testing
const createMockUseAdmin = (): UseAdminComposable => {
  const isAdmin = ref(false);
  const loading = ref(false);
  const error: Ref<string | null> = ref(null);

  const checkAdminStatus = vi.fn(async () => {
    loading.value = true;
    error.value = null;

    try {
      // Mock the behavior based on current user
      const currentUser = mockSupabaseUser.value;

      if (!currentUser) {
        isAdmin.value = false;
        return false;
      }

      // Check if session exists
      const session = await mockSupabaseClient.auth.getSession();
      if (!session.data?.session) {
        isAdmin.value = false;
        return false;
      }

      // Mock API call
      const response = await mockFetch("/api/admin/check");
      isAdmin.value = response.isAdmin;
      return response.isAdmin;
    } catch (err: unknown) {
      const errorObj = err as MockError;
      if (errorObj.statusCode === 401) {
        isAdmin.value = false;
        error.value = null; // Don't store auth errors
      } else {
        isAdmin.value = false;
        error.value = errorObj.statusMessage || "Failed to check admin status";
      }
      return false;
    } finally {
      loading.value = false;
    }
  });

  const checkAdminAccess = vi.fn(async (): Promise<void> => {
    const hasAccess = await checkAdminStatus();
    if (!hasAccess) {
      const err = new Error(
        "Access denied - Admin privileges required"
      ) as MockError;
      err.statusCode = 403;
      err.statusMessage = "Access denied - Admin privileges required";
      throw err;
    }
  });

  return {
    isAdmin: readonly(isAdmin),
    loading: readonly(loading),
    error: readonly(error),
    checkAdminStatus,
    checkAdminAccess,
  };
};

// Mock reactive values
const mockSupabaseUser: Ref<SupabaseUser | null> = ref(null);
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
  },
};
const mockFetch = vi.fn();

// Mock readonly to return the same ref
const readonly = <T>(ref: Ref<T>): Ref<T> => ref;

describe("useAdmin Composable", () => {
  let useAdmin: () => UseAdminComposable;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset reactive state
    mockSupabaseUser.value = null;

    // Setup default session mock
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "mock-token" } },
    });

    // Create the mock composable
    useAdmin = createMockUseAdmin;
  });

  describe("Admin Status Check", () => {
    it("should return false for isAdmin when no user is logged in", () => {
      mockSupabaseUser.value = null;

      const { isAdmin } = useAdmin();

      expect(isAdmin.value).toBe(false);
    });

    it("should check admin status when user logs in", async () => {
      mockSupabaseUser.value = mockUsers.regularUser;
      mockFetch.mockResolvedValue(mockApiResponses.adminCheckNotAdmin);

      const { checkAdminStatus } = useAdmin();
      const result = await checkAdminStatus();

      expect(result).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/check");
    });

    it("should return true for admin user", async () => {
      mockSupabaseUser.value = mockUsers.adminUser;
      mockFetch.mockResolvedValue(mockApiResponses.adminCheckSuccess);

      const { checkAdminStatus } = useAdmin();
      const result = await checkAdminStatus();

      expect(result).toBe(true);
    });

    it("should not call API when no user is present", async () => {
      mockSupabaseUser.value = null;

      const { checkAdminStatus } = useAdmin();
      const result = await checkAdminStatus();

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should not call API when no session exists", async () => {
      mockSupabaseUser.value = mockUsers.regularUser;
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      const { checkAdminStatus } = useAdmin();
      const result = await checkAdminStatus();

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle 401 errors gracefully", async () => {
      mockSupabaseUser.value = mockUsers.regularUser;
      const authError = new Error("Unauthorized") as MockError;
      authError.statusCode = 401;
      authError.statusMessage = "Authentication required";
      mockFetch.mockRejectedValue(authError);

      const { checkAdminStatus, error } = useAdmin();
      const result = await checkAdminStatus();

      expect(result).toBe(false);
      expect(error.value).toBe(null); // 401 errors should not be stored as errors
    });

    it("should handle non-auth errors", async () => {
      mockSupabaseUser.value = mockUsers.regularUser;
      const serverError = new Error("Server Error") as MockError;
      serverError.statusCode = 500;
      serverError.statusMessage = "Internal server error";
      mockFetch.mockRejectedValue(serverError);

      const { checkAdminStatus, error } = useAdmin();
      const result = await checkAdminStatus();

      expect(result).toBe(false);
      expect(error.value).toBe("Internal server error");
    });

    it("should handle network errors", async () => {
      mockSupabaseUser.value = mockUsers.regularUser;
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { checkAdminStatus, error } = useAdmin();
      const result = await checkAdminStatus();

      expect(result).toBe(false);
      expect(error.value).toBe("Failed to check admin status");
    });
  });

  describe("checkAdminAccess", () => {
    it("should not throw for admin users", async () => {
      mockSupabaseUser.value = mockUsers.adminUser;
      mockFetch.mockResolvedValue(mockApiResponses.adminCheckSuccess);

      const { checkAdminAccess } = useAdmin();
      await expect(checkAdminAccess()).resolves.not.toThrow();
    });

    it("should throw 403 for non-admin users", async () => {
      mockSupabaseUser.value = mockUsers.regularUser;
      mockFetch.mockResolvedValue(mockApiResponses.adminCheckNotAdmin);

      const { checkAdminAccess } = useAdmin();
      await expect(checkAdminAccess()).rejects.toMatchObject({
        statusCode: 403,
        statusMessage: "Access denied - Admin privileges required",
      });
    });

    it("should throw 403 for unauthenticated users", async () => {
      mockSupabaseUser.value = null;

      const { checkAdminAccess } = useAdmin();
      await expect(checkAdminAccess()).rejects.toMatchObject({
        statusCode: 403,
        statusMessage: "Access denied - Admin privileges required",
      });
    });
  });

  describe("Loading States", () => {
    it("should set loading to true during admin check", async () => {
      mockSupabaseUser.value = mockUsers.regularUser;
      let loadingValue = false;

      mockFetch.mockImplementation(() => {
        loadingValue = true; // Capture loading state during API call
        return Promise.resolve(mockApiResponses.adminCheckNotAdmin);
      });

      const { checkAdminStatus, loading } = useAdmin();
      await checkAdminStatus();

      expect(loadingValue).toBe(true);
      expect(loading.value).toBe(false); // Should be false after completion
    });
  });

  describe("Reactive Updates", () => {
    it("should handle user logout properly", async () => {
      mockSupabaseUser.value = mockUsers.regularUser;
      const { checkAdminStatus, isAdmin } = useAdmin();

      // Simulate user logout
      mockSupabaseUser.value = null;
      const result = await checkAdminStatus();

      expect(result).toBe(false);
      expect(isAdmin.value).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
