<template>
  <div class="event-list-wrapper">
    <div v-if="error" class="error">
      Error loading events: {{ error }}
    </div>

    <!-- Header with filters and search -->
    <div class="event-list-header">
      <h2 class="list-title">All Events</h2>
      
      <!-- Search and Filter Controls -->
      <div class="controls">
        <div class="search-container">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search events..."
            class="search-input"
          />
          <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        
        <select v-model="selectedType" class="type-filter">
          <option value="">All Types</option>
          <option value="League Cup">League Cup</option>
          <option value="League Challenge">League Challenge</option>
          <option value="GO Challenge">GO Challenge</option>
          <option value="Pre Release">Pre Release</option>
          <option value="nonpremier TCG">Friendly</option>
        </select>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <span>Loading events...</span>
      </div>
    </div>

    <!-- Event List -->
    <div v-else class="event-list-container">
      <div v-if="filteredEvents.length === 0" class="no-events">
        <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
        <p>No events found matching your criteria</p>
      </div>

      <div v-else class="event-list">
        <div
          v-for="event in filteredEvents"
          :key="event.id"
          class="event-list-item"
          @click="openEventDetails(event)"
        >
          <!-- Date badge -->
          <div class="date-badge">
            <div class="date-day">{{ formatDay(event.dateTime) }}</div>
            <div class="date-month">{{ formatMonth(event.dateTime) }}</div>
          </div>

          <!-- Event content -->
          <div class="event-content">
            <div class="event-header">
              <div class="event-title-row">
                <div
                  class="event-type-badge"
                  :class="`badge-${event.icon || 'friendly'}`"
                >
                  {{ event.type }}
                </div>
                <div class="event-time" v-if="event.time">{{ event.time }}</div>
              </div>
              
              <div class="event-location">
                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4m0 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m0 0H9"></path>
                </svg>
                <span>{{ stripHtmlTags(event.venue) }}</span>
              </div>

              <div class="event-location" v-if="event.location">
                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span>{{ stripHtmlTags(event.location) }}{{ event.country ? `, ${stripHtmlTags(event.country)}` : '' }}</span>
              </div>
            </div>

            <!-- Event details row -->
            <div class="event-details">
              <div class="event-cost" v-if="event.cost !== undefined">
                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                <span>{{ event.cost || '?' }}</span>
              </div>

              <div v-if="event.link && event.link !== '//'" class="event-register">
                <a
                  :href="event.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="register-button"
                  @click.stop
                >
                  <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                  Register
                </a>
              </div>
            </div>
          </div>

          <!-- Expand arrow -->
          <div class="expand-arrow">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Event Details Modal -->
    <div
      v-if="selectedEvent"
      class="event-details-overlay"
      @click="closeEventDetails"
    >
      <div class="event-details-panel" @click.stop>
        <div class="event-details-header">
          <h3>Event Details</h3>
          <button @click="closeEventDetails" class="close-button">
            &times;
          </button>
        </div>
        <div class="event-details-content">
          <div class="event-item">
            <div class="event-header">
              <div
                class="event-type-badge"
                :class="`badge-${selectedEvent.icon || 'friendly'}`"
              >
                {{ selectedEvent.type }}
              </div>
              <div class="event-header-right">
                <div v-if="selectedEvent.cost !== undefined" class="event-cost">
                  <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                  {{ selectedEvent.cost || "?" }}
                </div>
                <div v-if="selectedEvent.time" class="event-time-header">
                  {{ selectedEvent.time }}
                </div>
              </div>
            </div>

            <div class="event-content-grid">
              <div class="event-column">
                <div v-if="selectedEvent.venue" class="event-detail">
                  <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4m0 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m0 0H9"></path>
                  </svg>
                  <span>{{ stripHtmlTags(selectedEvent.venue) }}</span>
                </div>
                <div v-if="selectedEvent.streetAddress" class="event-detail">
                  <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  <span>{{ stripHtmlTags(selectedEvent.streetAddress) }}</span>
                </div>
                <div v-if="selectedEvent.location" class="event-detail">
                  <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>{{ stripHtmlTags(selectedEvent.location) }}{{ selectedEvent.country ? `, ${stripHtmlTags(selectedEvent.country)}` : '' }}</span>
                </div>
              </div>

              <div class="event-column">
                <div v-if="selectedEvent.link && selectedEvent.link !== '//'" class="event-detail">
                  <a
                    :href="selectedEvent.link"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="link-button"
                  >
                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                    <span>Register</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface ParsedEvent {
  id: string;
  title: string;
  dateTime: string;
  time?: string;
  type: string;
  venue: string;
  location: string;
  country: string;
  link: string;
  cost?: string;
  streetAddress?: string;
  icon?: string;
}

// Reactive state
const searchQuery = ref('');
const selectedType = ref('');
const selectedEvent = ref<ParsedEvent | null>(null);
const events = ref<ParsedEvent[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Load events on mount
onMounted(async () => {
  await fetchEvents();
});

const fetchEvents = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    console.log('Fetching events from /api/events...');
    const response = await $fetch<{events: ParsedEvent[]}>('/api/events');
    events.value = response.events || [];
    console.log(`Loaded ${events.value.length} events`);
  } catch (err) {
    console.error('Failed to load events:', err);
    error.value = err instanceof Error ? err.message : 'Failed to load events';
  } finally {
    isLoading.value = false;
  }
};

// Computed properties
const filteredEvents = computed(() => {
  let filteredEvents = [...events.value]; // Create a mutable copy

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filteredEvents = filteredEvents.filter((event: ParsedEvent) => 
      event.title?.toLowerCase().includes(query) ||
      event.type?.toLowerCase().includes(query) ||
      event.venue?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query)
    );
  }

  // Apply type filter
  if (selectedType.value) {
    filteredEvents = filteredEvents.filter((event: ParsedEvent) => event.type === selectedType.value);
  }

  // Sort by date and time
  return filteredEvents.sort((a: ParsedEvent, b: ParsedEvent) => {
    const dateTimeA = new Date(a.dateTime + (a.time ? ` ${a.time}` : ''));
    const dateTimeB = new Date(b.dateTime + (b.time ? ` ${b.time}` : ''));
    return dateTimeA.getTime() - dateTimeB.getTime();
  });
});

// Methods
const formatDay = (dateString: string) => {
  const date = new Date(dateString);
  return date.getDate().toString();
};

const formatMonth = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short' });
};

const stripHtmlTags = (html: string) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
};

const openEventDetails = (event: ParsedEvent) => {
  selectedEvent.value = event;
};

const closeEventDetails = () => {
  selectedEvent.value = null;
};
</script>

<style scoped>
.event-list-wrapper {
  width: 60vw;
  height: 50vh;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.event-list-header {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.list-title {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-container {
  position: relative;
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: white;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: #6b7280;
  pointer-events: none;
}

.type-filter {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: white;
  cursor: pointer;
  min-width: 150px;
}

.type-filter:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-spinner span {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.error {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.1rem;
  color: #dc2626;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  padding: 1rem;
}

.event-list-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.no-events {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #6b7280;
  gap: 1rem;
}

.empty-icon {
  width: 3rem;
  height: 3rem;
}

.event-list {
  flex: 1;
  overflow-y: auto;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.event-list-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 1rem;
}

.event-list-item:hover {
  background-color: #f9fafb;
  transform: translateX(2px);
}

.event-list-item:last-child {
  border-bottom: none;
}

.date-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  background-color: #3b82f6;
  color: white;
  border-radius: 0.5rem;
  flex-shrink: 0;
}

.date-day {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1;
}

.date-month {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.event-content {
  flex: 1;
  min-width: 0;
}

.event-header {
  margin-bottom: 0.5rem;
}

.event-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.event-time {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  background-color: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.event-location {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.event-location:last-child {
  margin-bottom: 0;
}

.event-details {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.event-cost {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #059669;
}

.event-register {
  margin-left: auto;
}

.register-button {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #2563eb;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
  background-color: #eff6ff;
  border-radius: 0.25rem;
  border: 1px solid #bfdbfe;
  transition: all 0.2s ease;
}

.register-button:hover {
  background-color: #dbeafe;
  color: #1d4ed8;
  text-decoration: none;
}

.expand-arrow {
  color: #9ca3af;
  flex-shrink: 0;
}

.icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.event-type-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-friendly {
  background-color: #f0fdf4;
  color: #16a34a;
}

.badge-cup {
  background-color: #fef2f2;
  color: #dc2626;
}

.badge-chall {
  background-color: #eff6ff;
  color: #2563eb;
}

.badge-pre {
  background-color: #fefce8;
  color: #ca8a04;
}

/* Event Details Modal (reuse styles from EventCalendar) */
.event-details-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.event-details-panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 600px;
  max-height: 80vh;
  width: 90%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.event-details-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f9fafb;
}

.event-details-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.close-button:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.event-details-content {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.event-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.event-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.event-cost {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #059669;
  background-color: #ecfdf5;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  border: 1px solid #a7f3d0;
}

.event-time-header {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  background-color: #f3f4f6;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}

.event-content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.event-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.event-detail {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.4;
}

.event-detail span {
  flex: 1;
}

.link-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #2563eb;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
  background-color: #eff6ff;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  border: 1px solid #bfdbfe;
}

.link-button:hover {
  background-color: #dbeafe;
  color: #1d4ed8;
  text-decoration: none;
}
</style>
