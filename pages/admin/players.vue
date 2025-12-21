<template>
  <AdminPageLayout title="Players Management">
    <template #actions>
      <button @click="showCreateForm = true" class="btn btn-primary">
        Add New Player
      </button>
    </template>

    <!-- Create/Edit Player Modal -->
    <div
      v-if="showCreateForm || editingPlayer"
      class="modal-overlay"
      @click="closeModal"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ editingPlayer ? "Edit Player" : "Add New Player" }}</h2>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>

        <form @submit.prevent="savePlayer" class="player-form">
          <div class="form-group">
            <label for="playerId">Player ID *</label>
            <input
              id="playerId"
              v-model="playerForm.playerId"
              type="text"
              required
              class="form-input"
              placeholder="e.g., TCG001"
              :disabled="!!editingPlayer"
            />
          </div>

          <div class="form-group">
            <label for="name">Full Name *</label>
            <input
              id="name"
              v-model="playerForm.name"
              type="text"
              required
              class="form-input"
              placeholder="Player full name"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="birthDate">Birth Date *</label>
              <input
                id="birthDate"
                v-model="playerForm.birthDate"
                type="date"
                required
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="email">Email</label>
              <input
                id="email"
                v-model="playerForm.email"
                type="email"
                class="form-input"
                placeholder="player@example.com"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="phone">Phone</label>
              <input
                id="phone"
                v-model="playerForm.phone"
                type="tel"
                class="form-input"
                placeholder="+1234567890"
              />
            </div>

            <div class="form-group">
              <label for="emergencyContact">Emergency Contact</label>
              <input
                id="emergencyContact"
                v-model="playerForm.emergencyContact"
                type="text"
                class="form-input"
                placeholder="Contact name"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="emergencyPhone">Emergency Phone</label>
            <input
              id="emergencyPhone"
              v-model="playerForm.emergencyPhone"
              type="tel"
              class="form-input"
              placeholder="+1234567890"
            />
          </div>

          <div class="form-actions">
            <button type="button" @click="closeModal" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="saving" class="btn btn-primary">
              {{
                saving
                  ? "Saving..."
                  : editingPlayer
                  ? "Update Player"
                  : "Add Player"
              }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Players List -->
    <div class="admin-card">
      <div class="section-header">
        <h2>Players</h2>
        <div class="search-box">
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Search players..."
            class="search-input"
          />
        </div>
      </div>

      <div v-if="loading" class="loading">Loading players...</div>

      <div v-else-if="filteredPlayers.length > 0" class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Player ID</th>
              <th>Name</th>
              <th>Birth Date</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="player in filteredPlayers" :key="player.id">
              <td class="font-mono">{{ player.playerId }}</td>
              <td>{{ player.name }}</td>
              <td>{{ formatDate(player.birthDate) }}</td>
              <td>{{ player.email || "N/A" }}</td>
              <td>{{ player.phone || "N/A" }}</td>
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
                    Edit
                  </button>
                  <button
                    @click="deletePlayer(player)"
                    class="btn btn-small btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="no-data">No players found. Add your first player!</div>
    </div>
  </AdminPageLayout>
</template>

<script setup lang="ts">
interface Player {
  id: string;
  playerId: string;
  name: string;
  birthDate: string;
  email?: string;
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  createdAt: string;
  updatedAt: string;
}

// Page metadata
definePageMeta({
  layout: "products",
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

// Form data
const playerForm = ref({
  playerId: "",
  name: "",
  birthDate: "",
  email: "",
  phone: "",
  emergencyContact: "",
  emergencyPhone: "",
});

// Computed
const filteredPlayers = computed(() => {
  if (!searchTerm.value) return players.value;

  const search = searchTerm.value.toLowerCase();
  return players.value.filter(
    (player) =>
      player.name.toLowerCase().includes(search) ||
      player.playerId.toLowerCase().includes(search) ||
      player.email?.toLowerCase().includes(search)
  );
});

// Methods
const loadPlayers = async () => {
  try {
    loading.value = true;
    const response = await $fetch<{ players: Player[] }>("/api/admin/players");
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
      birthDate: new Date(playerForm.value.birthDate).toISOString(),
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
    birthDate: new Date(player.birthDate).toISOString().slice(0, 10),
    email: player.email || "",
    phone: player.phone || "",
    emergencyContact: player.emergencyContact || "",
    emergencyPhone: player.emergencyPhone || "",
  };
};

const deletePlayer = async (player: Player) => {
  if (
    !confirm(
      `Are you sure you want to delete player "${player.name}" (${player.playerId})?`
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
    birthDate: "",
    email: "",
    phone: "",
    emergencyContact: "",
    emergencyPhone: "",
  };
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
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

.player-form {
  padding: 1.5rem;
}
</style>
