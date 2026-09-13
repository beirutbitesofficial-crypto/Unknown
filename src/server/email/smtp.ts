import nodemailer from "nodemailer";
import { env } from "@/lib/env";

function getTransport() {
  if (!env.EMAIL_SMTP_HOST) {
    throw new Error("SMTP is not configured. Set EMAIL_SMTP_HOST and credentials.");
  }

  return nodemailer.createTransport({
    host: env.EMAIL_SMTP_HOST,
    port: env.EMAIL_SMTP_PORT,
    secure: env.EMAIL_SMTP_SECURE,
    auth:
      env.EMAIL_SMTP_USER && env.EMAIL_SMTP_PASS
        ? { user: env.EMAIL_SMTP_USER, pass: env.EMAIL_SMTP_PASS }
        : undefined
  });
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const transport = getTransport();
  await transport.sendMail({ from: env.EMAIL_FROM, ...input });
}
