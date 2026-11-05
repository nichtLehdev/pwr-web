import { Text } from "@react-email/components";
import { EmailLayout, Regel, grundtext, kleintext } from "./email-layout";
import { emailText } from "./email-text";

interface InsuranceInvoiceMailProps {
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

/** Begleitmail zur Versicherungsbeitragsrechnung; die Rechnung hängt als PDF an. */
export function InsuranceInvoiceMail({
  body,
  attachmentName,
}: InsuranceInvoiceMailProps) {
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

export function insuranceInvoiceMailText({
  body,
  attachmentName,
}: InsuranceInvoiceMailProps): string {
  return emailText([body.trim(), "", `Anhang: ${attachmentName}`]);
}
