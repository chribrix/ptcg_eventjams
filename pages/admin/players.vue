<template>
  <div class="admin-players">
    <div class="page-header">
      <h1 class="page-title">Players Management</h1>
      <button @click="showCreateForm = true" class="btn btn-primary">
        Add New Player
      </button>
    </div>

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
    <div class="players-section">
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

      <div v-else-if="filteredPlayers.length > 0" class="players-table">
        <table>
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

      <div v-else class="no-players">
        No players found. Add your first player!
      </div>
    </div>
  </div>
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

// Load players on mount
onMounted(loadPlayers);
</script>

<style scoped>
.admin-players {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background-color: #4b5563;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-danger:hover {
  background-color: #dc2626;
}

.btn-small {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #374151;
}

.player-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input:disabled {
  background-color: #f9fafb;
  color: #6b7280;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.players-section {
  margin-top: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.search-input {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  width: 250px;
}

.players-table {
  background: white;
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.players-table table {
  width: 100%;
  border-collapse: collapse;
}

.players-table th,
.players-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.players-table th {
  font-weight: 600;
  background-color: #f9fafb;
  color: #374151;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.no-players {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
  background: white;
  border-radius: 0.5rem;
}
</style>
