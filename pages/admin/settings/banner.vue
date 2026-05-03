<template>
  <AdminPageLayout
    title="Landing Banner"
    subtitle="Manage the public landing-page information banner from one persisted settings record"
  >
    <template #actions>
      <button class="btn btn-secondary" :disabled="loading" @click="loadBanner">
        Reload
      </button>
      <button class="btn btn-primary" :disabled="saving" @click="saveBanner">
        {{ saving ? "Saving..." : "Save Banner" }}
      </button>
    </template>

    <div v-if="message" :class="['feedback', messageType]">
      {{ message }}
    </div>

    <div class="settings-grid">
      <div class="admin-card">
        <div class="section-header">
          <h2>Banner Settings</h2>
        </div>

        <div v-if="loading" class="loading">Loading banner settings...</div>
        <form v-else class="banner-form" @submit.prevent="saveBanner">
          <label class="checkbox-row">
            <input v-model="form.enabled" type="checkbox" />
            <span>Banner enabled</span>
          </label>

          <label class="form-group">
            <span>Severity</span>
            <select v-model="form.severity" class="form-input">
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
          </label>

          <label class="form-group">
            <span>Title</span>
            <input
              v-model="form.title"
              type="text"
              class="form-input"
              placeholder="Banner headline"
            />
          </label>

          <label class="form-group">
            <span>Body</span>
            <textarea
              v-model="form.body"
              rows="4"
              class="form-input"
              placeholder="Explain the announcement shown on the homepage"
            />
          </label>

          <div class="form-row">
            <label class="form-group">
              <span>CTA Label</span>
              <input
                v-model="form.ctaLabel"
                type="text"
                class="form-input"
                placeholder="Learn more"
              />
            </label>
            <label class="form-group">
              <span>CTA Link</span>
              <input
                v-model="form.ctaHref"
                type="text"
                class="form-input"
                placeholder="/about"
              />
            </label>
          </div>

          <div class="form-row">
            <label class="form-group">
              <span>Starts At</span>
              <input
                v-model="form.startsAt"
                type="datetime-local"
                class="form-input"
              />
            </label>
            <label class="form-group">
              <span>Ends At</span>
              <input
                v-model="form.endsAt"
                type="datetime-local"
                class="form-input"
              />
            </label>
          </div>
        </form>
      </div>

      <div class="admin-card preview-card">
        <div class="section-header">
          <h2>Preview</h2>
          <p class="preview-meta">
            Last updated {{ formatDateTime(updatedAt) }}
          </p>
        </div>

        <div :class="['preview-banner', `preview-banner--${form.severity}`]">
          <div class="preview-banner__icon">!</div>
          <div class="preview-banner__content">
            <h3>{{ form.title || "No title configured" }}</h3>
            <p>{{ form.body || "No body text configured" }}</p>
            <a
              v-if="form.ctaLabel && form.ctaHref"
              :href="form.ctaHref"
              class="preview-banner__cta"
            >
              {{ form.ctaLabel }}
            </a>
          </div>
        </div>

        <div class="meta-card">
          <p><strong>Enabled:</strong> {{ form.enabled ? "Yes" : "No" }}</p>
          <p><strong>Updated by:</strong> {{ updatedBy || "Unknown" }}</p>
        </div>
      </div>
    </div>
  </AdminPageLayout>
</template>

<script setup lang="ts">
type BannerResponse = {
  banner: {
    enabled: boolean;
    severity: "info" | "warning" | "success" | "error";
    title: string | null;
    body: string | null;
    ctaLabel: string | null;
    ctaHref: string | null;
    startsAt: string | null;
    endsAt: string | null;
    updatedAt: string;
    updatedBy: string | null;
  };
};

const form = reactive({
  enabled: false,
  severity: "info" as BannerResponse["banner"]["severity"],
  title: "",
  body: "",
  ctaLabel: "",
  ctaHref: "",
  startsAt: "",
  endsAt: "",
});

const loading = ref(true);
const saving = ref(false);
const message = ref("");
const messageType = ref<"success" | "error">("success");
const updatedAt = ref<string | null>(null);
const updatedBy = ref<string | null>(null);

definePageMeta({
  layout: "default",
});

useHead({
  title: "Landing Banner Settings - PTCG Event Jams",
});

const toInputDateTime = (value: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const fromInputDateTime = (value: string) => {
  return value ? new Date(value).toISOString() : null;
};

const applyResponse = (response: BannerResponse) => {
  form.enabled = response.banner.enabled;
  form.severity = response.banner.severity;
  form.title = response.banner.title || "";
  form.body = response.banner.body || "";
  form.ctaLabel = response.banner.ctaLabel || "";
  form.ctaHref = response.banner.ctaHref || "";
  form.startsAt = toInputDateTime(response.banner.startsAt);
  form.endsAt = toInputDateTime(response.banner.endsAt);
  updatedAt.value = response.banner.updatedAt;
  updatedBy.value = response.banner.updatedBy;
};

const loadBanner = async () => {
  loading.value = true;

  try {
    const response = await $fetch<BannerResponse>("/api/admin/settings/banner");
    applyResponse(response);
  } catch (error: unknown) {
    const statusMessage =
      error && typeof error === "object" && "statusMessage" in error
        ? String(error.statusMessage)
        : "Failed to load banner settings";
    message.value = statusMessage;
    messageType.value = "error";
  } finally {
    loading.value = false;
  }
};

const saveBanner = async () => {
  saving.value = true;

  try {
    const response = await $fetch<BannerResponse>(
      "/api/admin/settings/banner",
      {
        method: "PATCH",
        body: {
          enabled: form.enabled,
          severity: form.severity,
          title: form.title || null,
          body: form.body || null,
          ctaLabel: form.ctaLabel || null,
          ctaHref: form.ctaHref || null,
          startsAt: fromInputDateTime(form.startsAt),
          endsAt: fromInputDateTime(form.endsAt),
        },
      },
    );

    applyResponse(response);
    message.value = "Banner settings saved";
    messageType.value = "success";
  } catch (error: unknown) {
    const statusMessage =
      error && typeof error === "object" && "statusMessage" in error
        ? String(error.statusMessage)
        : "Failed to save banner settings";
    message.value = statusMessage;
    messageType.value = "error";
  } finally {
    saving.value = false;
  }
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "never";
  }

  return new Date(value).toLocaleString();
};

await loadBanner();
</script>

<style scoped>
@import "~/assets/css/admin-shared.css";

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.banner-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.preview-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preview-meta {
  margin: 0;
  color: #64748b;
}

.preview-banner {
  display: flex;
  gap: 0.75rem;
  border-radius: 16px;
  padding: 1rem 1.25rem;
  border: 2px solid transparent;
}

.preview-banner--info {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1e3a8a;
}

.preview-banner--warning {
  background: #fef3c7;
  border-color: #fcd34d;
  color: #92400e;
}

.preview-banner--success {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

.preview-banner--error {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #991b1b;
}

.preview-banner__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.75);
  font-weight: 700;
  flex-shrink: 0;
}

.preview-banner__content h3,
.preview-banner__content p {
  margin: 0;
}

.preview-banner__content p {
  white-space: pre-wrap;
}

.preview-banner__content {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.preview-banner__cta {
  font-weight: 600;
  text-decoration: underline;
}

.meta-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  padding: 1rem;
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
</style>
