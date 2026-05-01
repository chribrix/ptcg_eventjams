import prisma from "~/lib/prisma";
import { z } from "zod";

const BANNER_STATE_ID = "landing_banner";

const bannerSeveritySchema = z.enum(["info", "warning", "success", "error"]);

const bannerUpdateSchema = z
  .object({
    enabled: z.boolean(),
    severity: bannerSeveritySchema,
    title: z.string().trim().nullable().optional(),
    body: z.string().trim().nullable().optional(),
    ctaLabel: z.string().trim().nullable().optional(),
    ctaHref: z.string().trim().nullable().optional(),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
  })
  .superRefine((value, context) => {
    if (
      (value.ctaLabel && !value.ctaHref) ||
      (!value.ctaLabel && value.ctaHref)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CTA label and CTA link must be provided together",
      });
    }

    if (value.startsAt && value.endsAt) {
      const startsAt = new Date(value.startsAt);
      const endsAt = new Date(value.endsAt);

      if (endsAt.getTime() < startsAt.getTime()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Banner end time must be after the start time",
        });
      }
    }
  });

export type LandingBannerState = {
  enabled: boolean;
  severity: "info" | "warning" | "success" | "error";
  title: string | null;
  body: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

function buildDefaultBannerState(): LandingBannerState {
  return {
    enabled: false,
    severity: "info",
    title: null,
    body: null,
    ctaLabel: null,
    ctaHref: null,
    startsAt: null,
    endsAt: null,
  };
}

function normalizeNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeLandingBannerState(
  rawValue: unknown,
): LandingBannerState {
  const base = buildDefaultBannerState();

  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
    return base;
  }

  const record = rawValue as Record<string, unknown>;

  return {
    enabled: record.enabled === true,
    severity: bannerSeveritySchema.safeParse(record.severity).success
      ? (record.severity as LandingBannerState["severity"])
      : base.severity,
    title: normalizeNullableText(record.title),
    body: normalizeNullableText(record.body),
    ctaLabel: normalizeNullableText(record.ctaLabel),
    ctaHref: normalizeNullableText(record.ctaHref),
    startsAt: typeof record.startsAt === "string" ? record.startsAt : null,
    endsAt: typeof record.endsAt === "string" ? record.endsAt : null,
  };
}

function serializeAdminBannerResponse(record?: {
  value: unknown;
  updatedAt: Date;
  info: unknown;
}) {
  const state = normalizeLandingBannerState(record?.value);
  const info =
    record?.info && typeof record.info === "object" ? record.info : {};
  const updatedBy =
    info && typeof info === "object" && "updatedBy" in info
      ? ((info as Record<string, unknown>).updatedBy as string | null) || null
      : null;

  return {
    banner: {
      ...state,
      updatedAt: (record?.updatedAt || new Date(0)).toISOString(),
      updatedBy,
    },
  };
}

export function isLandingBannerActive(
  banner: LandingBannerState,
  now = new Date(),
) {
  if (!banner.enabled) {
    return false;
  }

  if (banner.startsAt && now.getTime() < new Date(banner.startsAt).getTime()) {
    return false;
  }

  if (banner.endsAt && now.getTime() > new Date(banner.endsAt).getTime()) {
    return false;
  }

  return Boolean(banner.title || banner.body);
}

export async function getAdminLandingBanner() {
  const record = await prisma.metaState.findUnique({
    where: { id: BANNER_STATE_ID },
  });

  return serializeAdminBannerResponse(record || undefined);
}

export async function updateAdminLandingBanner(
  actorUserId: string,
  rawInput: unknown,
) {
  const input = bannerUpdateSchema.parse(rawInput);

  const value = {
    enabled: input.enabled,
    severity: input.severity,
    title: input.title || null,
    body: input.body || null,
    ctaLabel: input.ctaLabel || null,
    ctaHref: input.ctaHref || null,
    startsAt: input.startsAt || null,
    endsAt: input.endsAt || null,
  } satisfies LandingBannerState;

  const record = await prisma.metaState.upsert({
    where: { id: BANNER_STATE_ID },
    create: {
      id: BANNER_STATE_ID,
      value,
      info: {
        updatedBy: actorUserId,
      },
    },
    update: {
      value,
      info: {
        updatedBy: actorUserId,
      },
    },
  });

  return serializeAdminBannerResponse(record);
}

export async function getPublishedLandingBanner() {
  const adminBanner = await getAdminLandingBanner();
  const banner = adminBanner.banner;
  const activeBanner = isLandingBannerActive(banner) ? banner : null;

  return {
    banner: activeBanner,
  };
}
