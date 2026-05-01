export type AdminEventBucketInput = {
  eventDate: string | Date;
  status?: string | null;
};

function normalizeStatus(status?: string | null) {
  return (status || "").trim().toLowerCase();
}

function getEventTimestamp(event: AdminEventBucketInput) {
  const timestamp = new Date(event.eventDate).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function isUpcomingAdminEvent(
  event: AdminEventBucketInput,
  now = new Date(),
) {
  const status = normalizeStatus(event.status);
  const timestamp = getEventTimestamp(event);

  if (status === "completed" || status === "cancelled") {
    return false;
  }

  if (timestamp === null) {
    return status === "upcoming" || status === "ongoing";
  }

  return timestamp >= now.getTime();
}

export function isCompletedAdminEvent(
  event: AdminEventBucketInput,
  now = new Date(),
) {
  const status = normalizeStatus(event.status);
  const timestamp = getEventTimestamp(event);

  if (status === "completed" || status === "cancelled") {
    return true;
  }

  if (timestamp === null) {
    return false;
  }

  return timestamp < now.getTime();
}