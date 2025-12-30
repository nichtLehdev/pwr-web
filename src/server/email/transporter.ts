import nodemailer from "nodemailer";
import { env } from "@/env";

// Check if SMTP is configured
const isSmtpConfigured = () => {
  return !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
};

// Create reusable transporter for Mailcow SMTP
export const transporter = isSmtpConfigured()
  ? (() => {
      const port = env.SMTP_PORT ?? 587;
      // Port 465 uses SSL/TLS (secure: true), other ports use STARTTLS (secure: false)
      // Parse SMTP_SECURE the same way as test script: check raw env value
      // This ensures consistency between test script and main transporter
      const rawSecure = process.env.SMTP_SECURE;
      const secure = rawSecure === "true" || (port === 465 && !rawSecure);

      return nodemailer.createTransport({
        host: env.SMTP_HOST!,
        port: port,
        secure: secure, // true for 465 (SSL/TLS), false for 587/25 (STARTTLS)
        auth: {
          user: env.SMTP_USER!,
          pass: env.SMTP_PASSWORD!,
        },
        // Mailcow specific settings
        tls: {
          rejectUnauthorized: false, // Set to true in production with proper certificates
        },
      });
    })()
  : null;

// Verify connection configuration
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
  } catch (error) {
    return false;
  }
}

export function isEmailConfigured() {
  return isSmtpConfigured();
}
