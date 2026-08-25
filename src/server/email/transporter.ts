import nodemailer from "nodemailer";
import type SMTPPool from "nodemailer/lib/smtp-pool";
import { env } from "@/env";

/**
 * Messages sent down one pooled connection before it is recycled. Relays
 * commonly cap how many a single session may carry and simply drop the
 * connection at the limit — reconnecting on our own terms costs one handshake
 * instead of one lost message.
 */
const MAX_MESSAGES_PER_CONNECTION = 50;

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

      const config: SMTPPool.Options = {
        host: env.SMTP_HOST!,
        port: port,
        secure: secure,
        auth: {
          user: env.SMTP_USER!,
          pass: env.SMTP_PASSWORD!,
        },
        // Reuse connections. Unpooled, nodemailer opens a fresh TCP + TLS +
        // AUTH round for every single message, which makes a newsletter or a
        // course blast slow (one handshake per recipient) and hostile to the
        // relay (one login per recipient, several in parallel). Once the
        // relay's connection or rate limit is crossed it rejects the rest of
        // the run — and a rejected message is never retried, so those people
        // simply never receive it.
        //
        // Sound here because the app is a long-lived Node process; a pooled
        // transport would strand sockets in a serverless deployment.
        pool: true,
        maxConnections: env.SMTP_MAX_CONNECTIONS,
        maxMessages: MAX_MESSAGES_PER_CONNECTION,
        rateDelta: 1000,
        rateLimit: env.SMTP_MAX_MESSAGES_PER_SECOND,
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
