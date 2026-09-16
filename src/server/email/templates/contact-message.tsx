import { Hr, Section, Text } from "@react-email/components";
import {
  EmailLayout,
  abschnittskopf,
  grundtext,
  haarlinie,
  kleintext,
  tintenstrich,
} from "./email-layout";
import { emailText, textZeile } from "./email-text";

interface ContactMessageProps {
  name: string;
  email: string;
  phone?: string;
  subjectLabel: string;
  message: string;
}

/** Internal notification for messages from the public contact form. */
export function ContactMessage({
  name,
  email,
  phone,
  subjectLabel,
  message,
}: ContactMessageProps) {
  return (
    <EmailLayout preview={`Kontaktformular: ${subjectLabel}`}>
      <Text style={kleintext}>Neue Nachricht über das Kontaktformular</Text>
      <Text style={abschnittskopf}>{subjectLabel}</Text>

      <Hr style={tintenstrich} />
      <Section style={angabenFeld}>
        <Text style={angabe}>
          <strong>Name:</strong> {name}
        </Text>
        <Text style={angabe}>
          <strong>E-Mail:</strong> {email}
        </Text>
        {phone && (
          <Text style={angabe}>
            <strong>Telefon:</strong> {phone}
          </Text>
        )}
      </Section>

      <Text style={nachrichtText}>{message}</Text>

      <Hr style={haarlinie} />

      <Text style={kleintext}>
        Antworten auf diese E-Mail gehen direkt an {name} ({email}).
      </Text>
    </EmailLayout>
  );
}

/** Nur-Text-Fassung — gleicher Wortlaut, ohne Auszeichnung. */
export function contactMessageText({
  name,
  email,
  phone,
  subjectLabel,
  message,
}: ContactMessageProps): string {
  return emailText([
    "Neue Nachricht über das Kontaktformular",
    "",
    subjectLabel,
    "",
    textZeile("Name", name),
    textZeile("E-Mail", email),
    phone ? textZeile("Telefon", phone) : null,
    "",
    message,
    "",
    `Antworten auf diese E-Mail gehen direkt an ${name} (${email}).`,
  ]);
}

const angabenFeld = {
  padding: "16px 0 0 0",
};

const angabe = {
  ...grundtext,
  fontSize: "15px",
  margin: "0 0 6px 0",
};

const nachrichtText = {
  ...grundtext,
  whiteSpace: "pre-wrap" as const,
};
