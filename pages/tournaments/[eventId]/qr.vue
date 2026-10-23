<template>
  <main class="qr-page">
    <section class="qr-code-side">
      <p class="qr-kicker">Chrispyjams Turnierzugang</p>
      <h1>{{ tournamentName }}</h1>
      <div v-if="qrDataUrl" class="qr-code-frame">
        <img :src="qrDataUrl" alt="QR Code zum Turnierzugang" />
      </div>
      <p class="qr-scan-label">QR Code scannen</p>
      <p v-if="enrollmentUrl" class="qr-short-link">Oder im Browser: <a :href="enrollmentUrl">{{ enrollmentUrl }}</a></p>
    </section>

    <section class="qr-guide-side">
      <p class="qr-kicker">So funktioniert es</p>
      <h2>Dein Pairing in drei Schritten</h2>
      <ol class="qr-steps">
        <li><span>1</span><div><strong>Scannen</strong><p>Öffne den QR Code mit deinem Handy.</p></div></li>
        <li><span>2</span><div><strong>Anmelden</strong><p>Gib deine Pokémon Spieler ID und dein Geburtsjahr ein.</p></div></li>
        <li><span>3</span><div><strong>Spielen</strong><p>Sieh Tisch und Gegner. Melde danach dein Ergebnis.</p></div></li>
      </ol>
      <p class="qr-note">Ein Ergebnis zählt erst, wenn beide Spieler dasselbe Ergebnis bestätigen.</p>
    </section>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ layout: false });

const route = useRoute();
const eventId = computed(() => String(route.params.eventId || ""));
const tournamentName = ref("Pokémon Turnier");
const qrDataUrl = ref<string | null>(null);
const enrollmentUrl = ref("");

onMounted(async () => {
  if (!eventId.value) return;
  try {
    const result = await $fetch<{ tournament?: { name?: string; enrollmentCode?: string } }>(`/api/tournaments/${eventId.value}/tom-bridge/access-info`);
    tournamentName.value = result.tournament?.name || tournamentName.value;
    enrollmentUrl.value = `${window.location.origin}/e/${result.tournament?.enrollmentCode || eventId.value}`;
    const QRCode = (await import("qrcode")).default;
    qrDataUrl.value = await QRCode.toDataURL(enrollmentUrl.value, {
      width: 1400,
      margin: 1,
      errorCorrectionLevel: "M",
    });
  } catch {
    // The page remains usable as a display even when TOM has not been imported yet.
  }
});
</script>

<style scoped>
.qr-page { min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(420px, 0.88fr); background: #071527; color: #f8fafc; }
.qr-code-side { display: grid; place-items: center; align-content: center; gap: 1.35rem; padding: 4.5vw; background: #f8fafc; color: #0f172a; text-align: center; }
.qr-guide-side { display: grid; align-content: center; gap: 1.65rem; padding: 5vw; background: linear-gradient(145deg, #0f2750, #071527); }
.qr-kicker { margin: 0; color: #38bdf8; font-size: clamp(1rem, 1.8vw, 1.5rem); font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.qr-code-side h1 { max-width: 850px; margin: 0; font-size: clamp(2.1rem, 5vw, 5.4rem); line-height: 1.04; }
.qr-guide-side h2 { margin: 0; font-size: clamp(2.1rem, 4.1vw, 4.4rem); line-height: 1.05; }
.qr-code-frame { width: min(58vh, 56vw); aspect-ratio: 1; display: grid; place-items: center; padding: clamp(1rem, 2vw, 2rem); background: #fff; border: clamp(6px, 0.8vw, 12px) solid #38bdf8; border-radius: 24px; box-shadow: 0 22px 70px rgb(15 23 42 / 0.18); }
.qr-code-frame img { width: 100%; height: 100%; object-fit: contain; }
.qr-scan-label { margin: 0; color: #0f172a; font-size: clamp(1.5rem, 2.8vw, 3.2rem); font-weight: 800; }
.qr-short-link { margin: -0.6rem 0 0; color: #334155; font-size: clamp(1rem, 1.55vw, 1.7rem); font-weight: 700; }
.qr-short-link a { color: #0369a1; text-decoration: underline; text-underline-offset: 0.18em; }
.qr-steps { display: grid; gap: clamp(1.3rem, 3.3vh, 2.8rem); margin: 0; padding: 0; list-style: none; }
.qr-steps li { display: grid; grid-template-columns: clamp(3.5rem, 5vw, 5.4rem) 1fr; gap: 1.1rem; align-items: start; }
.qr-steps span { display: grid; place-items: center; width: clamp(3.5rem, 5vw, 5.4rem); aspect-ratio: 1; border-radius: 50%; background: #38bdf8; color: #082f49; font-size: clamp(1.8rem, 3.3vw, 3.6rem); font-weight: 900; }
.qr-steps strong { font-size: clamp(1.5rem, 2.6vw, 3rem); }
.qr-steps p, .qr-note { margin: 0.25rem 0 0; color: #cbd5e1; font-size: clamp(1.1rem, 1.7vw, 1.8rem); line-height: 1.35; }
.qr-note { padding-top: 1.4rem; border-top: 1px solid rgb(148 163 184 / 0.45); }
@media (max-width: 850px) { .qr-page { grid-template-columns: 1fr; } .qr-code-side, .qr-guide-side { padding: 2.25rem 1.5rem; } .qr-code-frame { width: min(70vw, 430px); } }
</style>
