<template>
  <AdminPageLayout
    title="External Event Overrides"
    subtitle="Customize details for events from pokedata.ovh"
  >
    <div v-if="loading" class="loading">Loading events...</div>

    <div v-else-if="error" class="admin-card">
      <p class="error-message">Error: {{ error }}</p>
    </div>

    <div v-else class="admin-card">
      <div class="events-list">
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
                <span
                  class="event-type"
                  :class="`type-${getEventTypeFromIcon(event.icon)}`"
                >
                  {{ getEventTypeName(getEventTypeFromIcon(event.icon)) }}
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
              <span v-if="isHiddenFromCalendar(event)" class="hidden-badge">
                Hidden from Calendar
              </span>
              <button
                @click="toggleHideFromCalendar(event)"
                class="btn-toggle-hide"
                :class="{ 'btn-hide-active': isHiddenFromCalendar(event) }"
              >
                {{
                  isHiddenFromCalendar(event)
                    ? "Show in Calendar"
                    : "Hide from Calendar"
                }}
              </button>
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
  </AdminPageLayout>
</template>

<script setup lang="ts">
import { getEventTypeName } from "~/utils/eventTypes";
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
  type?: string;
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

// Check if event is hidden from calendar
function isHiddenFromCalendar(event: ParsedEvent): boolean {
  const override = getOverride(event);
  return override ? (override as any).hideFromCalendar === true : false;
}

// Toggle hide from calendar status
async function toggleHideFromCalendar(event: ParsedEvent) {
  const override = getOverride(event);
  const isCurrentlyHidden = isHiddenFromCalendar(event);
  const action = isCurrentlyHidden ? "show" : "hide";

  if (
    !confirm(`Are you sure you want to ${action} this event from the calendar?`)
  ) {
    return;
  }

  try {
    let response;

    if (override) {
      // Toggle existing override
      response = await $fetch<{ success: boolean; hideFromCalendar: boolean }>(
        `/api/admin/event-overrides/${override.id}/toggle-hide`,
        {
          method: "POST",
        }
      );
    } else {
      // Create new override with just the hide flag
      if (!adminUser.value?.id) {
        alert("Admin user not found");
        return;
      }

      response = await $fetch<{ success: boolean; override: any }>(
        `/api/admin/event-overrides`,
        {
          method: "POST",
          body: {
            eventName: event.venue,
            eventDate: event.dateTime,
            eventLocation: event.location,
            overrides: {
              type: event.type,
              icon: event.icon,
            },
            createdBy: adminUser.value.id,
            hideFromCalendar: true,
          },
        }
      );
    }

    if (response.success) {
      // Update local state
      await Promise.all([loadOverrides(), loadEvents()]);

      // Force refresh the event store cache so the calendar updates
      await eventStore.fetchEvents(true);
    }
  } catch (err: any) {
    console.error("Failed to toggle hide status:", err);
    alert(err.data?.message || err.message || "Failed to toggle hide status");
  }
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getEventTypeFromIcon(icon: string | undefined): string {
  const iconMap: Record<string, string> = {
    cup: "cup",
    chall: "challenge",
    pre: "local",
    friendly: "local",
  };
  return iconMap[icon || ""] || "custom";
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
    // Use /api/events instead of /api/events/detailed to get ALL events
    // including those hidden from calendar (admins need to see everything)
    const response = await $fetch<{ events: ParsedEvent[] }>("/api/events");
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
@import "~/assets/css/admin-shared.css";

.events-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.event-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s;
}

.event-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
  flex-wrap: wrap;
}

.event-info h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #1e293b;
}

.event-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #64748b;
}

.event-date,
.event-location {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.event-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.override-badge {
  padding: 0.25rem 0.75rem;
  background: #3b82f6;
  color: white;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.hidden-badge {
  padding: 0.25rem 0.75rem;
  background: #ef4444;
  color: white;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.btn-toggle-hide {
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
}

.btn-toggle-hide:hover {
  border-color: #ef4444;
  color: #ef4444;
}

.btn-toggle-hide.btn-hide-active {
  background: #16a34a;
  color: white;
  border-color: #16a34a;
}

.btn-toggle-hide.btn-hide-active:hover {
  background: #15803d;
}

.btn-edit {
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
}

.btn-edit:hover {
  border-color: #3b82f6;
  color: #3b82f6;
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
  padding-top: 0.75rem;
  border-top: 1px solid #e2e8f0;
}

.event-link a {
  color: #3b82f6;
  text-decoration: none;
  font-size: 0.875rem;
  word-break: break-all;
}

.event-link a:hover {
  text-decoration: underline;
}

.event-details {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.event-details p {
  margin: 0.5rem 0;
  font-size: 0.95rem;
  color: #475569;
}

.override-form {
  padding: 1.5rem;
}

.error-message {
  color: #ef4444;
  text-align: center;
  padding: 1rem;
}

.success-message {
  color: #16a34a;
  text-align: center;
  margin-top: 1rem;
  font-weight: 500;
}

.btn-save {
  background: #3b82f6;
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: #2563eb;
}

.btn-cancel {
  background: #e2e8f0;
  color: #475569;
}

.btn-cancel:hover {
  background: #cbd5e1;
}

.btn-delete {
  background: #ef4444;
  color: white;
  margin-right: auto;
}

.btn-delete:hover:not(:disabled) {
  background: #dc2626;
}
</style>
