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
  ? (() => {
      const port = env.SMTP_PORT ?? 587;
      // Port 465 uses SSL/TLS (secure: true), other ports use STARTTLS (secure: false)
      // Parse SMTP_SECURE the same way as test script: check raw env value
      // This ensures consistency between test script and main transporter
      const rawSecure = process.env.SMTP_SECURE;
      const secure = rawSecure === "true" || (port === 465 && !rawSecure);
      
      console.log(`[Email] Configuring SMTP:`);
      console.log(`  Host: ${env.SMTP_HOST}`);
      console.log(`  Port: ${port}`);
      console.log(`  Secure: ${secure} (${secure ? 'SSL/TLS' : 'STARTTLS'})`);
      console.log(`  User: ${env.SMTP_USER}`);
      
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
      
      console.log(`[Email] Full config:`, JSON.stringify({ ...config, auth: { user: config.auth.user, pass: '***' } }, null, 2));
      
      return nodemailer.createTransport(config);
    })()
  : null;

// Verify connection configuration
export async function verifyEmailConnection() {
  if (!transporter) {
    console.warn("⚠️  SMTP not configured. Email functionality will be disabled.");
    return false;
  }

  try {
    const port = env.SMTP_PORT ?? 587;
    const secure = env.SMTP_SECURE ?? (port === 465);
    console.log(`[Email] Verifying connection to ${env.SMTP_HOST}:${port} (secure: ${secure})`);
    
    await transporter.verify();
    console.log("✅ Email server is ready to send messages");
    return true;
  } catch (error) {
    console.error("❌ Email server connection failed:", error);
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
      if (error.message.includes("wrong version number")) {
        console.error("   💡 This usually means a port/secure mismatch:");
        console.error("      - Port 587 should use SMTP_SECURE=false (STARTTLS)");
        console.error("      - Port 465 should use SMTP_SECURE=true (SSL/TLS)");
      }
    }
    return false;
  }
}

export function isEmailConfigured() {
  return isSmtpConfigured();
}

