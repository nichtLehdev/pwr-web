import { transporter, isEmailConfigured } from "./transporter";
import type { SendMailOptions } from "nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions) {
  if (!transporter || !isEmailConfigured()) {
    throw new Error("SMTP is not configured. Please set SMTP environment variables.");
  }

  const mailOptions: SendMailOptions = {
    from: options.from || process.env.SMTP_FROM || process.env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    html: options.html,
    ...(options.text && { text: options.text }),
  };

  try {
    console.log(`[Email] Sending email to ${options.to}...`);
    console.log(`[Email] From: ${mailOptions.from}`);
    console.log(`[Email] Subject: ${mailOptions.subject}`);
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] ✅ Email sent successfully!`);
    console.log(`[Email] Message ID: ${info.messageId}`);
    console.log(`[Email] Response: ${info.response}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email] ❌ Error sending email:", error);
    if (error instanceof Error) {
      console.error("[Email] Error message:", error.message);
      console.error("[Email] Error code:", (error as any).code);
    }
    throw error;
  }
}

