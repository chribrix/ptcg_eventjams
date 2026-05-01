import {
  DEFAULT_EVENT_TIME_ZONE,
  getDateKeyInTimeZone,
} from "~/utils/eventDateTime";

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

function compareEventDayToNow(
  event: AdminEventBucketInput,
  now: Date,
  timeZone: string = DEFAULT_EVENT_TIME_ZONE,
) {
  const timestamp = getEventTimestamp(event);

  if (timestamp === null) {
    return null;
  }

  const eventDay = getDateKeyInTimeZone(event.eventDate, timeZone);
  const currentDay = getDateKeyInTimeZone(now, timeZone);

  if (eventDay === currentDay) return 0;
  return eventDay > currentDay ? 1 : -1;
}

export function isUpcomingAdminEvent(
  event: AdminEventBucketInput,
  now = new Date(),
  timeZone: string = DEFAULT_EVENT_TIME_ZONE,
) {
  const status = normalizeStatus(event.status);
  const dayComparison = compareEventDayToNow(event, now, timeZone);

  if (status === "completed" || status === "cancelled") {
    return false;
  }

  if (dayComparison === null) {
    return status === "upcoming" || status === "ongoing";
  }

  return dayComparison >= 0;
}

export function isCompletedAdminEvent(
  event: AdminEventBucketInput,
  now = new Date(),
  timeZone: string = DEFAULT_EVENT_TIME_ZONE,
) {
  const status = normalizeStatus(event.status);
  const dayComparison = compareEventDayToNow(event, now, timeZone);

  if (status === "completed" || status === "cancelled") {
    return true;
  }

  if (dayComparison === null) {
    return false;
  }

  return dayComparison < 0;
}
