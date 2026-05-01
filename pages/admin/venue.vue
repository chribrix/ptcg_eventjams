<template>
  <AdminPageLayout
    title="Venue Directory"
    subtitle="Manage linked host organizations and venue names used during event creation."
  >
    <template #actions>
      <button class="btn btn-primary" @click="openCreateModal">
        Add Venue
      </button>
    </template>

    <div class="admin-card">
      <div class="section-header">
        <div class="search-box">
          <input
            v-model="searchTerm"
            type="text"
            class="search-input"
            placeholder="Search by organization or venue"
          />
        </div>
      </div>

      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Host Organization</th>
              <th>Venue</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="4" class="empty-state">Loading venues...</td>
            </tr>
            <tr v-else-if="filteredVenues.length === 0">
              <td colspan="4" class="empty-state">No venue entries found.</td>
            </tr>
            <tr v-for="venue in filteredVenues" :key="venue.id">
              <td>{{ venue.organizationName }}</td>
              <td>{{ venue.venueName }}</td>
              <td>{{ formatDate(venue.updatedAt) }}</td>
              <td>
                <div class="action-row">
                  <button class="btn btn-secondary btn-sm" @click="openEditModal(venue)">
                    Edit
                  </button>
                  <button class="btn btn-danger btn-sm" @click="deleteVenue(venue)">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content venue-modal" @click.stop>
        <div class="modal-header">
          <h2>{{ editingVenue ? "Edit Venue" : "Add Venue" }}</h2>
          <button class="btn-close" @click="closeModal">×</button>
        </div>

        <form class="modal-body venue-form" @submit.prevent="saveVenue">
          <div class="form-row">
            <div class="form-group">
              <label for="organizationName">Host Organization</label>
              <input
                id="organizationName"
                v-model="venueForm.organizationName"
                type="text"
                class="form-input"
                required
              />
            </div>

            <div class="form-group">
              <label for="venueName">Venue</label>
              <input
                id="venueName"
                v-model="venueForm.venueName"
                type="text"
                class="form-input"
                required
              />
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="closeModal">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? "Saving..." : editingVenue ? "Update Venue" : "Create Venue" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AdminPageLayout>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { formatDateInTimeZone, getUserTimeZone } from "~/utils/eventDateTime";

type VenueDirectoryEntry = {
  id: string;
  organizationName: string;
  venueName: string;
  createdAt: string;
  updatedAt: string;
};

const venues = ref<VenueDirectoryEntry[]>([]);
const loading = ref(true);
const saving = ref(false);
const searchTerm = ref("");
const showModal = ref(false);
const editingVenue = ref<VenueDirectoryEntry | null>(null);
const userTimeZone = getUserTimeZone();

const venueForm = ref({
  organizationName: "",
  venueName: "",
});

const filteredVenues = computed(() => {
  const search = searchTerm.value.trim().toLowerCase();

  if (!search) {
    return venues.value;
  }

  return venues.value.filter(
    (venue) =>
      venue.organizationName.toLowerCase().includes(search) ||
      venue.venueName.toLowerCase().includes(search),
  );
});

const loadVenues = async () => {
  loading.value = true;
  try {
    const response = await $fetch<{ venues: VenueDirectoryEntry[] }>(
      "/api/admin/venues",
    );
    venues.value = response.venues || [];
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  editingVenue.value = null;
  venueForm.value = {
    organizationName: "",
    venueName: "",
  };
  showModal.value = true;
};

const openEditModal = (venue: VenueDirectoryEntry) => {
  editingVenue.value = venue;
  venueForm.value = {
    organizationName: venue.organizationName,
    venueName: venue.venueName,
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingVenue.value = null;
};

const saveVenue = async () => {
  saving.value = true;
  try {
    if (editingVenue.value) {
      await $fetch(`/api/admin/venues?id=${editingVenue.value.id}`, {
        method: "PUT",
        body: venueForm.value,
      });
    } else {
      await $fetch("/api/admin/venues", {
        method: "POST",
        body: venueForm.value,
      });
    }

    await loadVenues();
    closeModal();
  } finally {
    saving.value = false;
  }
};

const deleteVenue = async (venue: VenueDirectoryEntry) => {
  if (
    !confirm(
      `Delete the venue mapping "${venue.organizationName}" → "${venue.venueName}"?`,
    )
  ) {
    return;
  }

  await $fetch(`/api/admin/venues?id=${venue.id}`, {
    method: "DELETE",
  });

  await loadVenues();
};

const formatDate = (value: string) =>
  formatDateInTimeZone(
    value,
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
    "de-DE",
    userTimeZone,
  );

onMounted(loadVenues);
</script>

<style scoped>
@import "~/assets/css/admin-shared.css";

.empty-state {
  text-align: center;
  color: #64748b;
}

.action-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.venue-modal {
  max-width: 760px;
}

.venue-form {
  padding: 1.5rem;
}
</style>
