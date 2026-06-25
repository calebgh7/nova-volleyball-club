// Email sending via the club's Google Workspace SMTP for aznova.org (C2).
// No third-party email service (decision 2026-06-22). Uses a Workspace account
// + App Password configured in .env.local (SMTP_* / EMAIL_FROM).
//
// Server-only. Runs in the Node.js runtime (nodemailer is not edge-compatible).
import nodemailer from "nodemailer";

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD &&
      process.env.EMAIL_FROM
  );
}

let transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transport;
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

/** Send a single plain-text email. Recipients are emailed individually so they
 *  never see each other's addresses. */
export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<SendResult> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "Email (SMTP) is not configured." };
  }
  try {
    await getTransport().sendMail({
      from: process.env.EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      text: params.body,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Send failed" };
  }
}
