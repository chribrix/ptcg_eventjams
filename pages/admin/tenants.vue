<template>
  <AdminPageLayout
    title="Mandanten"
    subtitle="Läden, Zuständigkeiten und Zugänge verwalten. Neue Läden bleiben bis zum Abschluss der Datentrennung im Entwurf."
  >
    <template #actions>
      <button type="button" class="tenant-button secondary" :disabled="loading" @click="loadTenants">Aktualisieren</button>
    </template>

    <div class="tenant-overview" aria-label="Mandantenüberblick">
      <div><strong>{{ tenants.length }}</strong><span>Läden</span></div>
      <div><strong>{{ activeCount }}</strong><span>Aktiv</span></div>
      <div><strong>{{ draftCount }}</strong><span>Entwürfe</span></div>
    </div>

    <div class="tenant-grid">
      <section class="tenant-panel">
        <div class="panel-heading">
          <div><p class="eyebrow">Portfolio</p><h2>Deine Läden</h2></div>
        </div>
        <AppStatePanel v-if="loading" kind="loading" message="Mandanten werden geladen …" />
        <AppStatePanel v-else-if="!tenants.length" kind="empty" title="Noch keine Mandanten" message="Lege einen ersten Laden an." />
        <div v-else class="tenant-list">
          <button
            v-for="tenant in tenants"
            :key="tenant.id"
            type="button"
            class="tenant-list-item"
            :class="{ selected: selectedId === tenant.id }"
            :aria-pressed="selectedId === tenant.id"
            @click="selectedId = tenant.id"
          >
            <span class="tenant-monogram">{{ tenant.name.slice(0, 2).toUpperCase() }}</span>
            <span class="tenant-list-copy"><strong>{{ tenant.name }}</strong><small>{{ tenant.slug }}</small></span>
            <span class="status-pill" :class="tenant.status">{{ tenant.status === 'active' ? 'Aktiv' : 'Entwurf' }}</span>
          </button>
        </div>

        <form class="create-form" @submit.prevent="createTenant">
          <h3>Neuen Laden vorbereiten</h3>
          <p>Ein neuer Mandant kann zunächst keine Events veröffentlichen.</p>
          <label for="tenant-name">Name</label>
          <input id="tenant-name" v-model.trim="newTenant.name" required maxlength="120" placeholder="Beispiel: Spieleladen Nord" />
          <label for="tenant-slug">Slug</label>
          <input id="tenant-slug" v-model.trim="newTenant.slug" required maxlength="64" pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="spieleladen-nord" />
          <button class="tenant-button primary" type="submit" :disabled="busy || !newTenant.name || !newTenant.slug">{{ busy ? 'Speichern …' : 'Entwurf anlegen' }}</button>
        </form>
      </section>

      <section class="tenant-panel detail-panel" v-if="selectedTenant">
        <div class="panel-heading detail-heading">
          <div><p class="eyebrow">Mandant / {{ selectedTenant.slug }}</p><h2>{{ selectedTenant.name }}</h2></div>
          <span class="status-pill" :class="selectedTenant.status">{{ selectedTenant.status === 'active' ? 'Aktiv' : 'Entwurf' }}</span>
        </div>
        <p class="tenant-note" v-if="selectedTenant.status !== 'active'">
          Dieser Laden ist vorbereitet. Aktivierung folgt, sobald alle Event-, Buchungs-, Turnier- und Decklistenrouten mandantensicher sind.
        </p>

        <div class="tenant-facts">
          <div><strong>{{ selectedTenant._count.customEvents }}</strong><span>Eigene Events</span></div>
          <div><strong>{{ selectedTenant._count.venueDirectoryEntries }}</strong><span>Orte</span></div>
          <div><strong>{{ selectedTenant._count.leagueSeasons }}</strong><span>Liga-Saisons</span></div>
        </div>

        <form class="detail-form" @submit.prevent="renameSelected">
          <label for="edit-tenant-name">Anzeigename</label>
          <div class="inline-form">
            <input id="edit-tenant-name" v-model.trim="editName" required maxlength="120" />
            <button class="tenant-button secondary" :disabled="busy || editName === selectedTenant.name" type="submit">Speichern</button>
          </div>
        </form>

        <div class="members-heading">
          <div><p class="eyebrow">Zugriff</p><h3>Mitglieder</h3></div>
          <span>{{ selectedTenant.memberships.length }}</span>
        </div>
        <p class="empty-members" v-if="!selectedTenant.memberships.length">Noch keine Ladenrollen vergeben. Plattformadmins behalten ihren bisherigen Zugang.</p>
        <div class="member-list" v-else>
          <div class="member-row" v-for="member in selectedTenant.memberships" :key="member.userId">
            <span class="member-avatar">{{ member.role.slice(0, 1).toUpperCase() }}</span>
            <span class="member-copy"><strong>{{ memberLabels[member.userId] || member.userId }}</strong><small>{{ member.role }}</small></span>
            <button type="button" class="text-action" :disabled="busy" :aria-label="`Mitglied ${member.userId} entfernen`" @click="removeMember(member.userId)">Entfernen</button>
          </div>
        </div>

        <form class="member-form" @submit.prevent="saveMember">
          <h4>Mitglied hinzufügen oder Rolle ändern</h4>
          <label for="member-search">Benutzer suchen</label>
          <div class="inline-form">
            <input id="member-search" v-model.trim="userSearch" placeholder="Name oder E-Mail" @keydown.enter.prevent="searchUsers" />
            <button type="button" class="tenant-button secondary" :disabled="searchingUsers" @click="searchUsers">Suchen</button>
          </div>
          <div v-if="userResults.length" class="user-results" aria-label="Suchergebnisse">
            <button v-for="result in userResults" :key="result.id" type="button" @click="selectUser(result)">
              <strong>{{ result.linkedPlayer?.name || result.email || 'Ohne Namen' }}</strong><small>{{ result.email || result.id }}</small>
            </button>
          </div>
          <p v-if="memberUserLabel" class="selected-user">Ausgewählt: {{ memberUserLabel }}</p>
          <div class="member-controls">
            <label class="sr-only" for="member-role">Ladenrolle</label>
            <select id="member-role" v-model="memberRole">
              <option value="owner">Inhaber</option>
              <option value="admin">Admin</option>
              <option value="staff">Team (Lesen)</option>
            </select>
            <button type="submit" class="tenant-button primary" :disabled="busy || !memberUserId">Rolle speichern</button>
          </div>
        </form>
      </section>
    </div>
  </AdminPageLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

type Tenant = {
  id: string;
  slug: string;
  name: string;
  status: string;
  memberships: Array<{ userId: string; role: string; createdAt: string }>;
  _count: { customEvents: number; eventTemplates: number; venueDirectoryEntries: number; leagueSeasons: number };
};
type UserResult = { id: string; email: string | null; linkedPlayer: { name: string } | null };
const tenants = ref<Tenant[]>([]);
const selectedId = ref<string | null>(null);
const selectedTenant = computed(() => tenants.value.find((item) => item.id === selectedId.value) || null);
const activeCount = computed(() => tenants.value.filter((item) => item.status === "active").length);
const draftCount = computed(() => tenants.value.filter((item) => item.status !== "active").length);
const loading = ref(true);
const busy = ref(false);
const searchingUsers = ref(false);
const newTenant = ref({ name: "", slug: "" });
const editName = ref("");
const userSearch = ref("");
const userResults = ref<UserResult[]>([]);
const memberUserId = ref("");
const memberUserLabel = ref("");
const memberRole = ref<"owner" | "admin" | "staff">("staff");
const memberLabels = ref<Record<string, string>>({});
const { showToast } = useToast();

definePageMeta({ layout: "default" });
useHead({ title: "Mandanten – ChrispyJams Admin" });

watch(selectedTenant, (tenant) => { editName.value = tenant?.name || ""; });
onMounted(loadTenants);

function messageFromError(error: unknown) {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: { statusMessage?: unknown } }).data;
    if (typeof data?.statusMessage === "string") return data.statusMessage;
  }
  return "Aktion fehlgeschlagen";
}

async function loadTenants() {
  loading.value = true;
  try {
    const response = await $fetch<{ tenants: Tenant[] }>("/api/admin/tenants");
    tenants.value = response.tenants;
    if (!response.tenants.some((item) => item.id === selectedId.value)) selectedId.value = response.tenants[0]?.id || null;
  } catch (error) { showToast(messageFromError(error), "error"); }
  finally { loading.value = false; }
}

async function createTenant() {
  busy.value = true;
  try {
    const created = await $fetch<Tenant>("/api/admin/tenants", { method: "POST", body: newTenant.value });
    await loadTenants();
    selectedId.value = created.id;
    newTenant.value = { name: "", slug: "" };
    showToast("Mandant als Entwurf angelegt", "success");
  } catch (error) { showToast(messageFromError(error), "error"); }
  finally { busy.value = false; }
}

async function renameSelected() {
  if (!selectedId.value) return;
  busy.value = true;
  try {
    await $fetch(`/api/admin/tenants/${encodeURIComponent(selectedId.value)}`, { method: "PATCH", body: { name: editName.value } });
    await loadTenants();
    showToast("Name aktualisiert", "success");
  } catch (error) { showToast(messageFromError(error), "error"); }
  finally { busy.value = false; }
}

async function searchUsers() {
  if (!userSearch.value) return;
  searchingUsers.value = true;
  try {
    const response = await $fetch<{ items: UserResult[] }>("/api/admin/users", { query: { search: userSearch.value, limit: 10 } });
    userResults.value = response.items;
    if (!response.items.length) showToast("Kein Benutzer gefunden", "info");
  } catch (error) { showToast(messageFromError(error), "error"); }
  finally { searchingUsers.value = false; }
}

function selectUser(user: UserResult) {
  memberUserId.value = user.id;
  memberUserLabel.value = user.linkedPlayer?.name || user.email || user.id;
  memberLabels.value[user.id] = memberUserLabel.value;
  userResults.value = [];
}

async function saveMember() {
  if (!selectedId.value || !memberUserId.value) return;
  busy.value = true;
  try {
    await $fetch(`/api/admin/tenants/${encodeURIComponent(selectedId.value)}/members`, {
      method: "PUT", body: { userId: memberUserId.value, role: memberRole.value },
    });
    await loadTenants();
    memberUserId.value = "";
    memberUserLabel.value = "";
    userSearch.value = "";
    showToast("Mitgliedschaft gespeichert", "success");
  } catch (error) { showToast(messageFromError(error), "error"); }
  finally { busy.value = false; }
}

async function removeMember(userId: string) {
  if (!selectedId.value || !confirm("Mitgliedschaft entfernen?")) return;
  busy.value = true;
  try {
    await $fetch(`/api/admin/tenants/${encodeURIComponent(selectedId.value)}/members/${encodeURIComponent(userId)}`, { method: "DELETE" });
    await loadTenants();
    showToast("Mitgliedschaft entfernt", "success");
  } catch (error) { showToast(messageFromError(error), "error"); }
  finally { busy.value = false; }
}
</script>

<style scoped>
.tenant-overview { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.75rem; }
.tenant-overview div, .tenant-panel { border:1px solid var(--app-border); background:var(--app-surface-0); border-radius:5px; }
.tenant-overview div { display:flex; flex-direction:column; gap:.1rem; padding:.65rem .8rem; }
.tenant-overview strong { font-size:1.6rem; color:var(--app-text-primary); line-height:1.1; }
.tenant-overview span, .tenant-facts span { color:var(--app-text-muted); font-size:.76rem; }
.tenant-grid { display:grid; grid-template-columns:minmax(240px,.85fr) minmax(0,1.5fr); gap:.7rem; align-items:start; }
.tenant-panel { padding:.85rem; min-width:0; }
.panel-heading { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:1rem; }
.panel-heading h2 { margin:0; color:var(--app-text-primary); font-size:1.28rem; letter-spacing:-.03em; }
.eyebrow { margin:0 0 .3rem; color:var(--app-accent); font-size:.67rem; letter-spacing:.14em; text-transform:uppercase; font-weight:800; }
.tenant-list { display:flex; flex-direction:column; gap:.45rem; }
.tenant-list-item { display:flex; align-items:center; gap:.6rem; width:100%; padding:.55rem; border:1px solid var(--app-border); border-radius:4px; background:var(--app-surface-1); color:var(--app-text-primary); text-align:left; cursor:pointer; }
.tenant-list-item.selected { outline:2px solid var(--app-accent); background:var(--app-surface-2); }
.tenant-monogram, .member-avatar { flex:none; display:grid; place-items:center; width:2rem; height:2rem; border-radius:3px; background:var(--app-surface-3); color:var(--app-text-primary); font-size:.7rem; font-weight:800; }
.tenant-list-copy, .member-copy { display:flex; flex:1; min-width:0; flex-direction:column; gap:.1rem; }
.tenant-list-copy strong, .member-copy strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.85rem; }
.tenant-list-copy small, .member-copy small { color:var(--app-text-muted); font-size:.72rem; overflow:hidden; text-overflow:ellipsis; }
.status-pill { flex:none; border-radius:3px; padding:.18rem .4rem; background:var(--app-surface-2); color:var(--app-text-secondary); font-size:.67rem; font-weight:800; }
.status-pill.active { background:var(--admin-status-active-bg); color:var(--admin-status-active-text); }
.status-pill.draft { background:var(--admin-status-draft-bg); color:var(--admin-status-draft-text); }
.create-form, .member-form { display:flex; flex-direction:column; gap:.5rem; margin-top:1.25rem; padding-top:1.15rem; border-top:1px solid var(--app-border); }
.create-form h3, .member-form h4 { margin:0; color:var(--app-text-primary); font-size:.93rem; }
.create-form p, .tenant-note, .empty-members { margin:.1rem 0 .4rem; color:var(--app-text-muted); font-size:.79rem; line-height:1.5; }
label { color:var(--app-text-secondary); font-size:.75rem; font-weight:750; }
input, select { width:100%; min-width:0; padding:.5rem .6rem; border:1px solid var(--app-border); border-radius:4px; background:var(--app-surface-1); color:var(--app-text-primary); font:inherit; font-size:.84rem; }
input:focus, select:focus, button:focus-visible { outline:2px solid var(--app-accent); outline-offset:2px; }
.tenant-button { display:inline-flex; align-items:center; justify-content:center; border-radius:4px; padding:.5rem .7rem; border:1px solid var(--app-border); font:inherit; font-size:.78rem; font-weight:800; cursor:pointer; white-space:nowrap; }
.tenant-button.primary { background:var(--app-accent); color:var(--app-surface-0); border-color:var(--app-accent); }
.tenant-button.secondary { background:var(--app-surface-1); color:var(--app-text-primary); }
.tenant-button:disabled { opacity:.5; cursor:not-allowed; }
.tenant-facts { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.5rem; margin:1rem 0; }
.tenant-facts div { display:flex; flex-direction:column; gap:.2rem; padding:.6rem; background:var(--app-surface-1); border:1px solid var(--app-border); border-radius:4px; }
.tenant-facts strong { color:var(--app-text-primary); font-size:1.1rem; }
.detail-form { margin:1.2rem 0; }
.inline-form, .member-controls { display:flex; gap:.5rem; }
.members-heading { display:flex; align-items:end; justify-content:space-between; border-top:1px solid var(--app-border); padding-top:1.2rem; }
.members-heading h3 { margin:0; font-size:1rem; }
.members-heading > span { color:var(--app-text-muted); }
.member-list { display:flex; flex-direction:column; margin-top:.7rem; }
.member-row { display:flex; align-items:center; gap:.6rem; padding:.65rem 0; border-bottom:1px solid var(--app-border); }
.member-avatar { width:1.9rem; height:1.9rem; }
.text-action { border:0; background:transparent; color:var(--app-accent); cursor:pointer; font-size:.73rem; font-weight:750; }
.user-results { display:flex; flex-direction:column; max-height:12rem; overflow:auto; border:1px solid var(--app-border); border-radius:9px; }
.user-results button { display:flex; flex-direction:column; gap:.1rem; padding:.6rem .75rem; border:0; border-bottom:1px solid var(--app-border); background:var(--app-surface-1); color:var(--app-text-primary); text-align:left; cursor:pointer; }
.user-results button:hover { background:var(--app-surface-2); }
.user-results small, .selected-user { color:var(--app-text-muted); font-size:.74rem; }
.member-controls select { flex:1; }
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
@media (max-width:850px) { .tenant-grid { grid-template-columns:1fr; } }
@media (max-width:540px) { .tenant-panel { padding:.9rem; } .tenant-overview { gap:.4rem; } .tenant-overview div { padding:.75rem; } .tenant-overview strong { font-size:1.28rem; } .tenant-list-item { flex-wrap:wrap; } .inline-form, .member-controls { flex-wrap:wrap; } .inline-form input, .member-controls select { flex-basis:100%; } }
</style>
