<template>
  <AdminPageLayout
    title="System Logs"
    subtitle="Error logs, authentication events, and system information"
  >
    <template #actions>
      <div class="logs-toolbar">
        <div class="logs-search-wrap">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search errors, users, messages..."
            class="form-input logs-search-input"
            @keyup.enter="refreshLogs"
          />
          <button
            v-if="searchQuery"
            @click="
              searchQuery = '';
              refreshLogs();
            "
            class="logs-search-clear"
            title="Clear search"
          >
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>
        <select
          v-model="selectedErrorType"
          class="form-input logs-filter-select"
          @change="refreshLogs"
        >
          <option value="">All Logs</option>
          <optgroup label="System">
            <option value="account_mismatch">🔗 Account Mismatch</option>
            <option value="session_check_failed">
              🔒 Session Check Failed
            </option>
            <option value="session_deployment_invalidated">
              🚀 Deployment Invalidated
            </option>
            <option value="token_refresh">🔑 Token Refresh</option>
            <option value="session_validation">✓ Session Validation</option>
          </optgroup>
          <optgroup label="Authentication">
            <option value="magic_login">✉️ Magic Login</option>
            <option value="registration">📝 Registration</option>
            <option value="login">🔐 Login</option>
            <option value="auth_error">❌ Auth Errors</option>
          </optgroup>
          <optgroup label="Application">
            <option value="api_error">🌐 API Errors</option>
            <option value="database">💾 Database Errors</option>
            <option value="validation">⚠️ Validation Errors</option>
            <option value="webhook">🔔 Webhook</option>
          </optgroup>
          <optgroup label="Info Logs">
            <option value="info_">✅ All Info Logs</option>
          </optgroup>
        </select>
        <button
          @click="refreshLogs"
          class="btn btn-primary logs-toolbar-button"
          title="Refresh logs"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="hidden sm:inline">Refresh</span>
        </button>
        <button
          v-if="searchQuery || selectedErrorType"
          @click="
            searchQuery = '';
            selectedErrorType = '';
            refreshLogs();
          "
          class="btn btn-secondary logs-toolbar-button"
          title="Clear all filters"
        >
          Clear Filters
        </button>
      </div>
    </template>

    <div v-if="loading" class="admin-card">
      <div class="text-center py-12">
        <div
          class="logs-loading-spinner inline-block h-8 w-8 animate-spin rounded-full border-b-2"
        ></div>
        <p class="mt-2 logs-muted-text">Loading error logs...</p>
      </div>
    </div>

    <div
      v-else-if="error"
      class="admin-card logs-error-card"
    >
      <p>{{ error }}</p>
    </div>

    <div v-else>
      <!-- Active Filters Display -->
      <div
        v-if="searchQuery || selectedErrorType"
        class="admin-card logs-active-filters"
      >
        <span class="logs-filter-label">Active filters:</span>
        <span
          v-if="searchQuery"
          class="logs-filter-chip logs-filter-chip-search"
        >
          Search: "{{ searchQuery }}"
          <button
            @click="
              searchQuery = '';
              refreshLogs();
            "
            class="logs-filter-chip-button"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </span>
        <span
          v-if="selectedErrorType"
          class="logs-filter-chip logs-filter-chip-type"
        >
          Type: {{ getFilterLabel(selectedErrorType) }}
          <button
            @click="
              selectedErrorType = '';
              refreshLogs();
            "
            class="logs-filter-chip-button"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </span>
      </div>

      <!-- Stats -->
      <div class="stats-grid logs-stats-grid mb-6">
        <div class="stat-card">
          <div class="stat-content">
          <div class="logs-stat-label">Total Errors</div>
          <div class="text-2xl font-bold logs-stat-value">
            {{ pagination.total }}
          </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-content">
          <div class="logs-stat-label">Session Errors</div>
          <div class="logs-stat-value logs-stat-value-warning text-2xl font-bold">
            {{
              errorLogs.filter((l) => l.errorType.includes("session")).length
            }}
          </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-content">
          <div class="logs-stat-label">Token Errors</div>
          <div class="logs-stat-value logs-stat-value-error text-2xl font-bold">
            {{ errorLogs.filter((l) => l.errorType.includes("token")).length }}
          </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-content">
          <div class="logs-stat-label">Today's Errors</div>
          <div class="logs-stat-value logs-stat-value-info text-2xl font-bold">
            {{ errorLogs.filter((l) => isToday(new Date(l.createdAt))).length }}
          </div>
          </div>
        </div>
      </div>

      <!-- Error Logs Table - Desktop -->
      <div class="hidden md:block admin-card logs-table-card">
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>
                  Timestamp
                </th>
                <th>
                  Log Type
                </th>
                <th>
                  User
                </th>
                <th>
                  Message
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="log in errorLogs"
                :key="log.id"
                class="logs-table-row"
                @click="selectedLog = log"
              >
                <td class="logs-cell-nowrap">
                  {{ formatDate(log.createdAt) }}
                </td>
                <td class="logs-cell-nowrap">
                  <span
                    :class="[
                      'logs-type-pill',
                      getErrorTypeColor(log.errorType),
                    ]"
                  >
                    {{ log.errorType }}
                  </span>
                </td>
                <td class="logs-cell-nowrap">
                  <div v-if="log.userEmail" class="logs-primary-text">
                    {{ log.userEmail }}
                  </div>
                  <div v-if="log.userId" class="logs-secondary-text">
                    {{ log.userId.slice(0, 8) }}...
                  </div>
                  <div v-else class="logs-secondary-text italic">Anonymous</div>
                </td>
                <td class="logs-message-cell">
                  {{ log.errorMessage }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Error Logs Cards - Mobile -->
      <div class="md:hidden space-y-3">
        <div
          v-for="log in errorLogs"
          :key="log.id"
          class="admin-card log-mobile-card"
          @click="selectedLog = log"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <span
              :class="[
                'px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap',
                getErrorTypeColor(log.errorType),
              ]"
            >
              {{ log.errorType }}
            </span>
            <span class="logs-secondary-text whitespace-nowrap">
              {{ formatDate(log.createdAt).split(",")[0] }}
            </span>
          </div>
          <div class="mb-2">
            <div v-if="log.userEmail" class="logs-primary-text">
              {{ log.userEmail }}
            </div>
            <div v-else class="logs-secondary-text italic">Anonymous</div>
          </div>
          <p class="logs-card-message line-clamp-2">
            {{ log.errorMessage }}
          </p>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="pagination.totalPages > 1"
        class="mt-6 flex justify-center gap-1 sm:gap-2 flex-wrap"
      >
        <button
          v-for="page in pagination.totalPages"
          :key="page"
          @click="currentPage = page"
          :class="[
            'logs-pagination-page',
            currentPage === page
              ? 'logs-pagination-page-active'
              : 'logs-pagination-page-idle',
          ]"
        >
          {{ page }}
        </button>
      </div>
    </div>

    <!-- Detail Modal -->
    <div
      v-if="selectedLog"
      class="modal-overlay"
      @click="selectedLog = null"
    >
      <div
        class="modal-content logs-detail-modal"
        @click.stop
      >
        <div class="p-4 sm:p-6">
          <div class="flex items-start justify-between mb-4">
            <h2 class="text-xl font-bold logs-modal-title">Error Details</h2>
            <button
              @click="selectedLog = null"
              class="logs-modal-close"
            >
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="logs-modal-label">Timestamp</label>
              <p class="mt-1 logs-primary-text">
                {{ formatDate(selectedLog.createdAt) }}
              </p>
            </div>

            <div>
              <label class="logs-modal-label">Error Type</label>
              <p class="mt-1">
                <span
                  :class="[
                    'logs-type-pill',
                    getErrorTypeColor(selectedLog.errorType),
                  ]"
                >
                  {{ selectedLog.errorType }}
                </span>
              </p>
            </div>

            <div>
              <label class="logs-modal-label">User</label>
              <p class="mt-1 logs-primary-text">
                {{ selectedLog.userEmail || "Anonymous" }}
              </p>
              <p v-if="selectedLog.userId" class="logs-secondary-text">
                ID: {{ selectedLog.userId }}
              </p>
            </div>

            <div>
              <label class="logs-modal-label">Error Message</label>
              <p class="mt-1 logs-primary-text">{{ selectedLog.errorMessage }}</p>
            </div>

            <div v-if="selectedLog.url">
              <label class="logs-modal-label">URL</label>
              <p class="mt-1 logs-link-text break-all">
                {{ selectedLog.url }}
              </p>
            </div>

            <div v-if="selectedLog.userAgent">
              <label class="logs-modal-label">User Agent</label>
              <p class="mt-1 logs-muted-text text-sm">
                {{ selectedLog.userAgent }}
              </p>
            </div>

            <div v-if="selectedLog.ipAddress">
              <label class="logs-modal-label">IP Address</label>
              <p class="mt-1 logs-primary-text">{{ selectedLog.ipAddress }}</p>
            </div>

            <div v-if="selectedLog.cookies">
              <label class="logs-modal-label">Cookies</label>
              <pre class="logs-code-block">{{ JSON.stringify(selectedLog.cookies, null, 2) }}</pre>
            </div>

            <div v-if="selectedLog.metadata">
              <label class="logs-modal-label">Metadata</label>
              <pre class="logs-code-block">{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
            </div>

            <div v-if="selectedLog.stackTrace">
              <label class="logs-modal-label">Stack Trace</label>
              <pre class="logs-code-block logs-code-block-mono">{{ selectedLog.stackTrace }}</pre>
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <button
              @click="selectedLog = null"
              class="btn btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminPageLayout>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";

// Remove definePageMeta since middleware prop doesn't work with string arrays
// The auth and admin checks will happen via the global middleware

const loading = ref(true);
const error = ref("");
const errorLogs = ref<any[]>([]);
const pagination = ref({
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 0,
});
const currentPage = ref(1);
const selectedErrorType = ref("");
const searchQuery = ref("");
const selectedLog = ref<any>(null);

const fetchLogs = async () => {
  loading.value = true;
  error.value = "";

  try {
    const params: any = {
      page: currentPage.value,
      limit: pagination.value.limit,
    };

    if (selectedErrorType.value) {
      params.errorType = selectedErrorType.value;
    }

    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim();
    }

    const response = await $fetch("/api/admin/error-logs", {
      params,
    });

    errorLogs.value = response.errorLogs;
    pagination.value = response.pagination;
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to load error logs";
    console.error("Failed to fetch error logs:", err);
  } finally {
    loading.value = false;
  }
};

const refreshLogs = () => {
  currentPage.value = 1;
  fetchLogs();
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const isToday = (date: Date) => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

const getErrorTypeColor = (errorType: string) => {
  if (errorType.includes("account_mismatch")) {
    return "logs-type-warning";
  } else if (errorType.includes("session")) {
    return "logs-type-warning";
  } else if (errorType.includes("token")) {
    return "logs-type-error";
  } else if (errorType.includes("deployment")) {
    return "logs-type-info";
  } else if (
    errorType.includes("magic_login") ||
    errorType.includes("registration")
  ) {
    return "logs-type-accent";
  } else if (errorType.includes("webhook")) {
    return "logs-type-accent";
  } else if (errorType.includes("database")) {
    return "logs-type-error";
  } else if (errorType.includes("validation")) {
    return "logs-type-warning";
  } else if (errorType.includes("auth")) {
    return "logs-type-warning";
  } else if (errorType.startsWith("info_")) {
    return "logs-type-success";
  }
  return "logs-type-neutral";
};

const getFilterLabel = (filterValue: string) => {
  const labels: Record<string, string> = {
    account_mismatch: "Account Mismatch",
    session_check_failed: "Session Check Failed",
    session_deployment_invalidated: "Deployment Invalidated",
    token_refresh: "Token Refresh",
    session_validation: "Session Validation",
    magic_login: "Magic Login",
    registration: "Registration",
    login: "Login",
    auth_error: "Auth Errors",
    api_error: "API Errors",
    database: "Database Errors",
    validation: "Validation Errors",
    webhook: "Webhook",
    info_: "Info Logs",
  };
  return labels[filterValue] || filterValue;
};

watch([currentPage, selectedErrorType], () => {
  fetchLogs();
});

onMounted(() => {
  fetchLogs();
});
</script>

<style scoped>
@import "~/assets/css/admin-shared.css";

.logs-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.logs-search-wrap {
  position: relative;
  width: 100%;
}

.logs-search-input {
  padding-right: 2.75rem;
}

.logs-search-clear {
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--app-text-muted);
}

.logs-search-clear:hover,
.logs-modal-close:hover {
  color: var(--app-text-primary);
}

.logs-filter-select {
  min-width: 220px;
}

.logs-toolbar-button {
  justify-content: center;
}

.logs-muted-text {
  color: var(--app-text-muted);
}

.logs-primary-text {
  color: var(--app-text-primary);
  font-weight: 500;
}

.logs-secondary-text {
  color: var(--app-text-muted);
  font-size: 0.8rem;
}

.logs-error-card {
  border-color: var(--app-feedback-error-border);
  background: var(--app-feedback-error-bg);
  color: var(--app-feedback-error-text);
}

.logs-active-filters {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.logs-filter-label {
  color: var(--app-text-secondary);
  font-size: 0.9rem;
  font-weight: 600;
}

.logs-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  font-size: 0.85rem;
}

.logs-filter-chip-search {
  background: var(--app-badge-info-bg);
  color: var(--app-badge-info-text);
}

.logs-filter-chip-type {
  background: var(--app-surface-2);
  color: var(--app-text-secondary);
}

.logs-filter-chip-button {
  color: inherit;
  transition: opacity 0.2s ease;
}

.logs-filter-chip-button:hover {
  opacity: 0.8;
}

.logs-stats-grid {
  gap: 1rem;
}

.logs-stat-label {
  color: var(--app-text-muted);
  font-size: 0.85rem;
  margin-bottom: 0.35rem;
}

.logs-stat-value {
  color: var(--app-text-primary);
}

.logs-stat-value-info {
  color: var(--app-badge-info-text);
}

.logs-stat-value-warning {
  color: var(--app-badge-warning-text);
}

.logs-stat-value-error {
  color: var(--app-badge-error-text);
}

.logs-table-card {
  padding: 0;
  overflow: hidden;
}

.logs-table-row {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.logs-cell-nowrap {
  white-space: nowrap;
}

.logs-message-cell {
  max-width: 32rem;
  color: var(--app-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logs-type-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.logs-type-info {
  background: var(--app-badge-info-bg);
  color: var(--app-badge-info-text);
}

.logs-type-success {
  background: var(--app-badge-success-bg);
  color: var(--app-badge-success-text);
}

.logs-type-warning {
  background: var(--app-badge-warning-bg);
  color: var(--app-badge-warning-text);
}

.logs-type-error {
  background: var(--app-badge-error-bg);
  color: var(--app-badge-error-text);
}

.logs-type-accent {
  background: var(--app-surface-2);
  color: var(--app-accent-soft);
}

.logs-type-neutral {
  background: var(--app-surface-2);
  color: var(--app-text-secondary);
}

.log-mobile-card {
  cursor: pointer;
}

.logs-card-message {
  color: var(--app-text-secondary);
  font-size: 0.9rem;
}

.logs-pagination-page {
  padding: 0.55rem 0.9rem;
  border-radius: 10px;
  transition: all 0.2s;
  font-size: 0.9rem;
  border: 1px solid var(--app-border);
}

.logs-pagination-page-active {
  background: var(--app-surface-3);
  color: var(--app-text-primary);
  border-color: var(--app-accent);
}

.logs-pagination-page-idle {
  background: var(--app-surface-1);
  color: var(--app-text-secondary);
}

.logs-pagination-page-idle:hover {
  background: var(--app-surface-2);
}

.logs-detail-modal {
  max-width: 64rem;
}

.logs-modal-title {
  color: var(--app-text-primary);
}

.logs-modal-close {
  color: var(--app-text-muted);
}

.logs-modal-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--app-text-muted);
}

.logs-link-text {
  color: var(--app-accent-soft);
  font-size: 0.9rem;
}

.logs-code-block {
  margin-top: 0.35rem;
  padding: 0.9rem 1rem;
  background: var(--app-surface-0);
  border: 1px solid var(--app-border);
  border-radius: 14px;
  color: var(--app-text-secondary);
  font-size: 0.78rem;
  overflow-x: auto;
}

.logs-loading-spinner {
  border-color: var(--app-border);
  border-bottom-color: var(--app-button-blue);
}

.logs-code-block-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

@media (min-width: 640px) {
  .logs-search-wrap {
    width: auto;
    min-width: 320px;
  }
}
</style>
