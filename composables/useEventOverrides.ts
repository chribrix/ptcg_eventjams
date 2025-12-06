/**
 * Composable for managing external event overrides
 * Provides utilities for creating, updating, and deleting overrides
 * Automatically invalidates event cache after changes
 */

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

export function useEventOverrides() {
  const eventStore = useEventStore();

  /**
   * Refresh events after override changes to show updated data
   */
  async function refreshEvents() {
    await eventStore.fetchEvents(true); // Force refresh
  }

  /**
   * Create a new event override
   */
  async function createOverride(data: {
    eventName: string;
    eventDate: string;
    eventLocation?: string;
    overrides: Record<string, any>;
    notes?: string;
    createdBy: string;
  }) {
    const response = await $fetch<{
      success: boolean;
      override: EventOverride;
    }>("/api/admin/event-overrides", {
      method: "POST",
      body: data,
    });

    await refreshEvents();
    return response.override;
  }

  /**
   * Update an existing event override
   */
  async function updateOverride(
    id: string,
    data: {
      eventName?: string;
      eventDate?: string;
      eventLocation?: string;
      overrides?: Record<string, any>;
      notes?: string;
    }
  ) {
    const response = await $fetch<{
      success: boolean;
      override: EventOverride;
    }>(`/api/admin/event-overrides/${id}`, {
      method: "PUT",
      body: data,
    });

    await refreshEvents();
    return response.override;
  }

  /**
   * Delete an event override
   */
  async function deleteOverride(id: string) {
    await $fetch(`/api/admin/event-overrides/${id}`, {
      method: "DELETE",
    });

    await refreshEvents();
  }

  /**
   * Get all event overrides
   */
  async function getOverrides() {
    const response = await $fetch<{
      success: boolean;
      overrides: EventOverride[];
    }>("/api/admin/event-overrides");
    return response.overrides;
  }

  return {
    createOverride,
    updateOverride,
    deleteOverride,
    getOverrides,
    refreshEvents,
  };
}
