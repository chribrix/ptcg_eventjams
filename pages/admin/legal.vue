<template>
  <AdminPageLayout title="Rechtliche Seiten" subtitle="Betreiberangaben und Texte als Entwurf speichern und anschließend einzeln live schalten.">
    <p v-if="isPreview" class="legal-demo-note">Lokale Designvorschau mit Beispieldaten · Speichern ist deaktiviert.</p>
    <div v-if="pending && !isPreview" class="legal-admin-card">Entwürfe werden geladen …</div>
    <div v-else-if="form" class="legal-admin-grid">
      <form class="legal-admin-editor" @submit.prevent="save">
        <div class="legal-live-hint" role="note">
          <strong>Entwurf und Live-Schaltung</strong>
          <p>Du kannst alle Angaben zuerst als Entwurf speichern. Erst wenn du den Liveschalter einer Seite aktivierst und speicherst, erscheinen deren Angaben öffentlich.</p>
        </div>
        <section class="legal-admin-card">
          <h2>Betreiberangaben</h2>
          <p>Diese Angaben erscheinen auf beiden veröffentlichten Seiten.</p>
          <label>Name / Organisation<input v-model="form.operatorName" maxlength="200" /></label>
          <label>Ladungsfähige Anschrift<textarea v-model="form.operatorAddress" rows="3" maxlength="500" /></label>
          <label>E-Mail-Adresse<input v-model="form.operatorEmail" type="email" /></label>
          <label>Weitere Kontaktangaben<textarea v-model="form.operatorContact" rows="2" maxlength="300" /></label>
        </section>
        <section class="legal-admin-card">
          <div class="legal-admin-row"><h2>Impressum</h2><label class="legal-switch"><span :class="['legal-status', form.impressum.published ? 'is-live' : 'is-draft']">{{ statusLabel('impressum') }}</span><input v-model="form.impressum.published" type="checkbox" role="switch" aria-label="Impressum live schalten" /> Live</label></div>
          <p>Zusätzliche, auf dich zutreffende Pflichtangaben. Betreiberangaben stehen automatisch darüber.</p>
          <button type="button" class="legal-template-button" @click="loadBase('impressum')">Dateivorlage laden</button>
          <textarea v-model="form.impressum.body" class="legal-content-input" rows="9" maxlength="20000" aria-label="Impressumstext" />
        </section>
        <section class="legal-admin-card">
          <div class="legal-admin-row"><h2>Datenschutzerklärung</h2><label class="legal-switch"><span :class="['legal-status', form.datenschutz.published ? 'is-live' : 'is-draft']">{{ statusLabel('datenschutz') }}</span><input v-model="form.datenschutz.published" type="checkbox" role="switch" aria-label="Datenschutzerklärung live schalten" /> Live</label></div>
          <p>Die Vorlage beschreibt die vorhandenen Funktionen. Ersetze alle <code>[[BITTE ERGÄNZEN]]</code>-Stellen und prüfe Anbieter, Rechtsgrundlagen und Fristen. Abschnitte beginnen mit <code>## </code>.</p>
          <button type="button" class="legal-template-button" @click="loadBase('datenschutz')">Dateivorlage laden</button>
          <textarea v-model="form.datenschutz.body" class="legal-content-input" rows="23" maxlength="20000" aria-label="Datenschutztext" />
        </section>
        <div class="legal-admin-actions"><button type="submit" :disabled="saving || isPreview">{{ saving ? 'Speichert …' : 'Änderungen und Livestatus speichern' }}</button><span v-if="message" role="status">{{ message }}</span></div>
      </form>
      <aside class="legal-admin-preview">
        <div class="legal-admin-row"><h2>Vorschau</h2><div class="legal-tabs"><button type="button" :aria-pressed="previewSlug === 'impressum'" @click="previewSlug = 'impressum'">Impressum</button><button type="button" :aria-pressed="previewSlug === 'datenschutz'" @click="previewSlug = 'datenschutz'">Datenschutz</button></div></div>
        <div class="legal-preview-frame"><LegalDocument :slug="previewSlug" :published="true" :operator-name="form.operatorName || 'Name / Organisation'" :operator-address="form.operatorAddress || 'Anschrift'" :operator-email="form.operatorEmail || 'E-Mail-Adresse'" :operator-contact="form.operatorContact" :body="form[previewSlug].body" /></div>
        <NuxtLink :to="`/${previewSlug}`" target="_blank">Öffentliche Seite öffnen ↗</NuxtLink>
      </aside>
    </div>
    <div v-else class="legal-admin-card" role="alert">
      <p>{{ loadError || 'Die Entwürfe konnten nicht geladen werden.' }}</p>
      <button type="button" class="legal-template-button" @click="load">Erneut laden</button>
    </div>
  </AdminPageLayout>
</template>
<script setup lang="ts">
type LegalState = { operatorName: string; operatorAddress: string; operatorEmail: string; operatorContact: string; impressum: { body: string; published: boolean }; datenschutz: { body: string; published: boolean } };
definePageMeta({ layout: "default" });
const isPreview = import.meta.dev && useRoute().query.preview === "1";
const { data: baseText } = await useFetch<{ impressum: string; datenschutz: string }>("/api/legal/base-text", { immediate: isPreview });
const previewData: LegalState = { operatorName: "Beispiel Betreiber", operatorAddress: "Musterstraße 1\n12345 Beispielstadt", operatorEmail: "kontakt@example.org", operatorContact: "", impressum: { body: baseText.value?.impressum || "", published: false }, datenschutz: { body: baseText.value?.datenschutz || "", published: false } };
const form = ref<LegalState | null>(isPreview ? previewData : null);
const pending = ref(!isPreview);
const loadError = ref("");
const savedStatus = ref({ impressum: form.value?.impressum.published ?? false, datenschutz: form.value?.datenschutz.published ?? false });
const previewSlug = ref<"impressum" | "datenschutz">("impressum");
const saving = ref(false);
const message = ref("");
onMounted(() => { if (!isPreview) void load(); });
async function load() {
  pending.value = true;
  loadError.value = "";
  try {
    const state = await $fetch<LegalState>("/api/admin/legal");
    form.value = state;
    savedStatus.value = { impressum: state.impressum.published, datenschutz: state.datenschutz.published };
  } catch {
    loadError.value = "Die Entwürfe konnten nicht geladen werden. Bitte Anmeldung prüfen und erneut versuchen.";
  } finally {
    pending.value = false;
  }
}
function statusLabel(slug: "impressum" | "datenschutz") {
  const live = form.value?.[slug].published ?? false;
  if (live !== savedStatus.value[slug]) return live ? "Live nach Speichern" : "Offline nach Speichern";
  return live ? "Live" : "Entwurf";
}
async function loadBase(slug: "impressum" | "datenschutz") {
  if (!form.value) return;
  try {
    const result = isPreview && baseText.value ? baseText.value : await $fetch<{ impressum: string; datenschutz: string }>("/api/admin/legal/defaults");
    form.value[slug].body = result[slug];
    message.value = "Dateivorlage übernommen. Zum Veröffentlichen Platzhalter ausfüllen und Entwurf speichern.";
  } catch {
    message.value = "Dateivorlage konnte nicht geladen werden.";
  }
}
async function save() {
  if (!form.value || isPreview) return;
  saving.value = true; message.value = "";
  try { form.value = await $fetch<LegalState>("/api/admin/legal", { method: "PUT", body: form.value }); savedStatus.value = { impressum: form.value.impressum.published, datenschutz: form.value.datenschutz.published }; message.value = form.value.impressum.published || form.value.datenschutz.published ? "Gespeichert. Live geschaltete Seiten sind jetzt öffentlich sichtbar." : "Entwurf gespeichert. Es sind noch keine Rechtstexte live geschaltet."; }
  catch (error: any) { message.value = error?.data?.statusMessage || "Speichern fehlgeschlagen. Bitte Angaben prüfen."; }
  finally { saving.value = false; }
}
</script>
<style scoped>
.legal-demo-note { margin-bottom: 1rem; padding: .75rem 1rem; border: 1px solid var(--app-accent); border-radius: .7rem; color: var(--app-accent); font-size: .85rem; font-weight: 700; }
.legal-live-hint { padding: 1rem 1.25rem; border: 1px solid var(--app-accent); border-radius: 1rem; background: var(--app-surface-1); color: var(--app-text-primary); }
.legal-live-hint strong { display: block; font-size: .9rem; }
.legal-live-hint p { margin: .35rem 0 0; color: var(--app-text-secondary); font-size: .85rem; line-height: 1.5; }
.legal-admin-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1rem; align-items: start; }
.legal-admin-editor { display: grid; gap: 1rem; min-width: 0; }
.legal-admin-card, .legal-admin-preview { background: var(--app-surface-1); border: 1px solid var(--app-border); border-radius: 1rem; padding: 1.25rem; min-width: 0; }
.legal-admin-card h2, .legal-admin-preview h2 { font-size: 1.1rem; font-weight: 800; color: var(--app-text-primary); }
.legal-admin-card p { margin: .4rem 0 1rem; color: var(--app-text-secondary); font-size: .88rem; line-height: 1.5; }
.legal-admin-card label:not(.legal-switch) { display: grid; gap: .4rem; margin: .8rem 0; font-size: .83rem; font-weight: 700; color: var(--app-text-secondary); }
.legal-admin-card input:not([type=checkbox]), .legal-admin-card textarea { width: 100%; border: 1px solid var(--app-border); border-radius: .6rem; background: var(--app-surface-0); color: var(--app-text-primary); padding: .7rem; }
.legal-content-input { font: inherit; line-height: 1.5; resize: vertical; }
.legal-admin-row { display: flex; justify-content: space-between; align-items: center; gap: .75rem; flex-wrap: wrap; }
.legal-switch { display: inline-flex; align-items: center; gap: .45rem; font-size: .85rem; color: var(--app-text-primary); white-space: nowrap; }
.legal-switch input { accent-color: var(--app-accent); width: 1.1rem; height: 1.1rem; }
.legal-status { padding: .25rem .5rem; border-radius: 999px; font-size: .7rem; font-weight: 800; }
.legal-status.is-live { background: var(--app-accent); color: var(--app-surface-0); }
.legal-status.is-draft { background: var(--app-surface-2); color: var(--app-text-secondary); }
.legal-admin-actions { display: flex; align-items: center; gap: .8rem; flex-wrap: wrap; }
.legal-admin-actions button, .legal-tabs button { border-radius: .6rem; padding: .65rem .9rem; background: var(--app-accent); color: var(--app-surface-0); font-weight: 800; }
.legal-admin-actions button:disabled { opacity: .5; }
.legal-admin-actions span { color: var(--app-text-secondary); font-size: .85rem; }
.legal-template-button { margin: -.25rem 0 .75rem; padding: .45rem .7rem; border: 1px solid var(--app-border); border-radius: .55rem; color: var(--app-accent); font-size: .8rem; font-weight: 700; }
.legal-tabs { display: flex; gap: .4rem; }
.legal-tabs button { background: var(--app-surface-2); color: var(--app-text-primary); font-size: .78rem; }
.legal-tabs button[aria-pressed=true] { background: var(--app-accent); color: var(--app-surface-0); }
.legal-preview-frame { margin: 1rem 0; max-height: 820px; overflow: auto; border: 1px solid var(--app-border); border-radius: .75rem; background: var(--app-surface-0); padding: 1rem; }
.legal-admin-preview a { color: var(--app-accent); text-decoration: underline; }
@media(max-width: 1050px) { .legal-admin-grid { grid-template-columns: 1fr; } }
</style>
