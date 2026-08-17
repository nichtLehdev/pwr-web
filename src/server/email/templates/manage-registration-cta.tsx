import { Button, Section, Text } from "@react-email/components";

interface ManageRegistrationCtaProps {
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
 */
export function ManageRegistrationCta({
  manageUrl,
}: ManageRegistrationCtaProps) {
  if (!manageUrl) return null;

  return (
    <>
      <Section style={buttonContainer}>
        <Button style={button} href={manageUrl}>
          Anmeldung ansehen &amp; bearbeiten
        </Button>
      </Section>

      <Text style={paragraph}>
        Über diesen Link kannst du deine Anmeldung ändern oder stornieren — ganz
        ohne Benutzerkonto. Bitte gib ihn nicht weiter. Falls der Button nicht
        funktioniert, kopiere diese Adresse in deinen Browser:
      </Text>
      <Text style={linkText}>{manageUrl}</Text>
    </>
  );
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#faa619",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
  boxShadow: "0 2px 4px rgba(250, 166, 25, 0.3)",
};

const paragraph = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#58595b",
  marginBottom: "8px",
};

const linkText = {
  fontSize: "12px",
  lineHeight: "20px",
  color: "#faa619",
  wordBreak: "break-all" as const,
  marginBottom: "16px",
};
