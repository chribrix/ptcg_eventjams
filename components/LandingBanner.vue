<template>
  <div v-if="banner" class="px-2 pt-2">
    <div :class="['landing-banner', `landing-banner--${banner.severity}`]">
      <div class="landing-banner__icon" aria-hidden="true">!</div>
      <div class="landing-banner__content">
        <h3 v-if="banner.title" class="landing-banner__title">
          {{ banner.title }}
        </h3>
        <p v-if="banner.body" class="landing-banner__body">
          {{ banner.body }}
        </p>
        <NuxtLink
          v-if="banner.ctaLabel && banner.ctaHref"
          :to="banner.ctaHref"
          class="landing-banner__cta"
        >
          {{ banner.ctaLabel }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type PublishedBanner = {
  severity: "info" | "warning" | "success" | "error";
  title: string | null;
  body: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
};

const { data } = await useFetch<{ banner: PublishedBanner | null }>(
  "/api/settings/banner",
  {
    default: () => ({ banner: null }),
  },
);

const banner = computed(() => data.value?.banner || null);
</script>

<style scoped>
.landing-banner {
  display: flex;
  gap: 0.75rem;
  border-radius: 1rem;
  padding: 1rem 1.25rem;
  border: 1px solid transparent;
  box-shadow: var(--app-shadow-soft);
}

.landing-banner--info {
  background: var(--app-feedback-info-bg);
  border-color: var(--app-feedback-info-border);
  color: var(--app-feedback-info-text);
}

.landing-banner--warning {
  background: var(--app-badge-warning-bg);
  border-color: color-mix(in srgb, var(--app-badge-warning-text) 22%, white);
  color: var(--app-badge-warning-text);
}

.landing-banner--success {
  background: var(--app-feedback-success-bg);
  border-color: var(--app-feedback-success-border);
  color: var(--app-feedback-success-text);
}

.landing-banner--error {
  background: var(--app-feedback-error-bg);
  border-color: var(--app-feedback-error-border);
  color: var(--app-feedback-error-text);
}

.landing-banner__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.72);
  font-weight: 700;
  flex-shrink: 0;
}

.landing-banner__content {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.landing-banner__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.landing-banner__body {
  margin: 0;
  font-size: 0.925rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.landing-banner__cta {
  align-self: flex-start;
  margin-top: 0.35rem;
  font-weight: 600;
  text-decoration: underline;
}
</style>
