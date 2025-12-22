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

      <div v-else-if="paginatedPlayers.length > 0">
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Player ID</th>
                <th>Name</th>
                <th>Birth Date</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="player in paginatedPlayers" :key="player.id">
                <td class="font-mono">{{ player.playerId }}</td>
                <td>{{ player.name }}</td>
                <td>{{ formatDate(player.birthDate) }}</td>
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

        <!-- Pagination Controls -->
        <div class="pagination" v-if="totalPages > 1">
          <button
            @click="goToPage(currentPage - 1)"
            :disabled="currentPage === 1"
            class="pagination-btn"
          >
            &laquo; Previous
          </button>

          <button
            v-if="pageNumbers[0] > 1"
            @click="goToPage(1)"
            class="pagination-btn"
          >
            1
          </button>
          <span v-if="pageNumbers[0] > 2" class="pagination-ellipsis">...</span>

          <button
            v-for="page in pageNumbers"
            :key="page"
            @click="goToPage(page)"
            :class="['pagination-btn', { active: currentPage === page }]"
          >
            {{ page }}
          </button>

          <span
            v-if="pageNumbers[pageNumbers.length - 1] < totalPages - 1"
            class="pagination-ellipsis"
            >...</span
          >
          <button
            v-if="pageNumbers[pageNumbers.length - 1] < totalPages"
            @click="goToPage(totalPages)"
            class="pagination-btn"
          >
            {{ totalPages }}
          </button>

          <button
            @click="goToPage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="pagination-btn"
          >
            Next &raquo;
          </button>
        </div>

        <!-- Results info -->
        <div class="pagination-info">
          Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
          {{ Math.min(currentPage * itemsPerPage, filteredPlayers.length) }} of
          {{ filteredPlayers.length }} player{{
            filteredPlayers.length !== 1 ? "s" : ""
          }}
          <span v-if="searchTerm"
            >(filtered from {{ players.length }} total)</span
          >
        </div>
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
const currentPage = ref(1);
const itemsPerPage = 10;

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
  // Reset to first page when filter changes
  currentPage.value = 1;

  if (!searchTerm.value) return players.value;

  const search = searchTerm.value.toLowerCase();
  return players.value.filter(
    (player) =>
      player.name.toLowerCase().includes(search) ||
      player.playerId.toLowerCase().includes(search) ||
      player.email?.toLowerCase().includes(search)
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

const pageNumbers = computed(() => {
  const pages = [];
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages.value, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  return pages;
});

// Methods
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
      "/api/admin/players?limit=1000"
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
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  min-width: 2.5rem;
}

.pagination-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
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
  color: #6b7280;
}

.pagination-info {
  text-align: center;
  margin-top: 1rem;
  color: #6b7280;
  font-size: 0.875rem;
}
</style>
