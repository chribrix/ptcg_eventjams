import { getRoadDistanceLabel, type EventCoordinates } from "~/utils/eventDistance";
import type { EventLocationPreference } from "~/utils/eventLocationPreference";

type Point = { latitude: number; longitude: number };

const coordinateKey = (point: Point) => `${point.latitude.toFixed(3)},${point.longitude.toFixed(3)}`;
const pendingKeys = new Set<string>();
const retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const retryAttempts = new Map<string, number>();

export function useRoadDistances() {
  const distances = useState<Record<string, number>>("event-road-distances", () => ({}));

  function key(preference: EventLocationPreference | null, event: EventCoordinates): string | null {
    if (preference?.mode !== "nearby" || typeof event.latitude !== "number" || typeof event.longitude !== "number" ||
        !Number.isFinite(event.latitude) || !Number.isFinite(event.longitude)) return null;
    return `${coordinateKey(preference)}:${coordinateKey({ latitude: event.latitude, longitude: event.longitude })}`;
  }

  function label(preference: EventLocationPreference | null, event: EventCoordinates): string | null {
    const eventKey = key(preference, event);
    return eventKey ? getRoadDistanceLabel(preference, event, distances.value[eventKey]) : null;
  }

  function scheduleRetry(preference: EventLocationPreference, chunk: Array<[string, Point]>, seconds: number): void {
    const retry = chunk.filter(([eventKey]) => distances.value[eventKey] === undefined && !retryTimers.has(eventKey) && (retryAttempts.get(eventKey) || 0) < 2);
    if (!retry.length) return;
    retry.forEach(([eventKey]) => retryAttempts.set(eventKey, (retryAttempts.get(eventKey) || 0) + 1));
    const timer = setTimeout(() => {
      retry.forEach(([eventKey]) => retryTimers.delete(eventKey));
      void load(preference, retry.map(([, point]) => point));
    }, Math.max(5, seconds) * 1000);
    retry.forEach(([eventKey]) => retryTimers.set(eventKey, timer));
  }

  async function load(preference: EventLocationPreference | null, events: EventCoordinates[]): Promise<void> {
    if (!import.meta.client || preference?.mode !== "nearby") return;
    const unique = new Map<string, Point>();
    for (const event of events) {
      const eventKey = key(preference, event);
      if (eventKey && distances.value[eventKey] === undefined && !pendingKeys.has(eventKey) && !retryTimers.has(eventKey)) unique.set(eventKey, event as Point);
    }
    const pending = [...unique];
    pending.forEach(([eventKey]) => pendingKeys.add(eventKey));
    for (let index = 0; index < pending.length; index += 40) {
      const chunk = pending.slice(index, index + 40);
      try {
        const response = await $fetch<{ meters: Array<number | null>; retryAfterSeconds?: number }>("/api/events/road-distances", {
          method: "POST",
          body: { origin: { latitude: preference.latitude, longitude: preference.longitude }, destinations: chunk.map(([, point]) => point) },
        });
        chunk.forEach(([eventKey], position) => {
          const meters = response.meters[position];
          if (typeof meters === "number" && Number.isFinite(meters)) {
            distances.value[eventKey] = meters;
            retryAttempts.delete(eventKey);
          }
        });
        if (response.retryAfterSeconds && response.retryAfterSeconds > 0) scheduleRetry(preference, chunk, response.retryAfterSeconds);
      } catch {
        scheduleRetry(preference, chunk, 60);
      } finally {
        chunk.forEach(([eventKey]) => pendingKeys.delete(eventKey));
      }
    }
  }

  return { label, load };
}
