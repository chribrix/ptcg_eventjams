<template>
  <AdminPageLayout
    title="Benutzerverwaltung"
    subtitle="Konten, verknüpfte Spieler, Adminrollen und Passwortaktionen verwalten"
  >
    <template #actions>
      <button class="btn btn-secondary" :disabled="loading" @click="loadUsers">
        Aktualisieren
      </button>
    </template>

    <AppPanel compact>
      <div class="filters-grid">
        <AppSearchField
          v-model="searchTerm"
          label="Suche"
          placeholder="E-Mail, Name, Provider oder Spieler-ID"
          @submit="applyFilters"
        />

        <AppFormField label="Rolle" for-id="user-role-filter">
          <select
            id="user-role-filter"
            v-model="roleFilter"
            class="form-input"
            @change="applyFilters"
          >
            <option value="">Alle Benutzer</option>
            <option value="admin">Admins</option>
            <option value="user">Benutzer ohne Adminrolle</option>
            <option value="unlinked">Nicht verknüpft</option>
          </select>
        </AppFormField>
      </div>
    </AppPanel>

    <div v-if="feedbackMessage" :class="['feedback', feedbackType]">
      {{ feedbackMessage }}
    </div>

    <AppPanel title="Auth-Benutzer" flush>
      <template #actions>
        <p class="results-summary">{{ pagination.total }} Benutzer</p>
      </template>

      <AppStatePanel v-if="loading" kind="loading" message="Benutzer werden geladen …" />
      <AppStatePanel
        v-else-if="items.length === 0"
        kind="empty"
        title="Keine Benutzer gefunden"
        message="Für die aktuellen Filter gibt es keine Treffer."
      />
      <AppDataTable v-else>
          <thead>
            <tr>
              <th>Email</th>
              <th>Verknüpfter Spieler</th>
              <th>Rolle</th>
              <th>Passwort</th>
              <th>Letzte Anmeldung</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>
                <div class="primary-cell">{{ item.email || "No email" }}</div>
                <div class="secondary-cell">
                  {{ item.provider || "unknown provider" }}
                </div>
              </td>
              <td>
                <div v-if="item.linkedPlayer">
                  <div class="primary-cell">{{ item.linkedPlayer.name }}</div>
                  <div class="secondary-cell">
                    {{ item.linkedPlayer.playerId }}
                  </div>
                </div>
                <span v-else class="badge badge-muted">Unlinked</span>
              </td>
              <td>
                <span
                  :class="[
                    'badge',
                    item.isAdmin ? 'badge-admin' : 'badge-user',
                  ]"
                >
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
                    Details
                  </button>
                  <button
                    class="btn btn-small"
                    :class="item.isAdmin ? 'btn-warning' : 'btn-primary'"
                    :disabled="actionLoadingId === item.id"
                    @click="toggleRole(item.id, !item.isAdmin)"
                  >
                    {{ item.isAdmin ? "Admin entfernen" : "Zum Admin machen" }}
                  </button>
                  <button
                    class="btn btn-small btn-info"
                    :disabled="actionLoadingId === item.id || !item.email"
                    @click="sendPasswordReset(item.id)"
                  >
                    Passwort zurücksetzen
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
      </AppDataTable>

      <template v-if="pagination.pages > 1" #footer>
        <AppPagination
          :page="pagination.page"
          :pages="pagination.pages"
          @change="changePage"
        />
      </template>
    </AppPanel>

    <AppPanel v-if="selectedUser" title="Benutzerdetails">
      <template #actions>
        <button
          class="btn btn-secondary btn-small"
          @click="selectedUser = null"
        >
          Schließen
        </button>
      </template>

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
            <p>
              <strong>Name:</strong> {{ selectedUser.linkedPlayerDetails.name }}
            </p>
            <p>
              <strong>Player ID:</strong>
              {{ selectedUser.linkedPlayerDetails.playerId }}
            </p>
            <p>
              <strong>Email:</strong>
              {{ selectedUser.linkedPlayerDetails.email || "No email" }}
            </p>
            <p>
              <strong>Preferred login:</strong>
              {{ selectedUser.linkedPlayerDetails.preferredLoginMethod }}
            </p>
          </div>
          <div v-else class="detail-panel empty">
            No player row linked to this auth user.
          </div>
        </div>
      </div>

      <div class="detail-grid metadata-grid">
        <div>
          <h3>Account Actions</h3>
          <div class="detail-panel">
            <p>
              Send a reset email or set a temporary password that you can share
              with the user directly.
            </p>
            <div class="action-buttons detail-actions">
              <button
                class="btn btn-small btn-info"
                :disabled="actionLoadingId === selectedUser.id || !selectedUser.email"
                @click="sendPasswordReset(selectedUser.id)"
              >
                Send Reset Email
              </button>
            </div>
            <div class="manual-password-form">
              <AppFormField label="Temporäres Passwort" for-id="manual-password">
                <input
                  id="manual-password"
                  v-model="manualPassword"
                  type="password"
                  class="form-input"
                  placeholder="Mindestens 8 Zeichen"
                />
              </AppFormField>
              <AppFormField label="Passwort wiederholen" for-id="manual-password-confirm">
                <input
                  id="manual-password-confirm"
                  v-model="manualPasswordConfirm"
                  type="password"
                  class="form-input"
                  placeholder="Passwort wiederholen"
                />
              </AppFormField>
              <button
                class="btn btn-small btn-primary"
                :disabled="
                  actionLoadingId === selectedUser.id ||
                  manualPassword.length < 8 ||
                  manualPassword !== manualPasswordConfirm
                "
                @click="setManualPassword(selectedUser.id)"
              >
                Set Password Directly
              </button>
            </div>
          </div>
        </div>
        <div>
          <h3>App Metadata</h3>
          <pre class="metadata-block">{{
            formatMetadata(selectedUser.metadata.appMetadata)
          }}</pre>
        </div>
        <div>
          <h3>User Metadata</h3>
          <pre class="metadata-block">{{
            formatMetadata(selectedUser.metadata.userMetadata)
          }}</pre>
        </div>
      </div>
    </AppPanel>
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
  linkedPlayerDetails: {
    id: string;
    playerId: string;
    name: string;
    email: string | null;
    preferredLoginMethod: string;
    createdAt: string;
    updatedAt: string;
  } | null;
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
const manualPassword = ref("");
const manualPasswordConfirm = ref("");

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
    const response = await $fetch<{ user: AdminUserDetail }>(
      `/api/admin/users/${userId}`,
    );
    selectedUser.value = response.user;
    manualPassword.value = "";
    manualPasswordConfirm.value = "";
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
    setFeedback(
      isAdmin ? "Admin role granted" : "Admin role removed",
      "success",
    );
    await Promise.all([
      loadUsers(),
      selectedUser.value?.id === userId
        ? selectUser(userId)
        : Promise.resolve(),
    ]);
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

const setManualPassword = async (userId: string) => {
  if (manualPassword.value.length < 8) {
    setFeedback("Password must be at least 8 characters", "error");
    return;
  }

  if (manualPassword.value !== manualPasswordConfirm.value) {
    setFeedback("Passwords do not match", "error");
    return;
  }

  actionLoadingId.value = userId;

  try {
    await $fetch(`/api/admin/users/${userId}/password-reset`, {
      method: "POST",
      body: { password: manualPassword.value },
    });
    manualPassword.value = "";
    manualPasswordConfirm.value = "";
    setFeedback("Password set directly for user", "success");
    await Promise.all([
      loadUsers(),
      selectedUser.value?.id === userId
        ? selectUser(userId)
        : Promise.resolve(),
    ]);
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "statusMessage" in error
        ? String(error.statusMessage)
        : "Failed to set password";
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
  align-items: end;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: var(--app-text-secondary);
  font-size: 0.78rem;
  font-weight: 650;
}

.filter-field .form-input {
  min-height: 2.75rem;
}

.results-summary {
  margin: 0;
  color: var(--app-text-muted);
}

.primary-cell {
  font-weight: 600;
  color: var(--app-text-primary);
}

.secondary-cell {
  color: var(--app-text-muted);
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
  background: var(--app-badge-info-bg);
  color: var(--app-badge-info-text);
}

.badge-user {
  background: var(--app-surface-2);
  color: var(--app-text-secondary);
}

.badge-muted {
  background: var(--app-surface-1);
  color: var(--app-text-muted);
}

.feedback {
  border-radius: 12px;
  padding: 0.9rem 1rem;
  font-weight: 600;
}

.feedback.success {
  background: var(--app-feedback-success-bg);
  color: var(--app-feedback-success-text);
}

.feedback.error {
  background: var(--app-feedback-error-bg);
  color: var(--app-feedback-error-text);
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}

.pagination-status {
  color: var(--app-text-muted);
}

.pagination-btn {
  border: 1px solid var(--app-border);
  border-radius: 9999px;
  padding: 0.5rem 1rem;
  background: var(--app-surface-1);
  color: var(--app-text-secondary);
}

.pagination-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.detail-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.detail-actions {
  margin-top: 1rem;
}

.manual-password-form {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
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
  color: var(--app-text-muted);
}

.detail-list dd {
  margin: 0.15rem 0 0;
  color: var(--app-text-primary);
}

.detail-panel,
.metadata-block {
  background: var(--app-surface-0);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 1rem;
}

.detail-panel.empty {
  color: var(--app-text-muted);
}

.metadata-grid {
  margin-top: 1rem;
}

.metadata-block {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.85rem;
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    Liberation Mono,
    Courier New,
    monospace;
}
</style>
