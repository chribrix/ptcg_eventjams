<template>
  <AdminPageLayout
    title="Error Logs"
    subtitle="System error logs and authentication issues"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Error Logs</h1>
          <p class="mt-1 text-sm text-gray-600">
            System error logs and authentication issues
          </p>
        </div>
        <div class="flex items-center gap-3">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search errors, users, messages..."
            class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
            @keyup.enter="refreshLogs"
          />
          <select
            v-model="selectedErrorType"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Error Types</option>
            <option value="session_check_failed">Session Check Failed</option>
            <option value="session_deployment_invalidated">
              Deployment Invalidated
            </option>
            <option value="token_refresh_failed">Token Refresh Failed</option>
            <option value="token_refresh_exception">
              Token Refresh Exception
            </option>
            <option value="session_validation_exception">
              Session Validation Exception
            </option>
            <option value="magic_login">Magic Login Errors</option>
            <option value="registration">Registration Errors</option>
            <option value="api_error">API Errors</option>
            <option value="database_error">Database Errors</option>
            <option value="auth_error">Auth Errors</option>
            <option value="validation_error">Validation Errors</option>
          </select>
          <button
            @click="refreshLogs"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
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

      <!-- Error Logs Table -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
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
                Error Type
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
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="log in errorLogs" :key="log.id" class="hover:bg-gray-50">
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
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button
                  @click="selectedLog = log"
                  class="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Details
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="pagination.totalPages > 1"
        class="mt-6 flex justify-center gap-2"
      >
        <button
          v-for="page in pagination.totalPages"
          :key="page"
          @click="currentPage = page"
          :class="[
            'px-4 py-2 rounded-lg transition-colors',
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
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click="selectedLog = null"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <div class="p-6">
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
  if (errorType.includes("session")) {
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
  } else if (errorType.includes("database")) {
    return "bg-red-100 text-red-800";
  } else if (errorType.includes("validation")) {
    return "bg-yellow-100 text-yellow-800";
  } else if (errorType.includes("auth")) {
    return "bg-orange-100 text-orange-800";
  }
  return "bg-gray-100 text-gray-800";
};

watch([currentPage, selectedErrorType], () => {
  fetchLogs();
});

onMounted(() => {
  fetchLogs();
});
</script>
