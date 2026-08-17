import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Button,
} from "@react-email/components";

export interface RegistrationAccessLinkEntry {
  courseTitle: string;
  startDate: Date;
  endDate: Date;
  statusLabel: string;
  participantsCount: number;
  manageUrl: string;
}

interface RegistrationAccessLinksProps {
  registrantFirstName: string;
  registrations: RegistrationAccessLinkEntry[];
}

/**
 * Answer to "I registered without an account and lost the link". One mail with
 * a fresh magic link per anmeldung that is still open for changes.
 */
export function RegistrationAccessLinks({
  registrantFirstName,
  registrations,
}: RegistrationAccessLinksProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  return (
    <Html lang="de">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>Posaunenwerk Rheinland</Text>
            <Text style={tagline}>
              Evangelisches Posaunenwerk in der Evangelischen Kirche im
              Rheinland
            </Text>
          </Section>

          <Section style={content}>
            <Text style={heading}>Deine Anmeldungen</Text>

            <Text style={paragraph}>Hallo {registrantFirstName},</Text>

            <Text style={paragraph}>
              du hast einen Zugangslink zu deinen Anmeldungen angefordert. Über
              die folgenden Links kannst du deine Anmeldungen ansehen, ändern
              oder stornieren — ganz ohne Benutzerkonto.
            </Text>

            {registrations.map((registration) => (
              <Section key={registration.manageUrl} style={courseInfo}>
                <Text style={courseTitleStyle}>{registration.courseTitle}</Text>
                <Text style={courseDetail}>
                  <strong>Zeitraum:</strong>{" "}
                  {formatDate(registration.startDate)} –{" "}
                  {formatDate(registration.endDate)}
                </Text>
                <Text style={courseDetail}>
                  <strong>Status:</strong> {registration.statusLabel}
                </Text>
                <Text style={courseDetail}>
                  <strong>Teilnehmer:</strong> {registration.participantsCount}{" "}
                  {registration.participantsCount === 1 ? "Person" : "Personen"}
                </Text>
                <Section style={buttonContainer}>
                  <Button style={button} href={registration.manageUrl}>
                    Anmeldung öffnen
                  </Button>
                </Section>
                <Text style={linkText}>{registration.manageUrl}</Text>
              </Section>
            ))}

            <Hr style={hr} />

            <Text style={paragraph}>
              Die Links sind persönlich — bitte gib sie nicht weiter. Falls du
              diese E-Mail nicht angefordert hast, kannst du sie einfach
              ignorieren.
            </Text>
          </Section>

          <Section style={footerSection}>
            <Text style={footerText}>
              Evangelisches Posaunenwerk in der Evangelischen Kirche im
              Rheinland
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f5f5f5",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "0",
  marginBottom: "64px",
  maxWidth: "600px",
  borderRadius: "8px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
};

const header = {
  backgroundColor: "#faa619",
  padding: "32px 24px",
  textAlign: "center" as const,
  borderRadius: "8px 8px 0 0",
};

const logoText = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0 0 8px 0",
  letterSpacing: "0.5px",
};

const tagline = {
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "normal",
  margin: "0",
  opacity: 0.95,
  letterSpacing: "0.3px",
};

const content = {
  padding: "32px 24px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#58595b",
  marginBottom: "24px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#58595b",
  marginBottom: "16px",
};

const courseInfo = {
  backgroundColor: "#f9fafb",
  padding: "20px",
  borderRadius: "8px",
  margin: "24px 0",
  border: "1px solid #e5e7eb",
};

const courseTitleStyle = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#58595b",
  marginBottom: "16px",
};

const courseDetail = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#58595b",
  marginBottom: "8px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0 12px 0",
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

const linkText = {
  fontSize: "12px",
  lineHeight: "20px",
  color: "#faa619",
  wordBreak: "break-all" as const,
  margin: "0",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footerSection = {
  padding: "24px",
  backgroundColor: "#f9fafb",
  textAlign: "center" as const,
  borderRadius: "0 0 8px 8px",
};

const footerText = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: "0",
};
