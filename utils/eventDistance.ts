import type { EventLocationPreference } from "~/utils/eventLocationPreference";

export type EventCoordinates = {
  latitude?: number | null;
  longitude?: number | null;
};

/** Great-circle distance in kilometers; shared by server radius filtering and client labels. */
export function distanceKm(firstLat: number, firstLon: number, secondLat: number, secondLon: number): number {
  const radians = Math.PI / 180;
  const dLat = (secondLat - firstLat) * radians;
  const dLon = (secondLon - firstLon) * radians;
  const haversine = Math.sin(dLat / 2) ** 2 +
    Math.cos(firstLat * radians) * Math.cos(secondLat * radians) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function getRoadDistanceLabel(
  preference: EventLocationPreference | null,
  event: EventCoordinates,
  meters: number | null | undefined,
): string | null {
  if (preference?.mode !== "nearby") return null;
  const { latitude, longitude } = event;
  if (typeof latitude !== "number" || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      typeof longitude !== "number" || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  return roadDistanceLabel(meters);
}

export function roadDistanceLabel(meters: number | null | undefined): string | null {
  if (typeof meters !== "number" || !Number.isFinite(meters) || meters < 0) return null;
  return `${Math.max(1, Math.round(meters / 1000))} km`;
}
