<template>
  <div v-if="visible" class="privacy-backdrop" role="presentation">
    <section class="privacy-dialog" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <p class="privacy-eyebrow">ChrispyJams · Datenschutz</p>
      <h2 id="privacy-title">Datenschutzhinweise</h2>
      <p>Bitte lies die aktuelle <NuxtLink to="/datenschutz" target="_blank">Datenschutzerklärung</NuxtLink>. Für dein Konto halten wir nur fest, welche Fassung du wann zur Kenntnis genommen hast.</p>
      <label><input v-model="checked" type="checkbox" /> Ich habe die Datenschutzerklärung zur Kenntnis genommen.</label>
      <p v-if="error" role="alert" class="privacy-error">{{ error }}</p>
      <button type="button" :disabled="!checked || saving" @click="save">{{ saving ? "Speichert …" : "Weiter" }}</button>
    </section>
  </div>
</template>

<script setup lang="ts">
const { user } = useAuth();
const version = ref<string | null>(null);
const visible = ref(false);
const checked = ref(false);
const saving = ref(false);
const error = ref("");

watch(user, async (current) => {
  visible.value = false;
  checked.value = false;
  if (!current) return;
  try {
    const result = await $fetch<{ version: string | null; acknowledged: boolean }>("/api/legal/privacy-acknowledgement");
    version.value = result.version;
    visible.value = !!result.version && !result.acknowledged;
  } catch {
    error.value = "Datenschutzstatus konnte nicht geladen werden. Bitte lade die Seite neu.";
  }
}, { immediate: true });

async function save() {
  if (!checked.value || !version.value) return;
  saving.value = true;
  error.value = "";
  try {
    await $fetch("/api/legal/privacy-acknowledgement", { method: "POST", body: { version: version.value, acknowledged: true } });
    visible.value = false;
    if (import.meta.client && location.pathname.startsWith("/tournaments/")) location.reload();
  } catch {
    error.value = "Die Fassung konnte nicht bestätigt werden. Bitte versuche es erneut.";
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.privacy-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 1rem; background: rgb(0 0 0 / .72); }
.privacy-dialog { width: min(100%, 34rem); max-height: calc(100dvh - 2rem); overflow: auto; padding: clamp(1.25rem, 4vw, 2rem); border-radius: 1rem; border: 1px solid var(--app-border); background: var(--app-surface-0); color: var(--app-text-primary); box-shadow: 0 1rem 3rem rgb(0 0 0 / .3); }
.privacy-eyebrow { color: var(--app-accent); font-size: .75rem; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; }
h2 { font-size: clamp(1.5rem, 5vw, 2rem); font-weight: 800; margin: .4rem 0 1rem; }
p { line-height: 1.6; }
a { color: var(--app-accent); text-decoration: underline; }
label { display: flex; align-items: flex-start; gap: .65rem; margin: 1.3rem 0; line-height: 1.5; }
label input { flex: none; margin-top: .3rem; }
button { min-height: 44px; width: 100%; border-radius: .6rem; background: var(--app-accent); color: var(--app-surface-0); font-weight: 800; }
button:disabled { opacity: .55; }
.privacy-error { color: var(--app-error, #e86b6b); }
</style>
