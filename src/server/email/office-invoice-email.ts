import { render } from "@react-email/components";
import { sendEmail } from "./send-email";
import {
  OfficeInvoiceMail,
  officeInvoiceMailText,
} from "./templates/office-invoice";

/**
 * Antworten sollen bei der Geschäftsstelle landen, nicht beim noreply-Absender.
 * Weitere Adressen aus der Tabelle lesen in Kopie mit.
 */
export async function sendOfficeInvoiceEmail(params: {
  to: string;
  cc?: string[];
  replyTo?: string;
  subject: string;
  body: string;
  pdf: { filename: string; content: Buffer };
}) {
  const props = { body: params.body, attachmentName: params.pdf.filename };
  const html = await render(OfficeInvoiceMail(props));

  return sendEmail({
    to: params.to,
    ...(params.cc?.length && { cc: params.cc }),
    ...(params.replyTo && { replyTo: params.replyTo }),
    subject: params.subject,
    html,
    text: officeInvoiceMailText(props),
    attachments: [
      {
        filename: params.pdf.filename,
        content: params.pdf.content,
        contentType: "application/pdf",
      },
    ],
  });
}
