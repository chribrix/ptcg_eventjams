<template>
  <div class="external-events-admin">
    <div class="header">
      <h1>External Event Overrides</h1>
      <p class="subtitle">Customize details for events from pokedata.ovh</p>
    </div>

    <div v-if="loading" class="loading">
      <p>Loading events...</p>
    </div>

    <div v-else-if="error" class="error-message">
      <p>Error: {{ error }}</p>
    </div>

    <div v-else class="events-list">
      <div
        v-for="event in paginatedEvents"
        :key="event.id"
        class="event-card"
        :class="{ 'has-override': hasOverride(event) }"
      >
        <div class="event-header">
          <div class="event-info">
            <h3>{{ event.venue }}</h3>
            <div class="event-meta">
              <span class="event-date">{{ formatDate(event.dateTime) }}</span>
              <span class="event-type" :class="`type-${event.icon}`">
                {{ getEventTypeName(event.icon) }}
              </span>
              <span v-if="event.location" class="event-location">
                {{ event.location }}, {{ event.country }}
              </span>
            </div>
          </div>
          <div class="event-actions">
            <span v-if="hasOverride(event)" class="override-badge">
              Modified
            </span>
            <button
              @click="openEditModal(event)"
              class="btn-edit"
              :class="{ 'btn-edit-active': hasOverride(event) }"
            >
              {{ hasOverride(event) ? "Edit Override" : "Add Override" }}
            </button>
          </div>
        </div>

        <div v-if="event.link" class="event-link">
          <a :href="event.link" target="_blank" rel="noopener noreferrer">
            {{ event.link }}
          </a>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          @click="currentPage--"
          :disabled="currentPage === 1"
          class="btn-page"
        >
          Previous
        </button>
        <span class="page-info">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button
          @click="currentPage++"
          :disabled="currentPage === totalPages"
          class="btn-page"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ editingOverride ? "Edit" : "Add" }} Override</h2>
          <button @click="closeModal" class="btn-close">×</button>
        </div>

        <div class="modal-body">
          <div class="event-details">
            <p><strong>Event:</strong> {{ selectedEvent?.venue }}</p>
            <p>
              <strong>Date:</strong> {{ formatDate(selectedEvent?.dateTime) }}
            </p>
            <p>
              <strong>Location:</strong> {{ selectedEvent?.location }},
              {{ selectedEvent?.country }}
            </p>
          </div>

          <form @submit.prevent="saveOverride">
            <div class="form-group">
              <label>Venue Name Override</label>
              <input
                v-model="overrideForm.venue"
                type="text"
                placeholder="Leave empty to use original"
              />
            </div>

            <div class="form-group">
              <label>Title Override</label>
              <input
                v-model="overrideForm.title"
                type="text"
                placeholder="Leave empty to use original"
              />
            </div>

            <div class="form-group">
              <label>Registration Link Override</label>
              <input
                v-model="overrideForm.link"
                type="url"
                placeholder="Leave empty to use original"
              />
            </div>

            <div class="form-group">
              <label>Cost Override</label>
              <input
                v-model="overrideForm.cost"
                type="text"
                placeholder="e.g., €10, Free"
              />
            </div>

            <div class="form-group">
              <label>Street Address Override</label>
              <input
                v-model="overrideForm.streetAddress"
                type="text"
                placeholder="Full street address"
              />
            </div>

            <div class="form-group">
              <label>Description Override</label>
              <textarea
                v-model="overrideForm.description"
                rows="4"
                placeholder="Custom description for this event"
              />
            </div>

            <!-- Local Registration Section -->
            <div class="form-section">
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input
                    v-model="overrideForm.handleRegistrationLocally"
                    type="checkbox"
                  />
                  <span>Handle registration locally (in our system)</span>
                </label>
                <p class="help-text">
                  Enable this to manage registrations through our platform
                  instead of external link
                </p>
              </div>

              <template v-if="overrideForm.handleRegistrationLocally">
                <div class="form-group">
                  <label>Max Participants</label>
                  <input
                    v-model.number="overrideForm.maxParticipants"
                    type="number"
                    min="1"
                    placeholder="e.g., 32"
                  />
                </div>

                <div class="form-group">
                  <label>Participation Fee (€)</label>
                  <input
                    v-model.number="overrideForm.participationFee"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 10.00"
                  />
                </div>

                <div class="form-group">
                  <label>Registration Deadline</label>
                  <input
                    v-model="overrideForm.registrationDeadline"
                    type="datetime-local"
                  />
                </div>

                <div class="form-group checkbox-group">
                  <label class="checkbox-label">
                    <input
                      v-model="overrideForm.requiresDecklist"
                      type="checkbox"
                    />
                    <span>Requires Decklist</span>
                  </label>
                </div>

                <div class="form-group">
                  <label>Event Description (for registration page)</label>
                  <textarea
                    v-model="overrideForm.eventDescription"
                    rows="3"
                    placeholder="Additional details for players registering..."
                  />
                </div>
              </template>
            </div>

            <div class="form-group">
              <label>Admin Notes (internal)</label>
              <textarea
                v-model="overrideForm.notes"
                rows="2"
                placeholder="Why this override exists..."
              />
            </div>

            <div class="modal-actions">
              <button
                v-if="editingOverride"
                @click="deleteOverride"
                type="button"
                class="btn-delete"
                :disabled="saving"
              >
                Delete Override
              </button>
              <button type="button" @click="closeModal" class="btn-cancel">
                Cancel
              </button>
              <button type="submit" class="btn-save" :disabled="saving">
                {{ saving ? "Saving..." : "Save Override" }}
              </button>
            </div>
          </form>
        </div>

        <p v-if="modalError" class="error-message">{{ modalError }}</p>
        <p v-if="modalSuccess" class="success-message">{{ modalSuccess }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAdmin } from "~/composables/useAdmin";

// Admin route - protected by global admin middleware

const eventStore = useEventStore();

interface ParsedEvent {
  id: string;
  title: string;
  dateTime: string;
  venue: string;
  location: string;
  country: string;
  link: string;
  icon?: string;
  cost?: string;
  streetAddress?: string;
  description?: string;
  isOverridden?: boolean;
}

interface EventOverride {
  id: string;
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  overrides: Record<string, any>;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const { adminUser } = useAdmin();

const events = ref<ParsedEvent[]>([]);
const overrides = ref<EventOverride[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const showModal = ref(false);
const selectedEvent = ref<ParsedEvent | null>(null);
const editingOverride = ref<EventOverride | null>(null);
const saving = ref(false);
const modalError = ref<string | null>(null);
const modalSuccess = ref<string | null>(null);

const overrideForm = ref({
  venue: "",
  title: "",
  link: "",
  cost: "",
  streetAddress: "",
  description: "",
  handleRegistrationLocally: false,
  maxParticipants: null as number | null,
  participationFee: null as number | null,
  registrationDeadline: "",
  requiresDecklist: false,
  eventDescription: "",
  notes: "",
});

// Pagination
const currentPage = ref(1);
const itemsPerPage = 10;

const totalPages = computed(() =>
  Math.ceil(events.value.length / itemsPerPage)
);

const paginatedEvents = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return events.value.slice(start, end);
});

// Check if event has an override
function hasOverride(event: ParsedEvent): boolean {
  return overrides.value.some((o) => {
    const nameMatch =
      o.eventName.toLowerCase().trim() === event.venue.toLowerCase().trim();
    const eventDate = new Date(event.dateTime).toISOString().split("T")[0];
    const overrideDate = new Date(o.eventDate).toISOString().split("T")[0];
    return nameMatch && eventDate === overrideDate;
  });
}

// Get existing override for event
function getOverride(event: ParsedEvent): EventOverride | undefined {
  return overrides.value.find((o) => {
    const nameMatch =
      o.eventName.toLowerCase().trim() === event.venue.toLowerCase().trim();
    const eventDate = new Date(event.dateTime).toISOString().split("T")[0];
    const overrideDate = new Date(o.eventDate).toISOString().split("T")[0];
    return nameMatch && eventDate === overrideDate;
  });
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getEventTypeName(icon: string | undefined): string {
  const types: Record<string, string> = {
    cup: "League Cup",
    chall: "League Challenge",
    local: "Local Event",
    custom: "Custom Event",
  };
  return types[icon || ""] || "Event";
}

function openEditModal(event: ParsedEvent) {
  selectedEvent.value = event;
  const existing = getOverride(event);

  if (existing) {
    editingOverride.value = existing;
    const overrideData = existing.overrides as any;
    const override = existing as any; // Cast to access registration fields
    overrideForm.value = {
      venue: overrideData.venue || "",
      title: overrideData.title || "",
      link: overrideData.link || "",
      cost: overrideData.cost || "",
      streetAddress: overrideData.streetAddress || "",
      description: overrideData.description || "",
      handleRegistrationLocally: override.handleRegistrationLocally || false,
      maxParticipants: override.maxParticipants || null,
      participationFee: override.participationFee
        ? Number(override.participationFee)
        : null,
      registrationDeadline: override.registrationDeadline
        ? new Date(override.registrationDeadline).toISOString().slice(0, 16)
        : "",
      requiresDecklist: override.requiresDecklist || false,
      eventDescription: override.description || "",
      notes: existing.notes || "",
    };
  } else {
    editingOverride.value = null;
    overrideForm.value = {
      venue: "",
      title: "",
      link: "",
      cost: "",
      streetAddress: "",
      description: "",
      handleRegistrationLocally: false,
      maxParticipants: null,
      participationFee: null,
      registrationDeadline: "",
      requiresDecklist: false,
      eventDescription: "",
      notes: "",
    };
  }

  showModal.value = true;
  modalError.value = null;
  modalSuccess.value = null;
}

function closeModal() {
  showModal.value = false;
  selectedEvent.value = null;
  editingOverride.value = null;
}

async function saveOverride() {
  if (!selectedEvent.value || !adminUser.value?.id) return;

  saving.value = true;
  modalError.value = null;
  modalSuccess.value = null;

  try {
    // Build overrides object with only non-empty fields
    const overridesData: Record<string, any> = {};

    // Always preserve the original event type and icon
    if (selectedEvent.value.type) overridesData.type = selectedEvent.value.type;
    if (selectedEvent.value.icon) overridesData.icon = selectedEvent.value.icon;

    // Add custom overrides
    if (overrideForm.value.venue)
      overridesData.venue = overrideForm.value.venue;
    if (overrideForm.value.title)
      overridesData.title = overrideForm.value.title;
    if (overrideForm.value.link) overridesData.link = overrideForm.value.link;
    if (overrideForm.value.cost) overridesData.cost = overrideForm.value.cost;
    if (overrideForm.value.streetAddress)
      overridesData.streetAddress = overrideForm.value.streetAddress;
    if (overrideForm.value.description)
      overridesData.description = overrideForm.value.description;

    const payload: any = {
      eventName: selectedEvent.value.venue,
      eventDate: selectedEvent.value.dateTime,
      eventLocation: selectedEvent.value.location,
      overrides: overridesData,
      notes: overrideForm.value.notes || null,
      createdBy: adminUser.value.id,
      // Registration handling fields
      handleRegistrationLocally: overrideForm.value.handleRegistrationLocally,
    };

    // Add registration fields if handling locally
    if (overrideForm.value.handleRegistrationLocally) {
      payload.maxParticipants = overrideForm.value.maxParticipants;
      payload.participationFee = overrideForm.value.participationFee;
      payload.registrationDeadline = overrideForm.value.registrationDeadline
        ? new Date(overrideForm.value.registrationDeadline).toISOString()
        : null;
      payload.requiresDecklist = overrideForm.value.requiresDecklist;
      payload.description = overrideForm.value.eventDescription;
    }

    if (editingOverride.value) {
      // Update existing override
      await $fetch(`/api/admin/event-overrides/${editingOverride.value.id}`, {
        method: "PUT",
        body: payload,
      });
      modalSuccess.value = "Override updated successfully!";
    } else {
      // Create new override
      await $fetch("/api/admin/event-overrides", {
        method: "POST",
        body: payload,
      });
      modalSuccess.value = "Override created successfully!";
    }

    // Reload overrides and events
    await Promise.all([loadOverrides(), loadEvents()]);

    // Force refresh the event store cache so the calendar shows updated data
    await eventStore.fetchEvents(true);

    setTimeout(() => {
      closeModal();
    }, 1500);
  } catch (err: any) {
    console.error("Failed to save override:", err);
    modalError.value =
      err.data?.message || err.message || "Failed to save override";
  } finally {
    saving.value = false;
  }
}

async function deleteOverride() {
  if (!editingOverride.value) return;

  if (!confirm("Are you sure you want to delete this override?")) {
    return;
  }

  saving.value = true;
  modalError.value = null;

  try {
    await $fetch(`/api/admin/event-overrides/${editingOverride.value.id}`, {
      method: "DELETE",
    });

    modalSuccess.value = "Override deleted successfully!";

    // Reload overrides and events
    await Promise.all([loadOverrides(), loadEvents()]);

    // Force refresh the event store cache so the calendar shows updated data
    await eventStore.fetchEvents(true);

    setTimeout(() => {
      closeModal();
    }, 1000);
  } catch (err: any) {
    console.error("Failed to delete override:", err);
    modalError.value =
      err.data?.message || err.message || "Failed to delete override";
  } finally {
    saving.value = false;
  }
}

async function loadEvents() {
  try {
    const response = await $fetch<{ events: ParsedEvent[] }>(
      "/api/events/detailed"
    );
    events.value = response?.events || [];
  } catch (err) {
    console.error("Failed to load events:", err);
    throw err;
  }
}

async function loadOverrides() {
  try {
    const response = await $fetch<{ overrides: EventOverride[] }>(
      "/api/admin/event-overrides"
    );
    overrides.value = response.overrides || [];
  } catch (err) {
    console.error("Failed to load overrides:", err);
  }
}

onMounted(async () => {
  try {
    await Promise.all([loadEvents(), loadOverrides()]);
  } catch (err: any) {
    error.value = err.message || "Failed to load events";
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.external-events-admin {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #6b7280;
  font-size: 0.95rem;
}

.loading,
.error-message {
  text-align: center;
  padding: 2rem;
  font-size: 1.1rem;
}

.error-message {
  color: #dc2626;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.event-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1.5rem;
  transition: all 0.2s;
}

.event-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.event-card.has-override {
  border-left: 4px solid #3b82f6;
  background: #eff6ff;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.event-info h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.event-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.event-type {
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-weight: 500;
}

.type-cup {
  background: #bbf7d0;
  color: #166534;
}

.type-chall {
  background: #bfdbfe;
  color: #1e40af;
}

.type-local {
  background: #e0f2fe;
  color: #075985;
}

.event-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.override-badge {
  background: #3b82f6;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.btn-edit {
  background: #f3f4f6;
  color: #374151;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-edit:hover {
  background: #e5e7eb;
}

.btn-edit-active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn-edit-active:hover {
  background: #2563eb;
}

.event-link {
  margin-top: 0.75rem;
  font-size: 0.875rem;
}

.event-link a {
  color: #3b82f6;
  text-decoration: none;
}

.event-link a:hover {
  text-decoration: underline;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1rem;
}

.btn-page {
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
}

.btn-page:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-weight: 500;
  color: #374151;
}

/* Modal */
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
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
}

.btn-close {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #6b7280;
  line-height: 1;
  padding: 0;
  width: 2rem;
  height: 2rem;
}

.btn-close:hover {
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.event-details {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 0.375rem;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
}

.event-details p {
  margin-bottom: 0.25rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #374151;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

.form-section {
  background: #f9fafb;
  padding: 1.25rem;
  border-radius: 0.5rem;
  margin-bottom: 1.25rem;
  border: 1px solid #e5e7eb;
}

.checkbox-group {
  margin-bottom: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  color: #374151;
}

.checkbox-label input[type="checkbox"] {
  width: 1.125rem;
  height: 1.125rem;
  cursor: pointer;
}

.help-text {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  color: #6b7280;
  font-weight: normal;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-delete {
  background: #dc2626;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  margin-right: auto;
}

.btn-delete:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-save {
  background: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
}

.btn-save:hover:not(:disabled) {
  background: #2563eb;
}

.btn-save:disabled,
.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.success-message {
  color: #16a34a;
  text-align: center;
  margin-top: 1rem;
  font-weight: 500;
}
</style>
