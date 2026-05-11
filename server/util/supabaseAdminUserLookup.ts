type SupabaseAdminLike = {
  auth: {
    admin: {
      getUserByEmail?: (email: string) => Promise<{
        data: { user: Record<string, unknown> | null };
        error: { message?: string } | null;
      }>;
      listUsers: (params?: {
        page?: number;
        perPage?: number;
      }) => Promise<{
        data: { users?: Array<Record<string, unknown>> | null } | null;
        error: { message?: string } | null;
      }>;
    };
  };
};

export async function getSupabaseAdminUserByEmail<TUser extends { email?: string | null }>(
  supabaseAdmin: SupabaseAdminLike,
  email: string,
): Promise<TUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const adminApi = supabaseAdmin.auth.admin;

  if (typeof adminApi.getUserByEmail === "function") {
    const { data, error } = await adminApi.getUserByEmail(normalizedEmail);

    if (!error && data?.user) {
      return data.user as TUser;
    }
  }

  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await adminApi.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = (data?.users || []) as TUser[];
    const match =
      users.find((user) => user.email?.toLowerCase() === normalizedEmail) ||
      null;

    if (match) {
      return match;
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
}
