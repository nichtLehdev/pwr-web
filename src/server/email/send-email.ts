import { transporter, isEmailConfigured } from "./transporter";
import type { SendMailOptions } from "nodemailer";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: EmailAttachment[];
}

export async function sendEmail(options: EmailOptions) {
  if (!transporter || !isEmailConfigured()) {
    const error = new Error(
      "SMTP is not configured. Please set SMTP environment variables.",
    );
    console.error("[Email] Send failed:", error.message);
    throw error;
  }

  const mailOptions: SendMailOptions = {
    from: options.from || process.env.SMTP_FROM || process.env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    html: options.html,
    ...(options.text && { text: options.text }),
    ...(options.attachments?.length && {
      attachments: options.attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    }),
  };

  try {
    console.log("[Email] Attempting to send email:", {
      to: options.to,
      subject: options.subject,
      from: mailOptions.from,
    });
    const info = await transporter.sendMail(mailOptions);
    console.log("[Email] Email sent successfully:", {
      messageId: info.messageId,
      to: options.to,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email] Send error:", {
      to: options.to,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
