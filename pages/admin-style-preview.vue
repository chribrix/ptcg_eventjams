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
  </AdminPageLayout>
</template>

<script setup lang="ts">
if (!import.meta.dev) throw createError({ statusCode: 404, statusMessage: "Not found" });
definePageMeta({ layout: "default" });
useHead({ title: "Admin Designvorschau – ChrispyJams" });
</script>

<style scoped>
.preview-badge { display:inline-flex; align-items:center; padding:.35rem .6rem; border-radius:3px; border:1px solid var(--app-border); color:var(--app-text-secondary); background:var(--app-surface-1); font-size:.7rem; font-weight:750; }
.preview-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.75rem; }
.preview-stats div, .preview-activity { background:var(--app-surface-0); border:1px solid var(--app-border); border-radius:5px; }
.preview-stats div { display:flex; flex-direction:column; padding:.7rem .8rem; }
.preview-stats span { color:var(--app-text-secondary); font-size:.79rem; font-weight:750; }
.preview-stats strong { color:var(--app-text-primary); font-size:1.55rem; margin:.2rem 0; line-height:1; }
.preview-stats small, .preview-row small { color:var(--app-text-muted); font-size:.72rem; }
.preview-activity { padding:.85rem; }
.preview-heading p { margin:0 0 .25rem; color:var(--app-accent); font-size:.7rem; text-transform:uppercase; letter-spacing:.14em; font-weight:800; }
.preview-heading h2 { margin:0 0 .65rem; font-size:1.15rem; color:var(--app-text-primary); }
.preview-row { display:flex; align-items:center; gap:.65rem; padding:.5rem 0; border-top:1px solid var(--app-border); }
.preview-row > span:nth-child(2) { display:flex; flex:1; flex-direction:column; gap:.15rem; }
.preview-row strong { color:var(--app-text-primary); font-size:.85rem; }
.preview-dot { width:.55rem; height:.55rem; border-radius:50%; background:var(--app-accent); }
.preview-type { color:var(--app-text-muted); font-size:.73rem; }
@media (max-width:720px) { .preview-stats { grid-template-columns:repeat(2,minmax(0,1fr)); } }
</style>
