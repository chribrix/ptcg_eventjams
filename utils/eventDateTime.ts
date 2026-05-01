export const DEFAULT_EVENT_TIME_ZONE = "Europe/Berlin";

const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  return date;
}

function getDateTimeParts(
  value: Date | string,
  timeZone: string = DEFAULT_EVENT_TIME_ZONE,
): DateTimeParts {
  const date = toDate(value);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour12: false,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || "0");

  return {
    year: lookup("year"),
    month: lookup("month"),
    day: lookup("day"),
    hour: lookup("hour"),
    minute: lookup("minute"),
    second: lookup("second"),
  };
}

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string): number {
  const parts = getDateTimeParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return asUtc - date.getTime();
}

export function getUserTimeZone(
  fallback: string = DEFAULT_EVENT_TIME_ZONE,
): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

export function formatDateTimeLocalInput(
  value: Date | string,
  timeZone: string = DEFAULT_EVENT_TIME_ZONE,
): string {
  const parts = getDateTimeParts(value, timeZone);

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(
    parts.hour,
  )}:${pad(parts.minute)}`;
}

export function parseDateTimeLocalInput(
  value: string,
  timeZone: string = DEFAULT_EVENT_TIME_ZONE,
): Date {
  if (!DATETIME_LOCAL_PATTERN.test(value)) {
    throw new Error("Invalid datetime format. Expected YYYY-MM-DDTHH:MM");
  }

  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let timestamp =
    utcGuess - getTimeZoneOffsetMilliseconds(new Date(utcGuess), timeZone);
  const correctedTimestamp =
    utcGuess -
    getTimeZoneOffsetMilliseconds(new Date(timestamp), timeZone);

  if (correctedTimestamp !== timestamp) {
    timestamp = correctedTimestamp;
  }

  return new Date(timestamp);
}

export function formatDateInTimeZone(
  value: Date | string,
  options: Intl.DateTimeFormatOptions,
  locale = "de-DE",
  timeZone: string = DEFAULT_EVENT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone,
  }).format(toDate(value));
}

export function getDateKeyInTimeZone(
  value: Date | string,
  timeZone: string = DEFAULT_EVENT_TIME_ZONE,
): string {
  const parts = getDateTimeParts(value, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}
