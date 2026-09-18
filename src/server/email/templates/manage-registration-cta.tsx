import { Button, Section, Text } from "@react-email/components";
import { ersatzLink, grundtext, knopf } from "./email-layout";
import { textLink } from "./email-text";

export interface ManageRegistrationCtaProps {
  /** Signed, expiring magic link; stands in for a login for registrants without an account. */
  manageUrl?: string;
}

/** Renders nothing without a link: sending is best-effort and must never depend on it. */
export function ManageRegistrationCta({
  manageUrl,
}: ManageRegistrationCtaProps) {
  if (!manageUrl) return null;

  return (
    <>
      <Section style={knopfFeld}>
        <Button style={knopf} href={manageUrl}>
          Anmeldung ansehen &amp; bearbeiten
        </Button>
      </Section>

      <Text style={grundtext}>
        Über diesen Link kannst du deine Anmeldung ändern oder stornieren — ganz
        ohne Benutzerkonto. Bitte gib ihn nicht weiter. Falls der Button nicht
        funktioniert, kopiere diese Adresse in deinen Browser:
      </Text>
      <Text style={ersatzLink}>{manageUrl}</Text>
    </>
  );
}

const knopfFeld = {
  textAlign: "center" as const,
  margin: "28px 0",
};

/** Nur-Text-Zeilen zum Einbinden in die übergeordnete Vorlage. */
export function manageRegistrationCtaText({
  manageUrl,
}: ManageRegistrationCtaProps): string[] {
  if (!manageUrl) return [];

  return [
    "",
    textLink("Anmeldung ansehen & bearbeiten:", manageUrl),
    "",
    "Über diesen Link kannst du deine Anmeldung ändern oder stornieren — ganz ohne Benutzerkonto. Bitte gib ihn nicht weiter.",
  ];
}
