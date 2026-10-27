export const ANALYTICS_RANGE_DAYS = [1, 7, 30, 90] as const;

export type AnalyticsRangeDays = (typeof ANALYTICS_RANGE_DAYS)[number];

export function normalizeAnalyticsRangeDays(value: unknown): AnalyticsRangeDays {
  const days = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  return ANALYTICS_RANGE_DAYS.find((option) => option === days) ?? 1;
}
