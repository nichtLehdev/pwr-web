import { Button, Section, Text } from "@react-email/components";
import { ersatzLink, grundtext, knopf } from "./email-layout";
import { textLink } from "./email-text";

export interface ManageRegistrationCtaProps {
  /**
   * Magic link to the registration. Signed and expiring, it stands in for a
   * login so people who registered without an account can still change or
   * cancel their anmeldung.
   */
  manageUrl?: string;
}

/**
 * Shared call-to-action block for the mails a registrant receives about their
 * own anmeldung. Renders nothing when no link was supplied — e-mail sending is
 * best-effort and must never depend on it.
 *
 * Baustein ohne eigene Hülle: läuft innerhalb der EmailLayout der
 * übergeordneten Vorlage mit.
 */
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

/**
 * Nur-Text-Fassung — Zeilen zum Einbinden in die Mail der übergeordneten
 * Vorlage. Ohne Button entfällt der Hinweis auf den Button; der Link steht
 * direkt da.
 */
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
