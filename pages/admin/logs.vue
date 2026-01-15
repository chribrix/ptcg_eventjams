<template>
  <AdminPageLayout
    title="System Logs"
    subtitle="Error logs, authentication events, and system information"
  >
    <template #actions>
      <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
        <div class="relative w-full sm:w-auto">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search errors, users, messages..."
            class="px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-full sm:w-80"
            @keyup.enter="refreshLogs"
          />
          <button
            v-if="searchQuery"
            @click="
              searchQuery = '';
              refreshLogs();
            "
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Clear search"
          >
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>
        <select
          v-model="selectedErrorType"
          class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-full sm:w-auto sm:min-w-[200px]"
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
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
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
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors w-full sm:w-auto"
          title="Clear all filters"
        >
          Clear Filters
        </button>
      </div>
    </template>

    <div v-if="loading" class="text-center py-12">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
      ></div>
      <p class="mt-2 text-gray-600">Loading error logs...</p>
    </div>

    <div
      v-else-if="error"
      class="bg-red-50 border border-red-200 rounded-lg p-4"
    >
      <p class="text-red-800">{{ error }}</p>
    </div>

    <div v-else>
      <!-- Active Filters Display -->
      <div
        v-if="searchQuery || selectedErrorType"
        class="mb-4 flex items-center gap-2 flex-wrap"
      >
        <span class="text-sm text-gray-600 font-medium">Active filters:</span>
        <span
          v-if="searchQuery"
          class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
        >
          Search: "{{ searchQuery }}"
          <button
            @click="
              searchQuery = '';
              refreshLogs();
            "
            class="hover:text-blue-900"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </span>
        <span
          v-if="selectedErrorType"
          class="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
        >
          Type: {{ getFilterLabel(selectedErrorType) }}
          <button
            @click="
              selectedErrorType = '';
              refreshLogs();
            "
            class="hover:text-purple-900"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </span>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-600">Total Errors</div>
          <div class="text-2xl font-bold text-gray-900">
            {{ pagination.total }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-600">Session Errors</div>
          <div class="text-2xl font-bold text-orange-600">
            {{
              errorLogs.filter((l) => l.errorType.includes("session")).length
            }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-600">Token Errors</div>
          <div class="text-2xl font-bold text-red-600">
            {{ errorLogs.filter((l) => l.errorType.includes("token")).length }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-600">Today's Errors</div>
          <div class="text-2xl font-bold text-blue-600">
            {{ errorLogs.filter((l) => isToday(new Date(l.createdAt))).length }}
          </div>
        </div>
      </div>

      <!-- Error Logs Table - Desktop -->
      <div class="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Timestamp
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Log Type
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  User
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Message
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="log in errorLogs"
                :key="log.id"
                class="hover:bg-gray-50 cursor-pointer transition-colors"
                @click="selectedLog = log"
              >
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ formatDate(log.createdAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    :class="[
                      'px-2 py-1 text-xs font-medium rounded-full',
                      getErrorTypeColor(log.errorType),
                    ]"
                  >
                    {{ log.errorType }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <div v-if="log.userEmail" class="text-gray-900">
                    {{ log.userEmail }}
                  </div>
                  <div v-if="log.userId" class="text-gray-500 text-xs">
                    {{ log.userId.slice(0, 8) }}...
                  </div>
                  <div v-else class="text-gray-400 italic">Anonymous</div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
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
          class="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
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
            <span class="text-xs text-gray-500 whitespace-nowrap">
              {{ formatDate(log.createdAt).split(',')[0] }}
            </span>
          </div>
          <div class="mb-2">
            <div v-if="log.userEmail" class="text-sm font-medium text-gray-900">
              {{ log.userEmail }}
            </div>
            <div v-else class="text-sm text-gray-400 italic">Anonymous</div>
          </div>
          <p class="text-sm text-gray-700 line-clamp-2">
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
            'px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm',
            currentPage === page
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100',
          ]"
        >
          {{ page }}
        </button>
      </div>
    </div>

    <!-- Detail Modal -->
    <div
      v-if="selectedLog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      @click="selectedLog = null"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <div class="p-4 sm:p-6">
          <div class="flex items-start justify-between mb-4">
            <h2 class="text-xl font-bold text-gray-900">Error Details</h2>
            <button
              @click="selectedLog = null"
              class="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="text-sm font-medium text-gray-700">Timestamp</label>
              <p class="mt-1 text-gray-900">
                {{ formatDate(selectedLog.createdAt) }}
              </p>
            </div>

            <div>
              <label class="text-sm font-medium text-gray-700"
                >Error Type</label
              >
              <p class="mt-1">
                <span
                  :class="[
                    'px-2 py-1 text-xs font-medium rounded-full',
                    getErrorTypeColor(selectedLog.errorType),
                  ]"
                >
                  {{ selectedLog.errorType }}
                </span>
              </p>
            </div>

            <div>
              <label class="text-sm font-medium text-gray-700">User</label>
              <p class="mt-1 text-gray-900">
                {{ selectedLog.userEmail || "Anonymous" }}
              </p>
              <p v-if="selectedLog.userId" class="text-sm text-gray-500">
                ID: {{ selectedLog.userId }}
              </p>
            </div>

            <div>
              <label class="text-sm font-medium text-gray-700"
                >Error Message</label
              >
              <p class="mt-1 text-gray-900">{{ selectedLog.errorMessage }}</p>
            </div>

            <div v-if="selectedLog.url">
              <label class="text-sm font-medium text-gray-700">URL</label>
              <p class="mt-1 text-blue-600 text-sm break-all">
                {{ selectedLog.url }}
              </p>
            </div>

            <div v-if="selectedLog.userAgent">
              <label class="text-sm font-medium text-gray-700"
                >User Agent</label
              >
              <p class="mt-1 text-gray-700 text-sm">
                {{ selectedLog.userAgent }}
              </p>
            </div>

            <div v-if="selectedLog.ipAddress">
              <label class="text-sm font-medium text-gray-700"
                >IP Address</label
              >
              <p class="mt-1 text-gray-900">{{ selectedLog.ipAddress }}</p>
            </div>

            <div v-if="selectedLog.cookies">
              <label class="text-sm font-medium text-gray-700">Cookies</label>
              <pre
                class="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto"
                >{{ JSON.stringify(selectedLog.cookies, null, 2) }}</pre
              >
            </div>

            <div v-if="selectedLog.metadata">
              <label class="text-sm font-medium text-gray-700">Metadata</label>
              <pre
                class="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto"
                >{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre
              >
            </div>

            <div v-if="selectedLog.stackTrace">
              <label class="text-sm font-medium text-gray-700"
                >Stack Trace</label
              >
              <pre
                class="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto font-mono"
                >{{ selectedLog.stackTrace }}</pre
              >
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <button
              @click="selectedLog = null"
              class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
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
    return "bg-yellow-100 text-yellow-800 border border-yellow-300";
  } else if (errorType.includes("session")) {
    return "bg-orange-100 text-orange-800";
  } else if (errorType.includes("token")) {
    return "bg-red-100 text-red-800";
  } else if (errorType.includes("deployment")) {
    return "bg-blue-100 text-blue-800";
  } else if (
    errorType.includes("magic_login") ||
    errorType.includes("registration")
  ) {
    return "bg-purple-100 text-purple-800";
  } else if (errorType.includes("webhook")) {
    return "bg-indigo-100 text-indigo-800";
  } else if (errorType.includes("database")) {
    return "bg-red-100 text-red-800";
  } else if (errorType.includes("validation")) {
    return "bg-yellow-100 text-yellow-800";
  } else if (errorType.includes("auth")) {
    return "bg-orange-100 text-orange-800";
  } else if (errorType.startsWith("info_")) {
    return "bg-green-100 text-green-800";
  }
  return "bg-gray-100 text-gray-800";
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
