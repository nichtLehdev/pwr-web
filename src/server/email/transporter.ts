import nodemailer from "nodemailer";
import type SMTPPool from "nodemailer/lib/smtp-pool";
import { env } from "@/env";
import { createLogger } from "@/server/utils/logger";

const log = createLogger("Email");

/**
 * Relays cap messages per session and drop the connection at the limit;
 * recycling ourselves costs a handshake instead of a lost message.
 */
const MAX_MESSAGES_PER_CONNECTION = 50;

let warnedNotConfigured = false;

const isSmtpConfigured = () => {
  const configured = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
  if (!configured && !warnedNotConfigured) {
    warnedNotConfigured = true;
    log.warn("SMTP not configured. Missing:", {
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
        // Pooled: one login per recipient trips the relay's limits, and rejected
        // messages are never retried. Needs a long-lived process (not serverless).
        pool: true,
        maxConnections: env.SMTP_MAX_CONNECTIONS,
        maxMessages: MAX_MESSAGES_PER_CONNECTION,
        rateDelta: 1000,
        rateLimit: env.SMTP_MAX_MESSAGES_PER_SECOND,
        tls: {
          // Validation stays on everywhere (a MITM leaks real credentials); opt
          // out only for a local mailcatcher with SMTP_ALLOW_INVALID_CERT=true.
          rejectUnauthorized: process.env.SMTP_ALLOW_INVALID_CERT !== "true",
        },
      };

      return nodemailer.createTransport(config);
    })()
  : null;

export async function verifyEmailConnection() {
  if (!transporter) {
    log.warn("SMTP not configured. Email functionality will be disabled.");
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
