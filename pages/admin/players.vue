<template>
  <AdminPageLayout
    title="Spielerverwaltung"
    subtitle="Spielerdaten, Kontakte und Kontoverknüpfungen verwalten"
  >
    <template #actions>
      <button @click="showCreateForm = true" class="btn btn-primary">
        Spieler hinzufügen
      </button>
    </template>

    <!-- Create/Edit Player Modal -->
    <AppModal
      v-if="showCreateForm || editingPlayer"
      :title="editingPlayer ? 'Spieler bearbeiten' : 'Spieler hinzufügen'"
      subtitle="Spielerdaten und Kontaktinformationen"
      size="lg"
      @close="closeModal"
    >
      <form id="player-admin-form" @submit.prevent="savePlayer" class="player-form">
          <AppFormField
            label="Spieler-ID"
            for-id="playerId"
            hint="Die Spieler-ID darf nur Zahlen enthalten."
            required
          >
            <input
              id="playerId"
              v-model="playerForm.playerId"
              type="text"
              inputmode="numeric"
              pattern="\d*"
              required
              class="form-input"
              placeholder="z. B. 123456"
              :disabled="!!editingPlayer"
              @input="validatePlayerIdAdmin"
            />
          </AppFormField>

          <AppFormField label="Vollständiger Name" for-id="name" required>
            <input
              id="name"
              v-model="playerForm.name"
              type="text"
              required
              class="form-input"
              placeholder="Vor- und Nachname"
            />
          </AppFormField>

          <div class="form-row">
            <AppFormField label="Geburtsjahr" for-id="birthYear" required>
              <input
                id="birthYear"
                v-model.number="playerForm.birthYear"
                type="number"
                min="1900"
                :max="new Date().getFullYear()"
                required
                class="form-input"
              />
            </AppFormField>

            <AppFormField label="E-Mail" for-id="email">
              <input
                id="email"
                v-model="playerForm.email"
                type="email"
                class="form-input"
                placeholder="player@example.com"
              />
            </AppFormField>
          </div>

          <div class="form-row">
            <AppFormField label="Telefon" for-id="phone">
              <input
                id="phone"
                v-model="playerForm.phone"
                type="tel"
                class="form-input"
              placeholder="+49 …"
            />
            </AppFormField>

            <AppFormField label="Notfallkontakt" for-id="emergencyContact">
              <input
                id="emergencyContact"
                v-model="playerForm.emergencyContact"
                type="text"
                class="form-input"
              placeholder="Name des Kontakts"
            />
            </AppFormField>
          </div>

          <AppFormField label="Notfallnummer" for-id="emergencyPhone">
            <input
              id="emergencyPhone"
              v-model="playerForm.emergencyPhone"
              type="tel"
              class="form-input"
              placeholder="+49 …"
            />
          </AppFormField>
      </form>

      <template #footer>
        <button type="button" @click="closeModal" class="btn btn-secondary">
          Abbrechen
        </button>
        <button
          type="submit"
          form="player-admin-form"
          :disabled="saving"
          class="btn btn-primary"
        >
          {{ saving ? "Speichert …" : editingPlayer ? "Aktualisieren" : "Hinzufügen" }}
        </button>
      </template>
    </AppModal>

    <!-- Players List -->
    <AppPanel title="Spieler" flush>
      <template #actions>
        <AppSearchField
          v-model="searchTerm"
          class="players-search"
          placeholder="Spieler suchen …"
        />
      </template>

      <AppStatePanel v-if="loading" kind="loading" message="Spieler werden geladen …" />

      <div v-else-if="paginatedPlayers.length > 0">
        <AppDataTable>
            <thead>
              <tr>
                <th>Spieler-ID</th>
                <th>Name</th>
                <th>Geburtsjahr</th>
                <th>E-Mail</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="player in paginatedPlayers" :key="player.id">
                <td class="font-mono">{{ player.playerId }}</td>
                <td>{{ player.name }}</td>
                <td>{{ player.birthYear }}</td>
                <td>{{ player.email || "N/A" }}</td>
                <td>
                  <div class="action-buttons">
                    <button
                      @click="impersonatePlayer(player)"
                      class="btn btn-small btn-info"
                      title="Als dieser Spieler anmelden"
                    >
                      Imitieren
                    </button>
                    <button
                      @click="editPlayer(player)"
                      class="btn btn-small btn-secondary"
                    >
                      Bearbeiten
                    </button>
                    <button
                      @click="deletePlayer(player)"
                      class="btn btn-small btn-danger"
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
        </AppDataTable>

        <!-- Results info -->
        <div class="pagination-info">
          {{ (currentPage - 1) * itemsPerPage + 1 }}–{{
            Math.min(currentPage * itemsPerPage, filteredPlayers.length)
          }} von {{ filteredPlayers.length }} Spielern
          <span v-if="searchTerm"
            >({{ players.length }} insgesamt)</span
          >
        </div>
      </div>

      <AppStatePanel
        v-else
        kind="empty"
        title="Keine Spieler gefunden"
        message="Passe die Suche an oder lege einen neuen Spieler an."
      />

      <template v-if="totalPages > 1" #footer>
        <AppPagination :page="currentPage" :pages="totalPages" @change="goToPage" />
      </template>
    </AppPanel>
  </AdminPageLayout>
</template>

<script setup lang="ts">
interface Player {
  id: string;
  playerId: string;
  name: string;
  birthYear: number;
  email?: string;
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  createdAt: string;
  updatedAt: string;
}

// Page metadata
definePageMeta({
  layout: "default",
});

// Composables
const { startImpersonation } = useImpersonation();
const router = useRouter();

// Reactive data
const players = ref<Player[]>([]);
const loading = ref(true);
const saving = ref(false);
const showCreateForm = ref(false);
const editingPlayer = ref<Player | null>(null);
const searchTerm = ref("");
const currentPage = ref(1);
const itemsPerPage = 10;

// Form data
const playerForm = ref({
  playerId: "",
  name: "",
  birthYear: new Date().getFullYear(),
  email: "",
  phone: "",
  emergencyContact: "",
  emergencyPhone: "",
});

// Computed
const filteredPlayers = computed(() => {
  // Reset to first page when filter changes
  currentPage.value = 1;

  if (!searchTerm.value) return players.value;

  const search = searchTerm.value.toLowerCase();
  return players.value.filter(
    (player) =>
      player.name.toLowerCase().includes(search) ||
      player.playerId.toLowerCase().includes(search) ||
      player.email?.toLowerCase().includes(search),
  );
});

const totalPages = computed(() => {
  return Math.ceil(filteredPlayers.value.length / itemsPerPage);
});

const paginatedPlayers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredPlayers.value.slice(start, end);
});

// Methods
const validatePlayerIdAdmin = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  const value = target.value;

  // Remove any non-numeric characters
  const numericOnly = value.replace(/\D/g, "");

  // Update the form with the cleaned value
  playerForm.value.playerId = numericOnly;

  // Update the input value directly to reflect the change
  target.value = numericOnly;
};

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const loadPlayers = async () => {
  try {
    loading.value = true;
    // Request all players by setting a high limit
    const response = await $fetch<{ players: Player[] }>(
      "/api/admin/players?limit=1000",
    );
    players.value = response.players || [];
  } catch (error) {
    console.error("Error loading players:", error);
    // TODO: Show error message
  } finally {
    loading.value = false;
  }
};

const savePlayer = async () => {
  try {
    saving.value = true;

    const playerData = {
      ...playerForm.value,
      email: playerForm.value.email || undefined,
      phone: playerForm.value.phone || undefined,
      emergencyContact: playerForm.value.emergencyContact || undefined,
      emergencyPhone: playerForm.value.emergencyPhone || undefined,
    };

    if (editingPlayer.value) {
      await $fetch(`/api/admin/players?id=${editingPlayer.value.id}`, {
        method: "PUT",
        body: playerData,
      });
    } else {
      await $fetch("/api/admin/players", {
        method: "POST",
        body: playerData,
      });
    }

    await loadPlayers();
    closeModal();
    // TODO: Show success message
  } catch (error) {
    console.error("Error saving player:", error);
    // TODO: Show error message
  } finally {
    saving.value = false;
  }
};

const editPlayer = (player: Player) => {
  editingPlayer.value = player;
  playerForm.value = {
    playerId: player.playerId,
    name: player.name,
    birthYear: player.birthYear,
    email: player.email || "",
    phone: player.phone || "",
    emergencyContact: player.emergencyContact || "",
    emergencyPhone: player.emergencyPhone || "",
  };
};

const deletePlayer = async (player: Player) => {
  if (
    !confirm(
      `Are you sure you want to delete player "${player.name}" (${player.playerId})?`,
    )
  )
    return;

  try {
    await $fetch(`/api/admin/players?id=${player.id}`, {
      method: "DELETE",
    });
    await loadPlayers();
    // TODO: Show success message
  } catch (error) {
    console.error("Error deleting player:", error);
    // TODO: Show error message
  }
};

const closeModal = () => {
  showCreateForm.value = false;
  editingPlayer.value = null;
  playerForm.value = {
    playerId: "",
    name: "",
    birthYear: new Date().getFullYear(),
    email: "",
    phone: "",
    emergencyContact: "",
    emergencyPhone: "",
  };
};

const impersonatePlayer = (player: Player) => {
  startImpersonation({
    id: player.playerId,
    name: player.name,
    email: player.email || "",
  });
  // Redirect to dashboard to see the player's view
  router.push("/dashboard");
};

// Load players on mount
onMounted(loadPlayers);
</script>

<style scoped>
@import "~/assets/css/admin-shared.css";

.action-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.players-search {
  width: min(100%, 22rem);
}

@media (min-width: 640px) {
  .players-search {
    min-width: 18rem;
  }
}

.player-form {
  padding: 1.5rem;
}

.form-hint {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

.pagination-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--admin-border, rgba(148, 163, 184, 0.18));
  background: rgba(15, 23, 42, 0.88);
  color: var(--admin-text, #e5eefb);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  min-width: 2.5rem;
}

.pagination-btn:hover:not(:disabled) {
  background: rgba(30, 41, 59, 0.94);
  border-color: var(--admin-accent, #38bdf8);
}

.pagination-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-ellipsis {
  padding: 0.5rem;
  color: var(--admin-muted, #94a3b8);
}

.pagination-info {
  text-align: center;
  margin-top: 1rem;
  color: var(--admin-muted, #94a3b8);
  font-size: 0.875rem;
}
</style>
