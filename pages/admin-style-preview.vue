<template>
  <AdminPageLayout
    title="Admin Workspace"
    subtitle="Drei Richtungen für die neue Verwaltung. Die Sidebar und Designvorschau funktionieren auch auf schmalen Displays."
  >
    <template #actions><span class="preview-badge">Designprobe · keine Echtdaten</span></template>
    <section class="preview-stats" aria-label="Beispielkennzahlen">
      <div><span>Eigene Events</span><strong>50</strong><small>+ 6 diesen Monat</small></div>
      <div><span>Registrierte Spieler</span><strong>194</strong><small>+ 12 diesen Monat</small></div>
      <div><span>Bevorstehend</span><strong>4</strong><small>Nächstes Event Freitag</small></div>
      <div><span>Abgeschlossen</span><strong>46</strong><small>Archiv aktuell</small></div>
    </section>
    <section class="preview-activity">
      <div class="preview-heading"><p>Was gerade passiert</p><h2>Letzte Aktivitäten</h2></div>
      <div class="preview-row"><span class="preview-dot"></span><span><strong>Neue Registrierung</strong><small>Heute · 14:32 Uhr</small></span><span class="preview-type">Buchung</span></div>
      <div class="preview-row"><span class="preview-dot"></span><span><strong>Event veröffentlicht</strong><small>Gestern · 18:05 Uhr</small></span><span class="preview-type">Kalender</span></div>
      <div class="preview-row"><span class="preview-dot"></span><span><strong>Turnierrunde abgeschlossen</strong><small>Samstag · 20:14 Uhr</small></span><span class="preview-type">Turnier</span></div>
    </section>
    <section class="admin-card preview-subpage" aria-label="Beispiel einer Admin-Unterseite">
      <div class="section-header">
        <div><p class="preview-subpage-kicker">Unterseitenmuster</p><h2>Veranstaltung verwalten</h2></div>
        <span class="badge badge-success">Aktiv</span>
      </div>
      <div class="preview-subpage-fields">
        <label class="form-group">Eventname<input class="form-input" value="Crows & Owls Locals" readonly /></label>
        <label class="form-group">Ort<input class="form-input" value="Crows & Owls" readonly /></label>
      </div>
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead><tr><th>Teilnehmer</th><th>Status</th><th>Anmeldung</th></tr></thead>
          <tbody>
            <tr><td>Alex Beispiel</td><td><span class="badge badge-success">Bestätigt</span></td><td>Heute</td></tr>
            <tr><td>Sam Muster</td><td><span class="badge badge-warning">Warteliste</span></td><td>Gestern</td></tr>
          </tbody>
        </table>
      </div>
      <div class="preview-actions" aria-label="Beispielaktionen">
        <button type="button" class="btn btn-secondary" @click="previewAction">Sekundär</button>
        <button type="button" class="btn btn-primary" @click="previewAction">Primär</button>
      </div>
    </section>
  </AdminPageLayout>
</template>

<script setup lang="ts">
if (!import.meta.dev) throw createError({ statusCode: 404, statusMessage: "Not found" });
definePageMeta({ layout: "default" });
useHead({ title: "Admin Designvorschau – ChrispyJams" });
const { showToast } = useToast();
const previewAction = () => showToast("Designprobe: keine Daten geändert", "info", 2500);
</script>

<style scoped>
@import "~/assets/css/admin-shared.css";

.preview-badge { display:inline-flex; align-items:center; padding:.35rem .6rem; border-radius:3px; border:1px solid var(--app-border); color:var(--app-text-secondary); background:var(--app-surface-1); font-size:var(--admin-font-support); font-weight:750; }
.preview-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.75rem; }
.preview-stats div, .preview-activity { background:var(--app-surface-0); border:1px solid var(--app-border); border-radius:5px; }
.preview-stats div { display:flex; flex-direction:column; padding:.7rem .8rem; }
.preview-stats span { color:var(--app-text-secondary); font-size:var(--admin-font-body); font-weight:750; }
.preview-stats strong { color:var(--app-text-primary); font-size:1.75rem; margin:.2rem 0; line-height:1.1; }
.preview-stats small, .preview-row small { color:var(--app-text-muted); font-size:var(--admin-font-support); }
.preview-activity { padding:.85rem; }
.preview-heading p { margin:0 0 .25rem; color:var(--app-accent); font-size:var(--admin-font-eyebrow); text-transform:uppercase; letter-spacing:.14em; font-weight:800; }
.preview-heading h2 { margin:0 0 .65rem; font-size:var(--admin-font-section-title); color:var(--app-text-primary); }
.preview-row { display:flex; align-items:center; gap:.65rem; padding:.65rem 0; border-top:1px solid var(--app-border); }
.preview-row > span:nth-child(2) { display:flex; flex:1; flex-direction:column; gap:.15rem; }
.preview-row strong { color:var(--app-text-primary); font-size:var(--admin-font-body); }
.preview-dot { width:.55rem; height:.55rem; border-radius:50%; background:var(--app-accent); }
.preview-type { color:var(--app-text-muted); font-size:var(--admin-font-support); }
.preview-subpage-kicker { margin:0 0 .15rem; color:var(--app-accent); font-size:var(--admin-font-eyebrow); font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
.preview-subpage-fields { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.65rem; }
.preview-actions { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:.5rem; margin-top:.65rem; }
@media (max-width:560px) { .preview-subpage-fields { grid-template-columns:1fr; } }
@media (max-width:1200px) { .preview-stats { grid-template-columns:repeat(2,minmax(0,1fr)); } }
</style>
