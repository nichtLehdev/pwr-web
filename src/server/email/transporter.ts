import nodemailer from "nodemailer";
import { env } from "@/env";

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
          rejectUnauthorized: false,
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
