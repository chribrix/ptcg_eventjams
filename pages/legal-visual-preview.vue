<template>
  <div class="preview-shell">
    <div class="preview-intro"><p>Lokale Designvorschau · Beispieldaten</p><h1>Rechtliche Seiten & Eventrollen</h1><span>Diese Vorschau veröffentlicht keine Betreiberangaben.</span></div>
    <nav class="preview-tabs"><button v-for="item in tabs" :key="item.key" type="button" :aria-pressed="active === item.key" @click="active = item.key">{{ item.label }}</button></nav>
    <LegalDocument v-if="active === 'impressum'" slug="impressum" :published="true" operator-name="Beispiel Betreiber" :operator-address="sampleAddress" operator-email="kontakt@example.org" operator-contact="" :body="sampleImprint" />
    <LegalDocument v-else-if="active === 'datenschutz'" slug="datenschutz" :published="true" operator-name="Beispiel Betreiber" :operator-address="sampleAddress" operator-email="kontakt@example.org" operator-contact="" :body="samplePrivacy" />
    <div v-else class="role-preview"><h2>So sehen Besucher die Zuständigkeiten</h2><div class="role-card"><h3>Event mit Anmeldung bei ChrispyJams</h3><EventsEventRoleNotice mode="local" /></div><div class="role-card"><h3>Externes Event mit Weiterleitung</h3><EventsEventRoleNotice mode="external" /></div></div>
  </div>
</template>
<script setup lang="ts">
if (!import.meta.dev) throw createError({ statusCode: 404, statusMessage: "Not found" });
const tabs = [{ key: "impressum", label: "Impressum" }, { key: "datenschutz", label: "Datenschutz" }, { key: "rollen", label: "Eventrollen" }] as const;
const active = ref<(typeof tabs)[number]["key"]>("impressum");
const sampleAddress = "Musterstraße 1\n12345 Beispielstadt";
const { data: baseText } = await useFetch<{ impressum: string; datenschutz: string }>("/api/legal/base-text");
const sampleImprint = computed(() => baseText.value?.impressum || "");
const samplePrivacy = computed(() => baseText.value?.datenschutz || "");
useHead({ title: "Rechtliche Designvorschau – ChrispyJams" });
</script>
<style scoped>
.preview-shell { max-width: 1100px; margin: 0 auto; padding: 1.2rem; color: var(--app-text-primary); }
.preview-intro { border: 1px solid var(--app-border); border-radius: 1rem; padding: 1.2rem; background: var(--app-surface-1); }
.preview-intro p { color: var(--app-accent); font-size: .75rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
.preview-intro h1 { font-size: 1.5rem; font-weight: 800; }
.preview-intro span { color: var(--app-text-secondary); font-size: .85rem; }
.preview-tabs { display: flex; gap: .5rem; flex-wrap: wrap; margin: 1rem 0; }
.preview-tabs button { padding: .65rem 1rem; border: 1px solid var(--app-border); border-radius: .7rem; background: var(--app-surface-1); font-weight: 750; }
.preview-tabs button[aria-pressed=true] { border-color: var(--app-accent); color: var(--app-accent); }
.role-preview { max-width: 820px; margin: 2rem auto 4rem; }
.role-preview h2 { font-size: 1.7rem; font-weight: 800; }
.role-card { margin-top: 1.5rem; }
.role-card h3 { margin-bottom: .6rem; font-weight: 700; }
</style>
