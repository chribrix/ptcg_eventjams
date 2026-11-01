import { readonly } from "vue";
import {
  EVENT_LOCATION_STORAGE_KEY,
  parseEventLocationPreference,
  isGenericDeviceLocationLabel,
  type EventLocationPreference,
  type PostcodeCountry,
} from "~/utils/eventLocationPreference";

const pendingDevicePlaces = new Map<string, Promise<void>>();

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

  async function enrichDevicePlace(): Promise<void> {
    const current = preference.value;
    if (!import.meta.client || current?.mode !== "nearby" || current.source !== "device" ||
        !isGenericDeviceLocationLabel(current.label)) return;
    const key = `${current.latitude},${current.longitude}`;
    let request = pendingDevicePlaces.get(key);
    if (!request) {
      request = (async () => {
        try {
          const result = await $fetch<{ place: string | null; country: PostcodeCountry | null }>("/api/locations/reverse", {
            query: { latitude: current.latitude, longitude: current.longitude },
          });
          const latest = preference.value;
          if (!result.place || latest?.mode !== "nearby" || latest.source !== "device" ||
              latest.latitude !== current.latitude || latest.longitude !== current.longitude ||
              !isGenericDeviceLocationLabel(latest.label)) return;
          const country = result.country === "DE" || result.country === "AT" || result.country === "CH"
            ? result.country : latest.country;
          save({ ...latest, country, label: result.place });
        } catch {
          // The saved coordinates remain usable even if the place lookup fails.
        }
      })();
      pendingDevicePlaces.set(key, request);
      void request.finally(() => pendingDevicePlaces.delete(key));
    }
    await request;
  }

  return { preference: readonly(preference), initialized: readonly(initialized), initialize, save, enrichDevicePlace };
}
