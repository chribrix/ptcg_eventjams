import nodemailer from "nodemailer";

const fromAddress = process.env.WAITLIST_FROM_EMAIL || "noreply@eventjams.local";

function getBaseUrl(): string {
  const configured = process.env.APP_BASE_URL || "";
  return configured.endsWith("/") ? configured.slice(0, -1) : configured;
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

type WaitlistMailInput = {
  to: string;
  playerName: string;
  eventName: string;
  eventId: string;
  claimExpiresAt: Date;
  claimWindowHours: number;
};

export async function sendWaitlistSpotAvailableEmail(input: WaitlistMailInput) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    console.warn("APP_BASE_URL is missing. Skipping waitlist email send.");
    return;
  }

  const transporter = createTransporter();
  if (!transporter) {
    console.warn("SMTP config missing. Skipping waitlist email send.");
    return;
  }

  const confirmUrl = `${baseUrl}/events/register/${input.eventId}?waitlistConfirm=1`;
  const expiresText = input.claimExpiresAt.toISOString();

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: input.to,
      subject: `Spot available: ${input.eventName}`,
      text:
        `Hi ${input.playerName},\n\n` +
        `a spot became available for ${input.eventName}.\n` +
        `Please confirm within ${input.claimWindowHours} hours: ${confirmUrl}\n\n` +
        `Deadline: ${expiresText}\n`,
      html:
        `<p>Hi ${input.playerName},</p>` +
        `<p>a spot became available for <strong>${input.eventName}</strong>.</p>` +
        `<p>Please confirm within ${input.claimWindowHours} hours:<br/><a href=\"${confirmUrl}\">Confirm spot</a></p>` +
        `<p>Deadline: ${expiresText}</p>`,
    });
  } catch (error) {
    // Mail transport issues must not block booking/waitlist state changes.
    console.error("[waitlist_mail_send_failed]", error);
  }
}
