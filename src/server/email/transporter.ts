import nodemailer from "nodemailer";
import { env } from "@/env";

// Check if SMTP is configured
const isSmtpConfigured = () => {
  return !!(
    env.SMTP_HOST &&
    env.SMTP_USER &&
    env.SMTP_PASSWORD
  );
};

// Create reusable transporter for Mailcow SMTP
export const transporter = isSmtpConfigured()
  ? nodemailer.createTransport({
      host: env.SMTP_HOST!,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_SECURE ?? false, // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER!,
        pass: env.SMTP_PASSWORD!,
      },
      // Mailcow specific settings
      tls: {
        rejectUnauthorized: false, // Set to true in production with proper certificates
      },
    })
  : null;

// Verify connection configuration
export async function verifyEmailConnection() {
  if (!transporter) {
    console.warn("⚠️  SMTP not configured. Email functionality will be disabled.");
    return false;
  }

  try {
    await transporter.verify();
    console.log("✅ Email server is ready to send messages");
    return true;
  } catch (error) {
    console.error("❌ Email server connection failed:", error);
    return false;
  }
}

export function isEmailConfigured() {
  return isSmtpConfigured();
}

