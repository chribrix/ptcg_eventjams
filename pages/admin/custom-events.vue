<template>
  <AdminPageLayout title="Custom Events Management">
    <template #actions>
      <button @click="createNewEvent" class="btn btn-primary">
        Create New Event
      </button>
    </template>

    <!-- Events List -->
    <div class="admin-card">
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

      <div v-else-if="filteredEvents.length > 0" class="events-grid">
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
                  @click="copyRegistrationLink(event.id)"
                  @focus="$event.target.select()"
                  title="Click to copy"
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

      <div v-if="!loading && filteredEvents.length === 0" class="no-data">
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
  </AdminPageLayout>
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
@import "~/assets/css/admin-shared.css";

.events-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
}

.event-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid #e2e8f0;
  transition: all 0.2s;
}

.event-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.event-card.upcoming {
  border-left: 4px solid #3b82f6;
}

.event-card.ongoing {
  border-left: 4px solid #10b981;
}

.event-card.completed {
  border-left: 4px solid #6b7280;
}

.event-card.cancelled {
  border-left: 4px solid #ef4444;
  opacity: 0.7;
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
  flex-wrap: wrap;
  flex: 1;
}

.event-title-row h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: capitalize;
}

.status-badge.upcoming {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.ongoing {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.completed {
  background: #f3f4f6;
  color: #374151;
}

.status-badge.cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.event-details {
  margin-bottom: 1rem;
}

.event-details p {
  margin: 0.5rem 0;
  font-size: 0.95rem;
  color: #475569;
}

.decklist-required {
  color: #059669;
  font-weight: 500;
}

.description {
  color: #64748b;
  font-style: italic;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f1f5f9;
}

.registration-link-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.registration-link-label {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: #64748b;
}

.registration-link-container {
  display: flex;
  gap: 0.5rem;
}

.registration-link-input {
  flex: 1;
  padding: 0.625rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  background: #f8fafc;
  font-family: monospace;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.registration-link-input:hover {
  background-color: #eff6ff;
  border-color: #3b82f6;
}

.registration-link-input:focus {
  outline: none;
  border-color: #3b82f6;
  background-color: white;
}

.btn-copy {
  white-space: nowrap;
}

.btn-copy.copied {
  background: #10b981;
}

.event-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.btn-small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-info {
  background: #0ea5e9;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: #0284c7;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #059669;
}

.modal-large {
  max-width: 900px;
}

.registrations-content {
  padding: 1.5rem;
}

.registrations-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  text-align: center;
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
  border-bottom: 1px solid #e2e8f0;
}

.registrations-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
}

.registrations-table tr:hover {
  background: #f8fafc;
}

.event-form {
  padding: 1.5rem;
}

@media (min-width: 768px) {
  .events-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .events-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
