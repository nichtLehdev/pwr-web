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

interface PasswordResetEmailProps {
  resetUrl: string;
  userName?: string;
}

export function PasswordResetEmail({
  resetUrl,
  userName,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Passwort zurücksetzen">
      <Text style={abschnittskopf}>Passwort zurücksetzen</Text>

      <Text style={grundtext}>
        {userName ? `Hallo ${userName},` : "Hallo,"}
      </Text>

      <Text style={grundtext}>
        du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. Klicke
        auf den folgenden Button, um ein neues Passwort festzulegen:
      </Text>

      <Section style={knopfFeld}>
        <Button style={knopf} href={resetUrl}>
          Passwort zurücksetzen
        </Button>
      </Section>

      <Text style={grundtext}>
        Falls der Button nicht funktioniert, kopiere diesen Link in deinen
        Browser:
      </Text>
      <Text style={ersatzLink}>{resetUrl}</Text>

      <Hr style={haarlinie} />

      <Text style={kleintext}>
        Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail
        ignorieren. Dein Passwort bleibt unverändert.
      </Text>

      <Text style={kleintext}>Dieser Link ist 1 Stunde gültig.</Text>
    </EmailLayout>
  );
}

/** Nur-Text-Fassung — gleicher Wortlaut, ohne Auszeichnung. */
export function passwordResetText({
  resetUrl,
  userName,
}: PasswordResetEmailProps): string {
  return emailText([
    "PASSWORT ZURÜCKSETZEN",
    "",
    userName ? `Hallo ${userName},` : "Hallo,",
    "",
    "du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. Öffne die folgende Adresse, um ein neues Passwort festzulegen:",
    "",
    textLink("Passwort zurücksetzen:", resetUrl),
    "",
    "Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren. Dein Passwort bleibt unverändert.",
    "",
    "Dieser Link ist 1 Stunde gültig.",
  ]);
}

const knopfFeld = {
  textAlign: "center" as const,
  margin: "28px 0",
};
