<template>
  <AdminPageLayout
    title="Admin Users"
    subtitle="Manage Supabase auth users, linked players, admin roles, and password reset actions"
  >
    <template #actions>
      <button class="btn btn-secondary" :disabled="loading" @click="loadUsers">
        Refresh Users
      </button>
    </template>

    <div class="admin-card filters-card">
      <div class="filters-grid">
        <label class="form-group">
          <span>Search</span>
          <input
            v-model="searchTerm"
            type="text"
            class="form-input"
            placeholder="Email, player name, provider, player ID"
            @keyup.enter="applyFilters"
          />
        </label>

        <label class="form-group">
          <span>Role Filter</span>
          <select v-model="roleFilter" class="form-input" @change="applyFilters">
            <option value="">All users</option>
            <option value="admin">Admins</option>
            <option value="user">Non-admin users</option>
            <option value="unlinked">Unlinked auth users</option>
          </select>
        </label>
      </div>
    </div>

    <div v-if="feedbackMessage" :class="['feedback', feedbackType]">
      {{ feedbackMessage }}
    </div>

    <div class="admin-card">
      <div class="section-header">
        <h2>Auth Users</h2>
        <p class="results-summary">
          {{ pagination.total }} total users
        </p>
      </div>

      <div v-if="loading" class="loading">Loading users...</div>
      <div v-else-if="items.length === 0" class="no-data">
        No auth users matched the current filters.
      </div>
      <div v-else class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Linked Player</th>
              <th>Role</th>
              <th>Password</th>
              <th>Last Sign In</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>
                <div class="primary-cell">{{ item.email || "No email" }}</div>
                <div class="secondary-cell">{{ item.provider || "unknown provider" }}</div>
              </td>
              <td>
                <div v-if="item.linkedPlayer">
                  <div class="primary-cell">{{ item.linkedPlayer.name }}</div>
                  <div class="secondary-cell">{{ item.linkedPlayer.playerId }}</div>
                </div>
                <span v-else class="badge badge-muted">Unlinked</span>
              </td>
              <td>
                <span :class="['badge', item.isAdmin ? 'badge-admin' : 'badge-user']">
                  {{ item.isAdmin ? "Admin" : "User" }}
                </span>
              </td>
              <td>
                {{ item.hasPassword ? "Configured" : "Not set" }}
              </td>
              <td>
                {{ formatDateTime(item.lastSignInAt) }}
              </td>
              <td>
                <div class="action-buttons">
                  <button
                    class="btn btn-small btn-secondary"
                    :disabled="detailLoading === item.id"
                    @click="selectUser(item.id)"
                  >
                    Inspect
                  </button>
                  <button
                    class="btn btn-small"
                    :class="item.isAdmin ? 'btn-warning' : 'btn-primary'"
                    :disabled="actionLoadingId === item.id"
                    @click="toggleRole(item.id, !item.isAdmin)"
                  >
                    {{ item.isAdmin ? "Remove Admin" : "Make Admin" }}
                  </button>
                  <button
                    class="btn btn-small btn-info"
                    :disabled="actionLoadingId === item.id || !item.email"
                    @click="sendPasswordReset(item.id)"
                  >
                    Reset Password
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination" v-if="pagination.pages > 1">
        <button
          class="pagination-btn"
          :disabled="pagination.page <= 1"
          @click="changePage(pagination.page - 1)"
        >
          Previous
        </button>
        <span class="pagination-status">Page {{ pagination.page }} of {{ pagination.pages }}</span>
        <button
          class="pagination-btn"
          :disabled="pagination.page >= pagination.pages"
          @click="changePage(pagination.page + 1)"
        >
          Next
        </button>
      </div>
    </div>

    <div v-if="selectedUser" class="admin-card">
      <div class="section-header">
        <h2>User Detail</h2>
        <button class="btn btn-secondary btn-small" @click="selectedUser = null">
          Close
        </button>
      </div>

      <div class="detail-grid">
        <div>
          <h3>Account Summary</h3>
          <dl class="detail-list">
            <div>
              <dt>Email</dt>
              <dd>{{ selectedUser.email || "No email" }}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{{ formatDateTime(selectedUser.createdAt) }}</dd>
            </div>
            <div>
              <dt>Last sign in</dt>
              <dd>{{ formatDateTime(selectedUser.lastSignInAt) }}</dd>
            </div>
            <div>
              <dt>Provider</dt>
              <dd>{{ selectedUser.provider || "unknown" }}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{{ selectedUser.isAdmin ? "Admin" : "User" }}</dd>
            </div>
            <div>
              <dt>Password</dt>
              <dd>{{ selectedUser.hasPassword ? "Configured" : "Not set" }}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h3>Linked Player</h3>
          <div v-if="selectedUser.linkedPlayerDetails" class="detail-panel">
            <p><strong>Name:</strong> {{ selectedUser.linkedPlayerDetails.name }}</p>
            <p><strong>Player ID:</strong> {{ selectedUser.linkedPlayerDetails.playerId }}</p>
            <p><strong>Email:</strong> {{ selectedUser.linkedPlayerDetails.email || "No email" }}</p>
            <p>
              <strong>Preferred login:</strong>
              {{ selectedUser.linkedPlayerDetails.preferredLoginMethod }}
            </p>
          </div>
          <div v-else class="detail-panel empty">No player row linked to this auth user.</div>
        </div>
      </div>

      <div class="detail-grid metadata-grid">
        <div>
          <h3>App Metadata</h3>
          <pre class="metadata-block">{{ formatMetadata(selectedUser.metadata.appMetadata) }}</pre>
        </div>
        <div>
          <h3>User Metadata</h3>
          <pre class="metadata-block">{{ formatMetadata(selectedUser.metadata.userMetadata) }}</pre>
        </div>
      </div>
    </div>
  </AdminPageLayout>
</template>

<script setup lang="ts">
type AdminUserListItem = {
  id: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  isAdmin: boolean;
  hasPassword: boolean;
  provider: string | null;
  linkedPlayer: {
    id: string;
    playerId: string;
    name: string;
    email: string | null;
  } | null;
};

type AdminUserDetail = AdminUserListItem & {
  metadata: {
    appMetadata: Record<string, unknown>;
    userMetadata: Record<string, unknown>;
    bannedUntil: string | null;
  };
  linkedPlayerDetails:
    | {
        id: string;
        playerId: string;
        name: string;
        email: string | null;
        preferredLoginMethod: string;
        createdAt: string;
        updatedAt: string;
      }
    | null;
};

const items = ref<AdminUserListItem[]>([]);
const loading = ref(true);
const detailLoading = ref<string | null>(null);
const actionLoadingId = ref<string | null>(null);
const selectedUser = ref<AdminUserDetail | null>(null);
const searchTerm = ref("");
const roleFilter = ref("");
const feedbackMessage = ref("");
const feedbackType = ref<"success" | "error">("success");
const pagination = ref({ page: 1, limit: 20, total: 0, pages: 1 });

definePageMeta({
  layout: "default",
});

useHead({
  title: "Admin Users - PTCG Event Jams",
});

const loadUsers = async () => {
  loading.value = true;

  try {
    const response = await $fetch<{
      items: AdminUserListItem[];
      pagination: typeof pagination.value;
    }>("/api/admin/users", {
      query: {
        search: searchTerm.value || undefined,
        role: roleFilter.value || undefined,
        page: pagination.value.page,
        limit: pagination.value.limit,
      },
    });

    items.value = response.items;
    pagination.value = response.pagination;
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "statusMessage" in error
        ? String(error.statusMessage)
        : "Failed to load admin users";
    setFeedback(message, "error");
  } finally {
    loading.value = false;
  }
};

const selectUser = async (userId: string) => {
  detailLoading.value = userId;

  try {
    const response = await $fetch<{ user: AdminUserDetail }>(`/api/admin/users/${userId}`);
    selectedUser.value = response.user;
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "statusMessage" in error
        ? String(error.statusMessage)
        : "Failed to load user details";
    setFeedback(message, "error");
  } finally {
    detailLoading.value = null;
  }
};

const toggleRole = async (userId: string, isAdmin: boolean) => {
  actionLoadingId.value = userId;

  try {
    await $fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      body: { isAdmin },
    });
    setFeedback(isAdmin ? "Admin role granted" : "Admin role removed", "success");
    await Promise.all([loadUsers(), selectedUser.value?.id === userId ? selectUser(userId) : Promise.resolve()]);
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "statusMessage" in error
        ? String(error.statusMessage)
        : "Failed to update role";
    setFeedback(message, "error");
  } finally {
    actionLoadingId.value = null;
  }
};

const sendPasswordReset = async (userId: string) => {
  actionLoadingId.value = userId;

  try {
    const redirectTo =
      import.meta.client && window.location.origin
        ? `${window.location.origin}/set-password`
        : undefined;

    await $fetch(`/api/admin/users/${userId}/password-reset`, {
      method: "POST",
      body: { redirectTo },
    });
    setFeedback("Password reset email sent", "success");
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "statusMessage" in error
        ? String(error.statusMessage)
        : "Failed to send password reset email";
    setFeedback(message, "error");
  } finally {
    actionLoadingId.value = null;
  }
};

const changePage = async (page: number) => {
  pagination.value.page = page;
  await loadUsers();
};

const applyFilters = async () => {
  pagination.value.page = 1;
  await loadUsers();
};

const setFeedback = (message: string, type: "success" | "error") => {
  feedbackMessage.value = message;
  feedbackType.value = type;
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString();
};

const formatMetadata = (value: Record<string, unknown>) => {
  return JSON.stringify(value, null, 2);
};

await loadUsers();
</script>

<style scoped>
@import "~/assets/css/admin-shared.css";

.filters-card {
  margin-bottom: 0;
}

.filters-grid,
.detail-grid {
  display: grid;
  gap: 1rem;
}

.filters-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.results-summary {
  margin: 0;
  color: #64748b;
}

.primary-cell {
  font-weight: 600;
  color: #0f172a;
}

.secondary-cell {
  color: #64748b;
  font-size: 0.875rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.badge-admin {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge-user {
  background: #e2e8f0;
  color: #334155;
}

.badge-muted {
  background: #f1f5f9;
  color: #64748b;
}

.feedback {
  border-radius: 12px;
  padding: 0.9rem 1rem;
  font-weight: 600;
}

.feedback.success {
  background: #dcfce7;
  color: #166534;
}

.feedback.error {
  background: #fee2e2;
  color: #991b1b;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}

.pagination-status {
  color: #64748b;
}

.pagination-btn {
  border: 1px solid #cbd5e1;
  border-radius: 9999px;
  padding: 0.5rem 1rem;
  background: white;
}

.pagination-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.detail-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.detail-list {
  display: grid;
  gap: 0.75rem;
  margin: 0;
}

.detail-list dt {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}

.detail-list dd {
  margin: 0.15rem 0 0;
  color: #0f172a;
}

.detail-panel,
.metadata-block {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
}

.detail-panel.empty {
  color: #64748b;
}

.metadata-grid {
  margin-top: 1rem;
}

.metadata-block {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.85rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    Liberation Mono, Courier New, monospace;
}
</style>