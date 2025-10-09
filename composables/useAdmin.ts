// composables/useAdmin.ts
interface AdminCheckResponse {
  isAdmin: boolean;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

export const useAdmin = () => {
  const supabaseUser = useSupabaseUser();
  const adminStatus = ref<AdminCheckResponse | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Check admin status from server API
  const checkAdminStatus = async () => {
    if (!supabaseUser.value) {
      adminStatus.value = null;
      return false;
    }

    // Double-check that we have a valid session before making the API call
    const { data: session } = await useSupabaseClient().auth.getSession();
    if (!session?.session) {
      adminStatus.value = null;
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const data = await $fetch<AdminCheckResponse>("/api/admin/check");
      adminStatus.value = data;
      return data.isAdmin;
    } catch (err: any) {
      // Only log actual errors, not auth session missing (which is expected for logged out users)
      if (err.statusCode !== 401) {
        console.error("Admin check failed:", err);
      }
      error.value =
        err.statusCode === 401
          ? null
          : err.statusMessage || "Failed to check admin status";
      adminStatus.value = null;
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Computed property for admin status
  const isAdmin = computed(() => {
    return adminStatus.value?.isAdmin || false;
  });

  // Get current admin user data
  const adminUser = computed(() => {
    return adminStatus.value?.user || null;
  });

  // Check admin access and throw error if not admin
  const checkAdminAccess = async () => {
    const hasAccess = await checkAdminStatus();
    if (!hasAccess) {
      throw createError({
        statusCode: 403,
        statusMessage: "Access denied - Admin privileges required",
      });
    }
  };

  // Watch for user login/logout and check admin status
  watch(
    supabaseUser,
    async (newUser) => {
      if (newUser) {
        // Add a small delay to ensure the session is fully established
        await nextTick();
        await checkAdminStatus();
      } else {
        adminStatus.value = null;
        error.value = null;
      }
    },
    { immediate: true }
  );

  return {
    isAdmin: readonly(isAdmin),
    adminUser: readonly(adminUser),
    user: readonly(supabaseUser),
    loading: readonly(loading),
    error: readonly(error),
    checkAdminStatus,
    checkAdminAccess,
  };
};
