import { createHmac, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { H3Event } from "h3";
import { getHeader, getRequestIP } from "h3";
import prisma from "~/lib/prisma";

export const ANALYTICS_EVENT_TYPES = [
  "page_view",
  "registration_completed",
  "waitlist_joined",
  "waitlist_confirmed",
  "event_bookmarked",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

type AnalyticsInput = {
  eventType: AnalyticsEventType;
  path: string;
  eventId?: string | null;
};

// Public pages are frequently fetched by link previewers, security scanners and
// generic HTTP clients. None of those requests should become website traffic.
const AUTOMATED_CLIENT_PATTERN = /bot|crawler|spider|headless|preview|facebookexternalhit|slurp|curl|wget|python|axios|postman|insomnia|httpx|go-http-client|zgrab|nmap|masscan|node-fetch|okhttp|java\//i;
const TIME_ZONE = "Europe/Berlin";

export function normalizeAnalyticsPath(input: string): string | null {
  const rawPath = input.trim().split(/[?#]/, 1)[0] || "/";
  if (!rawPath.startsWith("/")) {
    return null;
  }

  const path = rawPath.replace(/^\/(?:de|en)(?=\/|$)/, "") || "/";
  if (path.startsWith("/api/") || path.startsWith("/admin")) {
    return null;
  }
  return path.slice(0, 300);
}

function isFirstPartyBrowserRequest(event: H3Event): boolean {
  const origin = getHeader(event, "origin");
  const host = getHeader(event, "x-forwarded-host") || getHeader(event, "host");
  if (!origin || !host) return false;

  try {
    // Allow a port on the local development host, but require the same host in
    // production. This prevents external scanners from posting made-up views.
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function dailyVisitorHash(event: H3Event, occurredAt: Date): string {
  const forwardedIp = getRequestIP(event, { xForwardedFor: true }) || "unknown";
  const userAgent = getHeader(event, "user-agent") || "unknown";
  const day = occurredAt.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
  const secret =
    process.env.ANALYTICS_SALT ||
    process.env.NUXT_SESSION_PASSWORD ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "local-development-analytics-salt";

  return createHmac("sha256", secret)
    .update(`${day}|${forwardedIp}|${userAgent}`)
    .digest("hex");
}

export async function recordAnalyticsEvent(event: H3Event, input: AnalyticsInput) {
  const path = normalizeAnalyticsPath(input.path);
  const userAgent = getHeader(event, "user-agent") || "";
  if (!path || AUTOMATED_CLIENT_PATTERN.test(userAgent) || !isFirstPartyBrowserRequest(event)) {
    return { tracked: false };
  }

  const occurredAt = new Date();
  const visitorHash = dailyVisitorHash(event, occurredAt);
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO public.analytics_events
      (id, occurred_at, event_type, path, visitor_hash, event_id, metadata)
    VALUES
      (${randomUUID()}, ${occurredAt}, ${input.eventType}, ${path}, ${visitorHash}, ${input.eventId || null}, '{}'::jsonb)
  `);

  return { tracked: true };
}

type CountRow = { value: bigint | number };
type DailyRow = {
  date: Date | string;
  page_views: bigint | number;
  visitors: bigint | number;
  registrations: bigint | number;
};
type BreakdownRow = { key: string; count: bigint | number };

const asNumber = (value: bigint | number) => Number(value);

export async function getAnalyticsOverview(days: number) {
  const safeDays = [7, 30, 90].includes(days) ? days : 30;
  const rangeStart = Prisma.sql`(
    (CURRENT_TIMESTAMP AT TIME ZONE ${TIME_ZONE})::date - (${safeDays}::int - 1)
  )`;

  const [pageViews, visitors, registrations, waitlistJoins, daily, actions, topPages] =
    await Promise.all([
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*) AS value
        FROM public.analytics_events
        WHERE event_type = 'page_view'
          AND (occurred_at AT TIME ZONE ${TIME_ZONE})::date >= ${rangeStart}
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(DISTINCT visitor_hash) AS value
        FROM public.analytics_events
        WHERE (occurred_at AT TIME ZONE ${TIME_ZONE})::date >= ${rangeStart}
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*) AS value
        FROM public.analytics_events
        WHERE event_type = 'registration_completed'
          AND (occurred_at AT TIME ZONE ${TIME_ZONE})::date >= ${rangeStart}
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*) AS value
        FROM public.analytics_events
        WHERE event_type = 'waitlist_joined'
          AND (occurred_at AT TIME ZONE ${TIME_ZONE})::date >= ${rangeStart}
      `),
      prisma.$queryRaw<DailyRow[]>(Prisma.sql`
        WITH days AS (
          SELECT generate_series(
            ${rangeStart},
            (CURRENT_TIMESTAMP AT TIME ZONE ${TIME_ZONE})::date,
            INTERVAL '1 day'
          )::date AS day
        )
        SELECT
          days.day AS date,
          COUNT(events.id) FILTER (WHERE events.event_type = 'page_view') AS page_views,
          COUNT(DISTINCT events.visitor_hash) AS visitors,
          COUNT(events.id) FILTER (WHERE events.event_type = 'registration_completed') AS registrations
        FROM days
        LEFT JOIN public.analytics_events events
          ON (events.occurred_at AT TIME ZONE ${TIME_ZONE})::date = days.day
        GROUP BY days.day
        ORDER BY days.day ASC
      `),
      prisma.$queryRaw<BreakdownRow[]>(Prisma.sql`
        SELECT
          CASE
            WHEN event_type = 'registration_completed' THEN 'registration_completed'
            WHEN event_type = 'waitlist_joined' THEN 'waitlist_joined'
            WHEN event_type = 'waitlist_confirmed' THEN 'waitlist_confirmed'
            WHEN event_type = 'event_bookmarked' THEN 'event_bookmarked'
            WHEN path = '/eventlist' THEN 'event_list_view'
            WHEN path ~ '^/events/register/[^/]+$' THEN 'registration_form_view'
            WHEN path ~ '^/events/[^/]+$' THEN 'event_detail_view'
            WHEN path = '/dashboard' THEN 'dashboard_view'
            WHEN path = '/' THEN 'landing_page_view'
            ELSE 'other_page_view'
          END AS key,
          COUNT(*) AS count
        FROM public.analytics_events
        WHERE (occurred_at AT TIME ZONE ${TIME_ZONE})::date >= ${rangeStart}
        GROUP BY key
        ORDER BY count DESC
      `),
      prisma.$queryRaw<BreakdownRow[]>(Prisma.sql`
        SELECT
          CASE
            WHEN path ~ '^/events/register/[^/]+$' THEN '/events/register/:id'
            WHEN path ~ '^/events/[^/]+$' THEN '/events/:id'
            ELSE path
          END AS key,
          COUNT(*) AS count
        FROM public.analytics_events
        WHERE event_type = 'page_view'
          AND (occurred_at AT TIME ZONE ${TIME_ZONE})::date >= ${rangeStart}
        GROUP BY key
        ORDER BY count DESC
        LIMIT 8
      `),
    ]);

  return {
    rangeDays: safeDays,
    summary: {
      pageViews: asNumber(pageViews[0]?.value || 0),
      visitors: asNumber(visitors[0]?.value || 0),
      registrations: asNumber(registrations[0]?.value || 0),
      waitlistJoins: asNumber(waitlistJoins[0]?.value || 0),
    },
    daily: daily.map((row) => ({
      date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date),
      pageViews: asNumber(row.page_views),
      visitors: asNumber(row.visitors),
      registrations: asNumber(row.registrations),
    })),
    actions: actions.map((row) => ({ key: row.key, count: asNumber(row.count) })),
    topPages: topPages.map((row) => ({ path: row.key, count: asNumber(row.count) })),
  };
}
