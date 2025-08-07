import { sendMagicLinkEmail } from "../util/mailer";

const magicLinks = new Map<string, { email: string; expires: number }>();

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, name, playerId } = body;

  if (!email || !name || !playerId) {
    return sendError(
      event,
      createError({ statusCode: 400, statusMessage: "Missing fields" })
    );
  }

  const token = crypto.randomUUID();
  const magicLink = `http://localhost:3000/magic-login?token=${token}`;

  // Store with 10-minute expiration
  magicLinks.set(token, {
    email,
    expires: Date.now() + 10 * 60 * 1000,
  });

  await sendMagicLinkEmail(email, magicLink);

  return { success: true };
});
