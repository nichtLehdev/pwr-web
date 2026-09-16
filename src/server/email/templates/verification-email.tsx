import { Button, Hr, Section, Text } from "@react-email/components";
import {
  EmailLayout,
  abschnittskopf,
  ersatzLink,
  grundtext,
  haarlinie,
  kleintext,
  knopf,
} from "./email-layout";
import { emailText, textLink } from "./email-text";

interface VerificationEmailProps {
  verificationUrl: string;
  userName?: string;
}

export function VerificationEmail({
  verificationUrl,
  userName,
}: VerificationEmailProps) {
  return (
    <EmailLayout preview="E-Mail-Adresse bestätigen">
      <Text style={abschnittskopf}>E-Mail-Adresse bestätigen</Text>

      <Text style={grundtext}>
        {userName ? `Hallo ${userName},` : "Hallo,"}
      </Text>

      <Text style={grundtext}>
        vielen Dank für deine Registrierung beim Posaunenwerk Rheinland! Um dein
        Konto zu aktivieren, bitte bestätige deine E-Mail-Adresse, indem du auf
        den folgenden Button klickst:
      </Text>

      <Section style={knopfFeld}>
        <Button style={knopf} href={verificationUrl}>
          E-Mail-Adresse bestätigen
        </Button>
      </Section>

      <Text style={grundtext}>
        Falls der Button nicht funktioniert, kopiere diesen Link in deinen
        Browser:
      </Text>
      <Text style={ersatzLink}>{verificationUrl}</Text>

      <Hr style={haarlinie} />

      <Text style={kleintext}>
        Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.
      </Text>

      <Text style={kleintext}>Dieser Link ist 24 Stunden gültig.</Text>
    </EmailLayout>
  );
}

/** Nur-Text-Fassung — gleicher Wortlaut, ohne Auszeichnung. */
export function verificationEmailText({
  verificationUrl,
  userName,
}: VerificationEmailProps): string {
  return emailText([
    "E-MAIL-ADRESSE BESTÄTIGEN",
    "",
    userName ? `Hallo ${userName},` : "Hallo,",
    "",
    "vielen Dank für deine Registrierung beim Posaunenwerk Rheinland! Um dein Konto zu aktivieren, bestätige bitte deine E-Mail-Adresse über die folgende Adresse:",
    "",
    textLink("E-Mail-Adresse bestätigen:", verificationUrl),
    "",
    "Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.",
    "",
    "Dieser Link ist 24 Stunden gültig.",
  ]);
}

const knopfFeld = {
  textAlign: "center" as const,
  margin: "28px 0",
};
