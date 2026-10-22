import { createHmac, timingSafeEqual } from "node:crypto";
import type { H3Event } from "h3";

const ACCESS_TTL_SECONDS = 12 * 60 * 60;

const getSecret = () =>
  process.env.TOM_GUEST_ACCESS_SECRET ||
  process.env.NUXT_TOM_GUEST_ACCESS_SECRET ||
  process.env.NUXT_SESSION_PASSWORD ||
  "dev-tom-guest-access-secret";

const cookieNameForEvent = (eventId: string) =>
  `tom_guest_${createHmac("sha256", getSecret()).update(eventId).digest("hex").slice(0, 20)}`;

const sign = (payload: string) => createHmac("sha256", getSecret()).update(payload).digest("base64url");

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
    path: `/tournaments/${eventId}`,
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
