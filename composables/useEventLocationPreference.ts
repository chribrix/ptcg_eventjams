import { readonly } from "vue";
import {
  EVENT_LOCATION_STORAGE_KEY,
  parseEventLocationPreference,
  type EventLocationPreference,
} from "~/utils/eventLocationPreference";

export function useEventLocationPreference() {
  const preference = useState<EventLocationPreference | null>("event-location-preference", () => null);
  const initialized = useState<boolean>("event-location-initialized", () => false);

  function initialize() {
    if (!import.meta.client || initialized.value) return;
    try {
      preference.value = parseEventLocationPreference(localStorage.getItem(EVENT_LOCATION_STORAGE_KEY));
    } catch {
      preference.value = null;
    }
    initialized.value = true;
  }

  function save(next: EventLocationPreference) {
    preference.value = next;
    initialized.value = true;
    if (import.meta.client) {
      try { localStorage.setItem(EVENT_LOCATION_STORAGE_KEY, JSON.stringify(next)); } catch { /* Filter works until reload. */ }
    }
  }

  return { preference: readonly(preference), initialized: readonly(initialized), initialize, save };
}
