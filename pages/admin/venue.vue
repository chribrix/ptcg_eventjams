<template>
  <AdminPageLayout
    :title="t('admin.venue.title')"
    :subtitle="t('admin.venue.subtitle')"
  >
    <template #actions>
      <button class="btn btn-primary" @click="openCreateModal">
        {{ t("admin.venue.addVenue") }}
      </button>
    </template>

    <div class="admin-card">
      <div class="section-header">
        <div class="search-box">
          <input
            v-model="searchTerm"
            type="text"
            class="search-input"
            :placeholder="t('admin.venue.searchPlaceholder')"
          />
        </div>
      </div>

      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>{{ t("admin.venue.columns.organization") }}</th>
              <th>{{ t("admin.venue.columns.venue") }}</th>
              <th>{{ t("admin.venue.columns.updated") }}</th>
              <th>{{ t("common.actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="4" class="empty-state">
                {{ t("admin.venue.loading") }}
              </td>
            </tr>
            <tr v-else-if="filteredVenues.length === 0">
              <td colspan="4" class="empty-state">
                {{ t("admin.venue.empty") }}
              </td>
            </tr>
            <tr v-for="venue in filteredVenues" :key="venue.id">
              <td>{{ venue.organizationName }}</td>
              <td>{{ venue.venueName }}</td>
              <td>{{ formatDate(venue.updatedAt) }}</td>
              <td>
                <div class="action-row">
                  <button class="btn btn-secondary btn-sm" @click="openEditModal(venue)">
                    {{ t("common.edit") }}
                  </button>
                  <button class="btn btn-danger btn-sm" @click="deleteVenue(venue)">
                    {{ t("common.delete") }}
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
          <h2>
            {{
              editingVenue
                ? t("admin.venue.modal.editTitle")
                : t("admin.venue.modal.createTitle")
            }}
          </h2>
          <button class="btn-close" @click="closeModal">×</button>
        </div>

        <form class="modal-body venue-form" @submit.prevent="saveVenue">
          <div class="form-row">
            <div class="form-group">
              <label for="organizationName">
                {{ t("admin.venue.columns.organization") }}
              </label>
              <input
                id="organizationName"
                v-model="venueForm.organizationName"
                type="text"
                class="form-input"
                required
              />
            </div>

            <div class="form-group">
              <label for="venueName">{{ t("admin.venue.columns.venue") }}</label>
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
              {{ t("common.cancel") }}
            </button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{
                saving
                  ? t("admin.venue.modal.saving")
                  : editingVenue
                    ? t("admin.venue.modal.update")
                    : t("admin.venue.modal.create")
              }}
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
const { t, locale } = useI18n();

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
      t("admin.venue.confirmDelete", {
        organization: venue.organizationName,
        venue: venue.venueName,
      }),
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
    locale.value === "de" ? "de-DE" : "en-US",
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
