import nodemailer from "nodemailer";
import { env } from "@/env";

let warnedNotConfigured = false;

const isSmtpConfigured = () => {
  const configured = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
  if (!configured && !warnedNotConfigured) {
    warnedNotConfigured = true;
    console.warn("[Email] SMTP not configured. Missing:", {
      SMTP_HOST: !!env.SMTP_HOST,
      SMTP_USER: !!env.SMTP_USER,
      SMTP_PASSWORD: !!env.SMTP_PASSWORD,
    });
  }
  return configured;
};

export const transporter = isSmtpConfigured()
  ? (() => {
      const port = env.SMTP_PORT ?? 587;
      const rawSecure = process.env.SMTP_SECURE;
      const secure = rawSecure === "true" || (port === 465 && !rawSecure);

      const config = {
        host: env.SMTP_HOST!,
        port: port,
        secure: secure,
        auth: {
          user: env.SMTP_USER!,
          pass: env.SMTP_PASSWORD!,
        },
        tls: {
          // TLS certificate validation stays on everywhere — a staging or
          // dev deployment MITM'd on SMTP leaks real credentials. Set
          // SMTP_ALLOW_INVALID_CERT=true explicitly for a local mailcatcher
          // with a self-signed certificate.
          rejectUnauthorized: process.env.SMTP_ALLOW_INVALID_CERT !== "true",
        },
      };

      return nodemailer.createTransport(config);
    })()
  : null;

export async function verifyEmailConnection() {
  if (!transporter) {
    console.warn(
      "⚠️  SMTP not configured. Email functionality will be disabled.",
    );
    return false;
  }

  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}

export function isEmailConfigured() {
  return isSmtpConfigured();
}
