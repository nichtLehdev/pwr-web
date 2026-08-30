import { transporter, isEmailConfigured } from "./transporter";
import { maskEmail } from "@/lib/mask-email";
import type { SendMailOptions } from "nodemailer";
import { createLogger } from "@/server/utils/logger";

const log = createLogger("Email");

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
  replyTo?: string;
  attachments?: EmailAttachment[];
  /**
   * Extra MIME headers. Used for List-Unsubscribe on bulk mail; anything set
   * here goes out verbatim, so values must not carry CR/LF.
   */
  headers?: Record<string, string>;
}

export async function sendEmail(options: EmailOptions) {
  if (!transporter || !isEmailConfigured()) {
    const error = new Error(
      "SMTP is not configured. Please set SMTP environment variables.",
    );
    log.error("Send failed:", error.message);
    throw error;
  }

  const mailOptions: SendMailOptions = {
    from: options.from || process.env.SMTP_FROM || process.env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    html: options.html,
    ...(options.replyTo && { replyTo: options.replyTo }),
    ...(options.text && { text: options.text }),
    ...(options.headers && { headers: options.headers }),
    ...(options.attachments?.length && {
      attachments: options.attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    }),
  };

  try {
    log.debug("Attempting to send email:", {
      to: maskEmail(options.to),
      subject: options.subject,
      from: mailOptions.from,
    });
    const info = await transporter.sendMail(mailOptions);
    log.info("Email sent successfully:", {
      messageId: info.messageId,
      to: maskEmail(options.to),
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    log.error("Send error:", {
      to: maskEmail(options.to),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
