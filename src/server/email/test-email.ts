import nodemailer from "nodemailer";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env file explicitly (tsx doesn't auto-load .env)
config({ path: resolve(process.cwd(), ".env") });

/**
 * Test script to verify email configuration and send a test email
 * Run with: pnpm tsx src/server/email/test-email.ts
 */
async function testEmail() {
  console.log("🧪 Testing email configuration...\n");

  // Check SMTP configuration directly from environment
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpSecure = process.env.SMTP_SECURE === "true";

  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.error("❌ SMTP is not configured!");
    console.log("\nPlease set the following environment variables in your .env file:");
    console.log("  SMTP_HOST=mail.your-domain.com");
    console.log("  SMTP_PORT=587");
    console.log("  SMTP_SECURE=false");
    console.log("  SMTP_USER=noreply@your-domain.com");
    console.log("  SMTP_PASSWORD=your-password");
    console.log("  SMTP_FROM=noreply@your-domain.com (optional)");
    console.log("\nCurrent values:");
    console.log(`  SMTP_HOST: ${smtpHost || "(not set)"}`);
    console.log(`  SMTP_USER: ${smtpUser || "(not set)"}`);
    console.log(`  SMTP_PASSWORD: ${smtpPassword ? "***" : "(not set)"}`);
    console.log(`  SMTP_PORT: ${smtpPort}`);
    console.log(`  SMTP_SECURE: ${smtpSecure}`);
    process.exit(1);
  }

  // Create transporter for testing
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // Test connection
  console.log("1. Testing SMTP connection...");
  try {
    await transporter.verify();
    console.log("✅ Email server is ready to send messages");
  } catch (error) {
    console.error("❌ Email server connection failed:", error);
    process.exit(1);
  }

  // Test sending a simple email
  console.log("\n2. Sending test email...");
  
  const testEmail = process.env.TEST_EMAIL || "test@example.com";
  const fromEmail = process.env.SMTP_FROM || smtpUser;

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: testEmail,
      subject: "Test Email - Posaunenwerk Rheinland",
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #1e40af;">Test Email</h2>
            <p>This is a test email from the Posaunenwerk Rheinland email system.</p>
            <p>If you received this email, your SMTP configuration is working correctly! ✅</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">
              Evangelisches Posaunenwerk in der Evangelischen Kirche im Rheinland
            </p>
          </body>
        </html>
      `,
      text: `This is a test email from the Posaunenwerk Rheinland email system.\n\nIf you received this email, your SMTP configuration is working correctly!`,
    });

    console.log(`✅ Test email sent successfully to ${testEmail}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log("\n📧 Please check your inbox (and spam folder) for the test email.");
  } catch (error) {
    console.error("\n❌ Failed to send test email:", error);
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
    }
    process.exit(1);
  }

  console.log("\n✅ All email tests passed!");
}

// Run if called directly (tsx will execute this)
testEmail().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});

export { testEmail };

