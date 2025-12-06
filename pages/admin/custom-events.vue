<template>
  <div class="admin-custom-events">
    <div class="page-header">
      <h1 class="page-title">Custom Events Management</h1>
      <button @click="createNewEvent" class="btn btn-primary">
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
              @change="onEventDateChange"
            />
          </div>

          <div class="form-group">
            <label for="registrationDeadline">
              Registration Deadline
              <span class="field-help"
                >Automatically set to event date/time when event date
                changes</span
              >
            </label>
            <input
              id="registrationDeadline"
              v-model="eventForm.registrationDeadline"
              type="datetime-local"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="cancellationDeadline">
              Cancellation Deadline
              <span class="field-help"
                >Automatically set to event date/time when event date
                changes</span
              >
            </label>
            <input
              id="cancellationDeadline"
              v-model="eventForm.cancellationDeadline"
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

          <div class="form-group">
            <div class="checkbox-wrapper">
              <input
                id="requiresDecklist"
                v-model="eventForm.requiresDecklist"
                type="checkbox"
                class="form-checkbox"
              />
              <label for="requiresDecklist" class="checkbox-label">
                Requires Decklist
                <span class="checkbox-help">
                  Participants must submit a decklist after registration
                </span>
              </label>
            </div>
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
            <div class="event-title-row">
              <h3>{{ event.name }}</h3>
              <span
                v-if="event.isExternalEvent"
                class="event-type-badge"
                :class="`type-${event.eventType}`"
              >
                {{ getEventTypeName(event.eventType) }}
              </span>
            </div>
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
            <p v-if="event.requiresDecklist" class="decklist-required">
              <strong>📋 Decklist Required</strong>
            </p>
            <p v-if="event.description" class="description">
              {{ event.description }}
            </p>
            <div class="registration-link-section">
              <p class="registration-link-label">
                <strong>Registration Link:</strong>
              </p>
              <div class="registration-link-container">
                <input
                  :value="getRegistrationUrl(event.id)"
                  readonly
                  class="registration-link-input"
                  @focus="$event.target.select()"
                />
                <button
                  @click="copyRegistrationLink(event.id)"
                  class="btn btn-small btn-copy"
                  :class="{ copied: copiedEventId === event.id }"
                >
                  {{ copiedEventId === event.id ? "✓ Copied!" : "📋 Copy" }}
                </button>
              </div>
            </div>
          </div>

          <div class="event-actions">
            <NuxtLink
              :to="`/events/register/${event.id}`"
              class="btn btn-small btn-success"
              target="_blank"
            >
              🔗 Open Registration Page
            </NuxtLink>
            <button
              @click="viewRegistrations(event)"
              class="btn btn-small btn-info"
            >
              View Registrations ({{ event._count?.registrations || 0 }})
            </button>
            <template v-if="!event.isExternalEvent">
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
            </template>
            <template v-else>
              <NuxtLink
                to="/admin/external-events"
                class="btn btn-small btn-secondary"
              >
                Manage in External Events
              </NuxtLink>
            </template>
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
  cancellationDeadline?: string;
  requiresDecklist: boolean;
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
const copiedEventId = ref<string | null>(null);

// Form data
const eventForm = ref({
  name: "",
  venue: "",
  maxParticipants: 1,
  participationFee: 0,
  description: "",
  eventDate: "",
  registrationDeadline: "",
  cancellationDeadline: "",
  requiresDecklist: false,
  status: "upcoming",
});

// Initialize form with default dates when creating new event
const initializeEventForm = () => {
  const now = new Date();
  // Set default time to 10:00 AM today
  const defaultDateTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    10,
    0
  )
    .toISOString()
    .slice(0, 16);

  eventForm.value = {
    name: "",
    venue: "",
    maxParticipants: 1,
    participationFee: 0,
    description: "",
    eventDate: defaultDateTime,
    registrationDeadline: defaultDateTime,
    cancellationDeadline: defaultDateTime,
    requiresDecklist: false,
    status: "upcoming",
  };
};

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
const createNewEvent = () => {
  initializeEventForm();
  showCreateForm.value = true;
};

const onEventDateChange = () => {
  // Auto-set registration and cancellation deadlines to match event date/time
  // Only if they are currently empty or match the previous event date
  if (eventForm.value.eventDate) {
    // Always update registration deadline to match event date
    if (
      !eventForm.value.registrationDeadline ||
      eventForm.value.registrationDeadline === eventForm.value.eventDate
    ) {
      eventForm.value.registrationDeadline = eventForm.value.eventDate;
    }

    // Always update cancellation deadline to match event date
    if (
      !eventForm.value.cancellationDeadline ||
      eventForm.value.cancellationDeadline === eventForm.value.eventDate
    ) {
      eventForm.value.cancellationDeadline = eventForm.value.eventDate;
    }
  }
};

const loadEvents = async () => {
  try {
    loading.value = true;
    const response = await $fetch<{ events: CustomEvent[] }>(
      "/api/admin/events/combined"
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
  // Prevent editing external events from this page
  if ((event as any).isExternalEvent) {
    alert("External events must be managed in the External Events page.");
    return;
  }

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
    cancellationDeadline: event.cancellationDeadline
      ? new Date(event.cancellationDeadline).toISOString().slice(0, 16)
      : "",
    requiresDecklist: event.requiresDecklist,
    status: event.status,
  };
};

const deleteEvent = async (event: CustomEvent) => {
  // Prevent deleting external events from this page
  if ((event as any).isExternalEvent) {
    alert("External events must be managed in the External Events page.");
    return;
  }

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
  initializeEventForm();
};

const closeRegistrationsModal = () => {
  showRegistrations.value = false;
  selectedEvent.value = null;
  registrations.value = [];
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

const getRegistrationUrl = (eventId: string) => {
  if (import.meta.client) {
    return `${window.location.origin}/events/register/${eventId}`;
  }
  return `/events/register/${eventId}`;
};

const copyRegistrationLink = async (eventId: string) => {
  const url = getRegistrationUrl(eventId);
  try {
    await navigator.clipboard.writeText(url);
    copiedEventId.value = eventId;
    setTimeout(() => {
      copiedEventId.value = null;
    }, 2000);
  } catch (error) {
    console.error("Failed to copy link:", error);
    // Fallback for older browsers
    const input = document.createElement("input");
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    copiedEventId.value = eventId;
    setTimeout(() => {
      copiedEventId.value = null;
    }, 2000);
  }
};

const getEventTypeName = (eventType: string): string => {
  const types: Record<string, string> = {
    cup: "League Cup",
    challenge: "League Challenge",
    local: "Local Event",
    custom: "Custom Event",
  };
  return types[eventType] || eventType;
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

.btn-success {
  background-color: #10b981;
  color: white;
}

.btn-success:hover {
  background-color: #059669;
}

.btn-copy {
  background-color: #8b5cf6;
  color: white;
  white-space: nowrap;
}

.btn-copy:hover {
  background-color: #7c3aed;
}

.btn-copy.copied {
  background-color: #10b981;
}

.btn-copy.copied:hover {
  background-color: #059669;
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

.checkbox-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.form-checkbox {
  width: auto;
  margin: 0;
  accent-color: #3b82f6;
}

.checkbox-label {
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  margin: 0;
}

.checkbox-help {
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  color: #6b7280;
  margin-top: 0.25rem;
}

.field-help {
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  color: #6b7280;
  margin-top: 0.25rem;
  font-style: italic;
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
  flex-wrap: wrap;
  gap: 0.5rem;
}

.event-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.event-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.event-type-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.event-type-badge.type-cup {
  background-color: #bbf7d0;
  color: #166534;
}

.event-type-badge.type-challenge {
  background-color: #bfdbfe;
  color: #1e40af;
}

.event-type-badge.type-local {
  background-color: #e0f2fe;
  color: #075985;
}

.event-type-badge.type-custom {
  background-color: #fed7aa;
  color: #9a3412;
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

.decklist-required {
  color: #059669;
  font-weight: 500;
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

.registration-link-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.registration-link-label {
  margin-bottom: 0.5rem;
  color: #374151;
}

.registration-link-container {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.registration-link-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: #f9fafb;
  font-family: monospace;
  color: #374151;
}

.registration-link-input:focus {
  outline: none;
  border-color: #3b82f6;
  background-color: white;
}
</style>
