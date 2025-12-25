<template>
  <AdminPageLayout :title="`Event Details: ${event?.name || 'Loading...'}`">
    <template #actions>
      <NuxtLink to="/admin/custom-events" class="btn btn-secondary">
        ← Back to Events
      </NuxtLink>
    </template>

    <div v-if="loading" class="loading">Loading event details...</div>

    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-else-if="event" class="space-y-6">
      <!-- Event Information Card -->
      <div class="admin-card">
        <h2 class="section-title">Event Information</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="info-item">
            <span class="info-label">Venue:</span>
            <span class="info-value">{{ event.venue }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Date:</span>
            <span class="info-value">{{ formatDate(event.eventDate) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Participants:</span>
            <span class="info-value">
              {{ registrations.length }} / {{ event.maxParticipants }}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Fee:</span>
            <span class="info-value">
              {{
                event.participationFee ? `€${event.participationFee}` : "Free"
              }}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Decklist Required:</span>
            <span class="info-value">
              {{ event.requiresDecklist ? "Yes" : "No" }}
            </span>
          </div>
          <div
            v-if="event.tags && parseEventTags(event.tags, event.tagType as TagType).type"
            class="info-item"
          >
            <span class="info-label">Event Type:</span>
            <span class="info-value">
              <span
                class="event-type-badge"
                :class="`type-${parseEventTags(event.tags, event.tagType as TagType).type}`"
              >
                {{
                  getEventTypeLabel(
                    parseEventTags(event.tags, event.tagType as TagType).type
                  )
                }}
              </span>
            </span>
          </div>
        </div>
        <div v-if="event.description" class="mt-4">
          <span class="info-label">Description:</span>
          <p class="info-value mt-2">{{ event.description }}</p>
        </div>
      </div>

      <!-- Registrations List -->
      <div class="admin-card">
        <div class="section-header mb-4">
          <h2 class="section-title">
            Registered Players ({{ registrations.length }})
          </h2>
          <button
            @click="exportRegistrations"
            class="btn btn-secondary btn-small"
          >
            📊 Export CSV
          </button>
        </div>

        <div v-if="registrations.length === 0" class="empty-state">
          No registrations yet
        </div>

        <div v-else class="overflow-x-auto">
          <table class="registrations-table">
            <thead>
              <tr>
                <th>Player ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Birth Date</th>
                <th>Registered At</th>
                <th v-if="event.requiresDecklist">Decklist Status</th>
                <th v-if="event.requiresDecklist">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="reg in registrations" :key="reg.id">
                <td class="font-mono text-sm">{{ reg.player.playerId }}</td>
                <td class="font-semibold">{{ reg.player.name }}</td>
                <td>{{ reg.player.email || "N/A" }}</td>
                <td>{{ formatDate(reg.player.birthDate) }}</td>
                <td>{{ formatDateTime(reg.registeredAt) }}</td>
                <td v-if="event.requiresDecklist">
                  <span
                    class="status-badge"
                    :class="getDecklistStatusClass(reg)"
                  >
                    {{ getDecklistStatusText(reg) }}
                  </span>
                </td>
                <td v-if="event.requiresDecklist">
                  <button
                    v-if="reg.decklist"
                    @click="viewDecklist(reg)"
                    class="btn btn-small btn-primary"
                  >
                    View Decklist
                  </button>
                  <span v-else class="text-gray-400 text-sm">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Decklist Viewer Modal -->
    <div
      v-if="showDecklistModal"
      class="modal-overlay"
      @click="closeDecklistModal"
    >
      <div class="modal-content modal-large" @click.stop>
        <div class="modal-header">
          <h2>Decklist - {{ selectedRegistration?.player.name }}</h2>
          <button @click="closeDecklistModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="decklist-viewer">
            <pre class="decklist-content">{{
              selectedRegistration?.decklist
            }}</pre>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeDecklistModal" class="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  </AdminPageLayout>
</template>

<script setup lang="ts">
import {
  parseEventTags,
  getEventTypeLabel,
  type TagType,
} from "~/types/eventTags";

interface Player {
  id: string;
  playerId: string;
  name: string;
  email: string | null;
  birthDate: string;
}

interface Registration {
  id: string;
  playerId: string;
  registeredAt: string;
  decklist: string | null;
  bringingDecklistOnsite: boolean;
  player: Player;
}

interface CustomEvent {
  id: string;
  name: string;
  venue: string;
  eventDate: string;
  maxParticipants: number;
  participationFee: number;
  description: string | null;
  requiresDecklist: boolean;
  tagType: string;
  tags: any;
}

const route = useRoute();
const eventId = route.params.id as string;

const event = ref<CustomEvent | null>(null);
const registrations = ref<Registration[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showDecklistModal = ref(false);
const selectedRegistration = ref<Registration | null>(null);

// Load event details
const loadEventDetails = async () => {
  try {
    loading.value = true;
    error.value = null;

    const response = await $fetch<{
      success: boolean;
      event: CustomEvent;
      registrations: Registration[];
    }>(`/api/admin/events/${eventId}/details`);

    if (response.success) {
      event.value = response.event;
      registrations.value = response.registrations;
    } else {
      error.value = "Failed to load event details";
    }
  } catch (err: any) {
    console.error("Error loading event details:", err);
    error.value = err.data?.message || "Failed to load event details";
  } finally {
    loading.value = false;
  }
};

// Format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

// Format date and time
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Get decklist status text
const getDecklistStatusText = (reg: Registration): string => {
  if (reg.decklist) {
    return "Decklist Submitted";
  } else if (reg.bringingDecklistOnsite) {
    return "Bringing On-site";
  } else {
    return "Not Submitted";
  }
};

// Get decklist status CSS class
const getDecklistStatusClass = (reg: Registration): string => {
  if (reg.decklist) {
    return "status-success";
  } else if (reg.bringingDecklistOnsite) {
    return "status-warning";
  } else {
    return "status-danger";
  }
};

// View decklist
const viewDecklist = (reg: Registration) => {
  selectedRegistration.value = reg;
  showDecklistModal.value = true;
};

// Close decklist modal
const closeDecklistModal = () => {
  showDecklistModal.value = false;
  selectedRegistration.value = null;
};

// Export registrations to CSV
const exportRegistrations = () => {
  if (!event.value || registrations.value.length === 0) return;

  const headers = ["Player ID", "Name", "Email", "Birth Date", "Registered At"];

  if (event.value.requiresDecklist) {
    headers.push("Decklist Status");
  }

  const rows = registrations.value.map((reg) => {
    const row = [
      reg.player.playerId,
      reg.player.name,
      reg.player.email || "",
      formatDate(reg.player.birthDate),
      formatDateTime(reg.registeredAt),
    ];

    if (event.value!.requiresDecklist) {
      row.push(getDecklistStatusText(reg));
    }

    return row;
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `${event.value!.name.replace(/\s+/g, "_")}_registrations.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

onMounted(() => {
  loadEventDetails();
});
</script>

<style scoped>
.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-weight: 600;
  color: #6b7280;
  font-size: 0.875rem;
}

.info-value {
  color: #1f2937;
  font-size: 1rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: #1f2937;
}

.registrations-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.registrations-table th {
  background-color: #f9fafb;
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

.registrations-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.registrations-table tbody tr:hover {
  background-color: #f9fafb;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-success {
  background-color: #d1fae5;
  color: #065f46;
}

.status-warning {
  background-color: #fef3c7;
  color: #92400e;
}

.status-danger {
  background-color: #fee2e2;
  color: #991b1b;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
  font-size: 1rem;
}

.decklist-viewer {
  max-height: 60vh;
  overflow-y: auto;
  background-color: #f9fafb;
  border-radius: 0.5rem;
  padding: 1rem;
}

.decklist-content {
  font-family: "Courier New", monospace;
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  color: #1f2937;
}

.event-type-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.type-cup {
  background-color: #d1fae5;
  color: #065f46;
}

.type-challenge {
  background-color: #dbeafe;
  color: #1e40af;
}

.type-local {
  background-color: #e9d5ff;
  color: #6b21a8;
}

.type-custom {
  background-color: #fed7aa;
  color: #9a3412;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.space-y-6 > * + * {
  margin-top: 1.5rem;
}
</style>
