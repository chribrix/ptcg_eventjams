<template>
  <div class="admin-custom-events">
    <div class="page-header">
      <h1 class="page-title">Custom Events Management</h1>
      <button @click="showCreateForm = true" class="btn btn-primary">
        <Icon name="plus" /> Create New Event
      </button>
    </div>

    <!-- Create/Edit Event Modal -->
    <div
      v-if="showCreateForm || editingEvent"
      class="modal-overlay"
      @click="closeModal"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ editingEvent ? "Edit Event" : "Create New Event" }}</h2>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>

        <form @submit.prevent="saveEvent" class="event-form">
          <div class="form-group">
            <label for="name">Event Name *</label>
            <input
              id="name"
              v-model="eventForm.name"
              type="text"
              required
              class="form-input"
              placeholder="Enter event name"
            />
          </div>

          <div class="form-group">
            <label for="venue">Venue *</label>
            <input
              id="venue"
              v-model="eventForm.venue"
              type="text"
              required
              class="form-input"
              placeholder="Event venue"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="maxParticipants">Max Participants *</label>
              <input
                id="maxParticipants"
                v-model.number="eventForm.maxParticipants"
                type="number"
                min="1"
                required
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="participationFee">Participation Fee (€)</label>
              <input
                id="participationFee"
                v-model.number="eventForm.participationFee"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="0.00"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="eventDate">Event Date *</label>
            <input
              id="eventDate"
              v-model="eventForm.eventDate"
              type="datetime-local"
              required
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="registrationDeadline">Registration Deadline</label>
            <input
              id="registrationDeadline"
              v-model="eventForm.registrationDeadline"
              type="datetime-local"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              v-model="eventForm.description"
              class="form-textarea"
              rows="3"
              placeholder="Event description..."
            ></textarea>
          </div>

          <div v-if="editingEvent" class="form-group">
            <label for="status">Status</label>
            <select id="status" v-model="eventForm.status" class="form-select">
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeModal" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="saving" class="btn btn-primary">
              {{
                saving
                  ? "Saving..."
                  : editingEvent
                  ? "Update Event"
                  : "Create Event"
              }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Events List -->
    <div class="events-section">
      <div class="section-header">
        <h2>Events</h2>
        <div class="search-box">
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Search events..."
            class="search-input"
          />
        </div>
      </div>

      <div v-if="loading" class="loading">Loading events...</div>

      <div v-else class="events-grid">
        <div
          v-for="event in filteredEvents"
          :key="event.id"
          class="event-card"
          :class="{ [event.status]: true }"
        >
          <div class="event-header">
            <h3>{{ event.name }}</h3>
            <span class="status-badge" :class="event.status">
              {{ event.status }}
            </span>
          </div>

          <div class="event-details">
            <p><strong>Venue:</strong> {{ event.venue }}</p>
            <p><strong>Date:</strong> {{ formatDate(event.eventDate) }}</p>
            <p>
              <strong>Participants:</strong>
              {{ event._count?.registrations || 0 }} /
              {{ event.maxParticipants }}
            </p>
            <p v-if="event.participationFee">
              <strong>Fee:</strong> €{{ event.participationFee }}
            </p>
            <p v-if="event.description" class="description">
              {{ event.description }}
            </p>
          </div>

          <div class="event-actions">
            <button
              @click="viewRegistrations(event)"
              class="btn btn-small btn-info"
            >
              View Registrations ({{ event._count?.registrations || 0 }})
            </button>
            <button
              @click="editEvent(event)"
              class="btn btn-small btn-secondary"
            >
              Edit
            </button>
            <button
              @click="deleteEvent(event)"
              class="btn btn-small btn-danger"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div v-if="!loading && filteredEvents.length === 0" class="no-events">
        No events found. Create your first event!
      </div>
    </div>

    <!-- Registration Management Modal -->
    <div
      v-if="showRegistrations"
      class="modal-overlay"
      @click="closeRegistrationsModal"
    >
      <div class="modal-content modal-large" @click.stop>
        <div class="modal-header">
          <h2>{{ selectedEvent?.name }} - Registrations</h2>
          <button @click="closeRegistrationsModal" class="close-btn">
            &times;
          </button>
        </div>

        <div class="registrations-content">
          <div class="registrations-stats">
            <div class="stat-item">
              <span class="stat-number">{{ registrations.length }}</span>
              <span class="stat-label">Total Registered</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{
                selectedEvent?.maxParticipants || 0
              }}</span>
              <span class="stat-label">Max Capacity</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{
                (selectedEvent?.maxParticipants || 0) - registrations.length
              }}</span>
              <span class="stat-label">Available Spots</span>
            </div>
          </div>

          <div v-if="registrations.length > 0" class="registrations-table">
            <table>
              <thead>
                <tr>
                  <th>Player ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Registered At</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="registration in registrations"
                  :key="registration.id"
                >
                  <td>{{ registration.player.playerId }}</td>
                  <td>{{ registration.player.name }}</td>
                  <td>{{ registration.player.email || "N/A" }}</td>
                  <td>{{ formatDate(registration.registeredAt) }}</td>
                  <td>
                    <select
                      v-model="registration.status"
                      @change="updateRegistrationStatus(registration)"
                      class="status-select"
                    >
                      <option value="registered">Registered</option>
                      <option value="attended">Attended</option>
                      <option value="no-show">No-show</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td>
                    <button
                      @click="cancelRegistration(registration)"
                      class="btn btn-small btn-danger"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="no-registrations">
            No registrations yet for this event.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface CustomEvent {
  id: string;
  name: string;
  venue: string;
  maxParticipants: number;
  participationFee?: number;
  description?: string;
  eventDate: string;
  registrationDeadline?: string;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    registrations: number;
  };
}

interface Registration {
  id: string;
  customEventId: string;
  playerId: string;
  registeredAt: string;
  status: string;
  notes?: string;
  player: {
    id: string;
    playerId: string;
    name: string;
    email?: string;
    birthDate: string;
  };
}

// Page metadata
definePageMeta({
  layout: "products",
});

// Reactive data
const events = ref<CustomEvent[]>([]);
const registrations = ref<Registration[]>([]);
const loading = ref(true);
const saving = ref(false);
const showCreateForm = ref(false);
const showRegistrations = ref(false);
const editingEvent = ref<CustomEvent | null>(null);
const selectedEvent = ref<CustomEvent | null>(null);
const searchTerm = ref("");

// Form data
const eventForm = ref({
  name: "",
  venue: "",
  maxParticipants: 1,
  participationFee: 0,
  description: "",
  eventDate: "",
  registrationDeadline: "",
  status: "upcoming",
});

// Computed
const filteredEvents = computed(() => {
  if (!searchTerm.value) return events.value;

  const search = searchTerm.value.toLowerCase();
  return events.value.filter(
    (event) =>
      event.name.toLowerCase().includes(search) ||
      event.venue.toLowerCase().includes(search) ||
      event.status.toLowerCase().includes(search)
  );
});

// Methods
const loadEvents = async () => {
  try {
    loading.value = true;
    const response = await $fetch<{ events: CustomEvent[] }>(
      "/api/admin/custom-events"
    );
    events.value = response.events || [];
  } catch (error) {
    console.error("Error loading events:", error);
    // TODO: Show error message
  } finally {
    loading.value = false;
  }
};

const saveEvent = async () => {
  try {
    saving.value = true;

    const eventData = {
      ...eventForm.value,
      participationFee: eventForm.value.participationFee || undefined,
    };

    if (editingEvent.value) {
      await $fetch(`/api/admin/custom-events?id=${editingEvent.value.id}`, {
        method: "PUT",
        body: eventData,
      });
    } else {
      await $fetch("/api/admin/custom-events", {
        method: "POST",
        body: eventData,
      });
    }

    await loadEvents();
    closeModal();
    // TODO: Show success message
  } catch (error) {
    console.error("Error saving event:", error);
    // TODO: Show error message
  } finally {
    saving.value = false;
  }
};

const editEvent = (event: CustomEvent) => {
  editingEvent.value = event;
  eventForm.value = {
    name: event.name,
    venue: event.venue,
    maxParticipants: event.maxParticipants,
    participationFee: event.participationFee || 0,
    description: event.description || "",
    eventDate: new Date(event.eventDate).toISOString().slice(0, 16),
    registrationDeadline: event.registrationDeadline
      ? new Date(event.registrationDeadline).toISOString().slice(0, 16)
      : "",
    status: event.status,
  };
};

const deleteEvent = async (event: CustomEvent) => {
  if (!confirm(`Are you sure you want to delete "${event.name}"?`)) return;

  try {
    await $fetch(`/api/admin/custom-events?id=${event.id}`, {
      method: "DELETE",
    });
    await loadEvents();
    // TODO: Show success message
  } catch (error) {
    console.error("Error deleting event:", error);
    // TODO: Show error message
  }
};

const viewRegistrations = async (event: CustomEvent) => {
  try {
    selectedEvent.value = event;
    const response = await $fetch<{ registrations: Registration[] }>(
      `/api/admin/registrations?eventId=${event.id}`
    );
    registrations.value = response.registrations || [];
    showRegistrations.value = true;
  } catch (error) {
    console.error("Error loading registrations:", error);
    // TODO: Show error message
  }
};

const updateRegistrationStatus = async (registration: Registration) => {
  try {
    await $fetch(`/api/admin/registrations?id=${registration.id}`, {
      method: "PUT",
      body: { status: registration.status },
    });
    // TODO: Show success message
  } catch (error) {
    console.error("Error updating registration:", error);
    // TODO: Show error message
  }
};

const cancelRegistration = async (registration: Registration) => {
  if (!confirm(`Remove ${registration.player.name} from this event?`)) return;

  try {
    await $fetch(`/api/admin/registrations?id=${registration.id}`, {
      method: "DELETE",
    });
    registrations.value = registrations.value.filter(
      (r) => r.id !== registration.id
    );
    await loadEvents(); // Refresh event counts
    // TODO: Show success message
  } catch (error) {
    console.error("Error cancelling registration:", error);
    // TODO: Show error message
  }
};

const closeModal = () => {
  showCreateForm.value = false;
  editingEvent.value = null;
  eventForm.value = {
    name: "",
    venue: "",
    maxParticipants: 1,
    participationFee: 0,
    description: "",
    eventDate: "",
    registrationDeadline: "",
    status: "upcoming",
  };
};

const closeRegistrationsModal = () => {
  showRegistrations.value = false;
  selectedEvent.value = null;
  registrations.value = [];
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

// Load events on mount
onMounted(loadEvents);
</script>

<style scoped>
.admin-custom-events {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: between;
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

.btn-info {
  background-color: #06b6d4;
  color: white;
}

.btn-info:hover {
  background-color: #0891b2;
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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-large {
  max-width: 800px;
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

.event-form {
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

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.events-section {
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

.events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.event-card {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1.5rem;
  background: white;
}

.event-card.completed {
  background-color: #f9fafb;
}

.event-card.cancelled {
  background-color: #fef2f2;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.event-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge.upcoming {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.status-badge.ongoing {
  background-color: #fef3c7;
  color: #92400e;
}

.status-badge.completed {
  background-color: #dcfce7;
  color: #166534;
}

.status-badge.cancelled {
  background-color: #fee2e2;
  color: #991b1b;
}

.event-details p {
  margin: 0.5rem 0;
  color: #6b7280;
}

.description {
  font-style: italic;
}

.event-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.no-events {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.registrations-content {
  padding: 1.5rem;
}

.registrations-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  color: #6b7280;
  font-size: 0.875rem;
}

.registrations-table {
  overflow-x: auto;
}

.registrations-table table {
  width: 100%;
  border-collapse: collapse;
}

.registrations-table th,
.registrations-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.registrations-table th {
  font-weight: 600;
  background-color: #f9fafb;
}

.status-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.no-registrations {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}
</style>
