import { Text } from "@react-email/components";
import { EmailLayout, Regel, grundtext, kleintext } from "./email-layout";
import { emailText } from "./email-text";

interface OfficeInvoiceMailProps {
  /** Platzhalter bereits ersetzt; Absätze durch Leerzeilen getrennt. */
  body: string;
  attachmentName: string;
}

function absaetze(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((absatz) => absatz.trim())
    .filter(Boolean);
}

/** Begleitmail zu einer Beitragsrechnung der Geschäftsstelle (Versicherung, Mitgliedsbeitrag); die Rechnung hängt als PDF an. */
export function OfficeInvoiceMail({
  body,
  attachmentName,
}: OfficeInvoiceMailProps) {
  return (
    <EmailLayout preview={absaetze(body)[1] ?? absaetze(body)[0]}>
      {absaetze(body).map((absatz, i) => (
        // Einfache Zeilenumbrüche (Grußformel) bleiben erhalten.
        <Text key={i} style={{ ...grundtext, whiteSpace: "pre-line" }}>
          {absatz}
        </Text>
      ))}
      <Regel />
      <Text style={kleintext}>Anhang: {attachmentName}</Text>
    </EmailLayout>
  );
}

export function officeInvoiceMailText({
  body,
  attachmentName,
}: OfficeInvoiceMailProps): string {
  return emailText([body.trim(), "", `Anhang: ${attachmentName}`]);
}
