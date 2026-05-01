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
  border: 2px solid transparent;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
}

.landing-banner--info {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1e3a8a;
}

.landing-banner--warning {
  background: #fef3c7;
  border-color: #fcd34d;
  color: #92400e;
}

.landing-banner--success {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

.landing-banner--error {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #991b1b;
}

.landing-banner__icon {
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
}

.landing-banner__cta {
  align-self: flex-start;
  margin-top: 0.35rem;
  font-weight: 600;
  text-decoration: underline;
}
</style>
