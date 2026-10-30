import { createHmac, timingSafeEqual } from "node:crypto";
import type { H3Event } from "h3";
import { getRequestIP } from "h3";

// Tournament access must survive imports between rounds and remain available
// for the 24-hour post-tournament history window.
const ACCESS_TTL_SECONDS = 48 * 60 * 60;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 8;
const failedAttempts = new Map<string, { count: number; expiresAt: number }>();

const getSecret = () => {
  const secret = process.env.TOM_GUEST_ACCESS_SECRET ||
    process.env.NUXT_TOM_GUEST_ACCESS_SECRET ||
    process.env.NUXT_SESSION_PASSWORD;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Tournament guest access secret is not configured");
  }
  return "dev-tom-guest-access-secret";
};

const cookieNameForEvent = (eventId: string) =>
  `tom_guest_${createHmac("sha256", getSecret()).update(eventId).digest("hex").slice(0, 20)}`;

const sign = (payload: string) => createHmac("sha256", getSecret()).update(payload).digest("base64url");

const attemptKey = (event: H3Event, eventId: string, playerUserId: string) =>
  createHmac("sha256", getSecret())
    .update(JSON.stringify([eventId, playerUserId, getRequestIP(event) || "unknown"]))
    .digest("hex");

export const assertTomGuestAccessAttemptsAvailable = (event: H3Event, eventId: string, playerUserId: string) => {
  const now = Date.now();
  const key = attemptKey(event, eventId, playerUserId);
  const current = failedAttempts.get(key);
  if (current && current.expiresAt > now && current.count >= MAX_FAILED_ATTEMPTS) {
    throw createError({ statusCode: 429, statusMessage: "Zu viele Versuche. Bitte versuche es in 15 Minuten erneut." });
  }
  if (current && current.expiresAt <= now) failedAttempts.delete(key);
  return key;
};

export const recordTomGuestAccessFailure = (key: string) => {
  const now = Date.now();
  const current = failedAttempts.get(key);
  if (current && current.expiresAt > now) {
    current.count += 1;
  } else {
    failedAttempts.set(key, { count: 1, expiresAt: now + ATTEMPT_WINDOW_MS });
  }
  if (failedAttempts.size > 20_000) {
    for (const [entryKey, entry] of failedAttempts) {
      if (entry.expiresAt <= now) failedAttempts.delete(entryKey);
    }
    if (failedAttempts.size > 20_000) failedAttempts.delete(failedAttempts.keys().next().value!);
  }
};

export const clearTomGuestAccessFailures = (key: string) => failedAttempts.delete(key);

type GuestAccessPayload = { eventId: string; playerUserId: string; expiresAt: number };

export const grantTomGuestAccess = (event: H3Event, eventId: string, playerUserId: string) => {
  const payload: GuestAccessPayload = {
    eventId,
    playerUserId,
    expiresAt: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  setCookie(event, cookieNameForEvent(eventId), `${encoded}.${sign(encoded)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // The player view itself lives at /tournaments/:eventId, but its data is
    // fetched from /api/tournaments/:eventId. The cookie must cover both.
    path: "/",
    maxAge: ACCESS_TTL_SECONDS,
  });
};

export const resolveTomGuestAccess = (event: H3Event, eventId: string): string | null => {
  const token = getCookie(event, cookieNameForEvent(eventId));
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as GuestAccessPayload;
    if (payload.eventId !== eventId || !payload.playerUserId || payload.expiresAt <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload.playerUserId;
  } catch {
    return null;
  }
};
