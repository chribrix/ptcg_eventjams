<template>
  <AppEventCard bare compact :muted="muted">
    <div class="event-card-content">
      <div class="event-card-heading">
        <div class="min-w-0">
          <h3 class="events-manager-card-title">
            <span>{{ event.name }}</span>
            <span v-for="tag in getDisplayTags(event.tags, event.tagType)" :key="tag.label"
              class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium" :class="tag.badgeClass">
              {{ tag.value }}
            </span>
          </h3>
          <span class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium" :class="statusBadgeClass">
            {{ t(`events.eventStatus.${event.status}`) }}
          </span>
        </div>
        <button type="button" class="event-copy-button app-action-button"
          :class="copied ? 'app-action-success' : 'app-action-secondary'"
          :title="copied ? t('admin.eventsManager.copied') : `${t('admin.eventsManager.registrationLink')} ${t('admin.eventsManager.copy')}`"
          :aria-label="copied ? t('admin.eventsManager.copied') : `${t('admin.eventsManager.registrationLink')} ${t('admin.eventsManager.copy')}`"
          @click="$emit('copy')">
          <svg v-if="copied" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12l4 4L19 6" /></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" stroke-width="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" stroke-width="2"/></svg>
        </button>
      </div>
      <div class="event-card-details">
        <p><strong>{{ t('admin.eventsManager.dateTime') }}:</strong> {{ dateLabel }}</p>
        <p><strong>{{ t('common.venue') }}:</strong> {{ event.venue }}</p>
        <p><strong>{{ t('common.participants') }}:</strong> {{ event._count?.registrations || 0 }} / {{ event.maxParticipants }}</p>
        <p v-if="event.participationFee"><strong>{{ t('events.participationFee') }}:</strong> {{ event.participationFee }}</p>
        <p v-if="event.requiresDecklist"><strong>{{ t('admin.eventsManager.decklistLabel') }}:</strong> {{ t('admin.eventsManager.decklistRequiredAfterRegistration') }}</p>
        <p v-if="event.description" class="event-card-description"><strong>{{ t('events.description') }}:</strong> {{ event.description }}</p>
      </div>
      <div class="event-card-actions">
        <button type="button" class="app-action-button app-action-secondary" @click="$emit('registrations')">Registrierungen verwalten</button>
        <button v-if="preview && !event.isExternalEvent" type="button" class="app-action-button app-action-primary" @click="$emit('previewAction')">Turnier starten</button>
        <NuxtLink v-else-if="!event.isExternalEvent" :to="`/admin/tournament-management?eventId=${event.id}`" class="app-action-button app-action-primary no-underline">Turnier starten</NuxtLink>
        <button v-if="!event.isExternalEvent" type="button" class="app-action-button app-action-secondary" @click="$emit('edit')">{{ t('common.edit') }}</button>
        <button v-if="!event.isExternalEvent" type="button" class="app-action-button app-action-danger" @click="$emit('delete')">{{ t('common.delete') }}</button>
        <NuxtLink v-else to="/admin/external-events" class="app-action-button app-action-secondary no-underline">{{ t('admin.eventsManager.manageInExternalEvents') }}</NuxtLink>
      </div>
      <span class="sr-only" role="status">{{ copied ? t('admin.eventsManager.copied') : '' }}</span>
    </div>
  </AppEventCard>
</template>

<script setup lang="ts">
import { useTagDisplay } from "~/composables/useTagDisplay";

const { t } = useI18n();
const { getDisplayTags } = useTagDisplay();
const props = defineProps<{
  event: { id: string; name: string; venue: string; eventDate: string; status: string; tagType: string; tags: any; maxParticipants: number; participationFee?: number; requiresDecklist: boolean; description?: string; isExternalEvent?: boolean; _count?: { registrations: number } };
  dateLabel: string;
  copied?: boolean;
  muted?: boolean;
  preview?: boolean;
}>();
defineEmits<{ copy: []; registrations: []; edit: []; delete: []; previewAction: [] }>();
const statusBadgeClass = computed(() => ({
  upcoming: 'app-status-upcoming', ongoing: 'app-status-ongoing', completed: 'app-status-completed', cancelled: 'app-status-cancelled',
} as Record<string, string>)[props.event.status] || 'app-status-upcoming');
</script>

<style scoped>
.event-card-content { display: grid; gap: 0.75rem; }
.event-card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; }
.events-manager-card-title { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin: 0 0 0.25rem; color: var(--app-text-primary); font-size: 1.1rem; font-weight: 700; overflow-wrap: anywhere; }
.event-copy-button { width: 2.5rem; height: 2.5rem; flex: none; display: grid; place-items: center; padding: 0.5rem; }
.event-copy-button svg { width: 1.1rem; height: 1.1rem; }
.event-card-details { display: grid; gap: 0.35rem; min-width: 0; color: var(--app-text-secondary); font-size: 0.875rem; }
.event-card-details p { margin: 0; overflow-wrap: anywhere; }
.event-card-details strong { color: var(--app-text-primary); }
.event-card-description { white-space: pre-wrap; }
.event-card-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; padding-top: 0.75rem; border-top: 1px solid var(--app-border); }
.event-card-actions > * { min-height: 2.25rem; display: inline-flex; align-items: center; justify-content: center; padding: 0.4rem 0.65rem; font-size: 0.75rem; }
</style>
