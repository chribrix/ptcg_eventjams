<template>
  <article class="legal-document">
    <header class="legal-document-header">
      <p class="legal-eyebrow">ChrispyJams · Rechtliches</p>
      <h1>{{ title }}</h1>
      <p v-if="subtitle" class="legal-subtitle">{{ subtitle }}</p>
    </header>
    <div v-if="!published" class="legal-unpublished" role="status">
      Diese Seite wird vorbereitet. Die Angaben sind noch nicht veröffentlicht.
    </div>
    <template v-else>
      <section class="legal-operator" aria-label="Verantwortliche Stelle">
        <p class="legal-section-label">{{ slug === 'impressum' ? 'Anbieter' : 'Verantwortliche Stelle' }}</p>
        <strong>{{ operatorName }}</strong>
        <p class="whitespace-pre-line">{{ operatorAddress }}</p>
        <a :href="`mailto:${operatorEmail}`">{{ operatorEmail }}</a>
        <p v-if="operatorContact" class="whitespace-pre-line">{{ operatorContact }}</p>
      </section>
      <div class="legal-body">
        <template v-for="(part, index) in parts" :key="index">
          <h2 v-if="part.heading">{{ part.text }}</h2>
          <p v-else>{{ part.text }}</p>
        </template>
      </div>
    </template>
  </article>
</template>

<script setup lang="ts">
const props = defineProps<{
  slug: "impressum" | "datenschutz";
  published: boolean;
  operatorName: string;
  operatorAddress: string;
  operatorEmail: string;
  operatorContact: string;
  body: string;
}>();
const title = computed(() => props.slug === "impressum" ? "Impressum" : "Datenschutzerklärung");
const subtitle = computed(() => props.slug === "impressum" ? "Wer diese Website betreibt und wie du Kontakt aufnimmst." : "Wie ChrispyJams Daten bei Kalender, Konto und Eventanmeldung verarbeitet.");
const parts = computed(() => props.body.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean).map((block) => ({ heading: block.startsWith("## "), text: block.startsWith("## ") ? block.slice(3) : block })));
</script>

<style scoped>
.legal-document { max-width: 820px; margin: 0 auto; padding: clamp(1rem, 4vw, 2.5rem) 0 4rem; color: var(--app-text-primary); }
.legal-document-header { margin-bottom: 2rem; }
.legal-eyebrow, .legal-section-label { color: var(--app-accent); font-size: .76rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
h1 { margin: .4rem 0 .5rem; font-size: clamp(2.2rem, 6vw, 3.7rem); line-height: 1.05; font-weight: 800; }
.legal-subtitle { color: var(--app-text-secondary); font-size: 1rem; line-height: 1.65; }
.legal-operator, .legal-unpublished { padding: 1.5rem; border: 1px solid var(--app-border); border-radius: 1.25rem; background: var(--app-surface-1); }
.legal-operator strong { display: block; margin-top: .6rem; font-size: 1.15rem; }
.legal-operator p { margin: .35rem 0; line-height: 1.65; }
.legal-operator a { color: var(--app-accent); text-decoration: underline; overflow-wrap: anywhere; }
.legal-body { margin-top: 2.25rem; }
.legal-body h2 { margin: 2rem 0 .75rem; font-size: 1.35rem; font-weight: 750; }
.legal-body p { margin: 0 0 1rem; color: var(--app-text-secondary); line-height: 1.75; white-space: pre-line; overflow-wrap: anywhere; }
</style>
