import nodemailer from "nodemailer";
import { env } from "@/env";

// Check if SMTP is configured
const isSmtpConfigured = () => {
  const configured = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
  if (!configured) {
    console.warn("[Email] SMTP not configured. Missing:", {
      SMTP_HOST: !!env.SMTP_HOST,
      SMTP_USER: !!env.SMTP_USER,
      SMTP_PASSWORD: !!env.SMTP_PASSWORD,
    });
  }
  return configured;
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

      const config = {
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
      };

      console.log("[Email] SMTP transporter configured:", {
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.auth.user,
        passwordSet: !!config.auth.pass,
      });

      return nodemailer.createTransport(config);
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
  } catch {
    return false;
  }
}

export function isEmailConfigured() {
  return isSmtpConfigured();
}
